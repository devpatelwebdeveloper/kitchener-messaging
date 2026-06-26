require("dotenv").config();
const fs = require("fs");
const twilio = require("twilio");
const sendBulkMessage = require("./getContactListsAndMessage.js");
const { messageTextStartGreeting, convertToWhatsAppFormat } = require("./utils.js");

const configArg = process.argv[2];
const dataFile = configArg ? `./data-${configArg}.json` : "./data.json";
const logFile = configArg ? `./logs/run-twilio-${configArg}.log` : "./logs/run-twilio.log";
const progressFile = configArg ? `./logs/progress-${configArg}.json` : "./logs/progress.json";
fs.mkdirSync("./logs", { recursive: true });
const logStream = fs.createWriteStream(logFile, { flags: "a" });

function log(msg) {
	const line = `[${new Date().toLocaleTimeString()}] ${msg}`;
	console.log(line);
	logStream.write(line + "\n");
}

function loadProgress() {
	try {
		return JSON.parse(fs.readFileSync(progressFile, "utf8"));
	} catch {
		return {};
	}
}

function saveProgress(progressMap) {
	fs.writeFileSync(progressFile, JSON.stringify(progressMap, null, 2));
}

process.on("SIGINT", () => {
	log("Interrupted — progress saved. Run again to resume.");
	process.exit(0);
});

const run = async () => {
	const data = require(dataFile);

	const accountSid = process.env.TWILIO_ACCOUNT_SID;
	const authToken = process.env.TWILIO_AUTH_TOKEN;
	const fromNumber = process.env.TWILIO_WHATSAPP_NUMBER;

	if (!accountSid || !authToken || !fromNumber) {
		console.error("Missing TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN or TWILIO_WHATSAPP_NUMBER in .env");
		process.exit(1);
	}

	const client = twilio(accountSid, authToken);

	let contactList, message;
	if (data.testMode) {
		const msgResponse = await require("./config").sheets.spreadsheets.values.get({
			spreadsheetId: data.spreadsheetId,
			range: `Message!${data.contactListConfig.message}`,
		});
		message = msgResponse.data.values[data.contactListConfig.default][0];
		const { convertToWhatsAppFormat } = require("./utils");
		contactList = data.testContacts.map((c) => ({
			...c,
			phoneNumber: convertToWhatsAppFormat(c.phoneNumber),
		})).filter((c) => c.phoneNumber);
		log(`TEST MODE — sending to ${contactList.length} test contact(s) only`);
	} else {
		({ contactList, message } = await sendBulkMessage(
			data.contactListConfig,
			data.listType,
			"whatsapp",
			data.spreadsheetId
		));
	}

	if (!contactList.length) {
		log("No contacts found.");
		return;
	}

	// Deduplicate by phone number
	const seen = new Set();
	const uniqueContacts = contactList.filter(({ phoneNumber }) => {
		if (seen.has(phoneNumber)) return false;
		seen.add(phoneNumber);
		return true;
	});
	if (uniqueContacts.length < contactList.length) {
		log(`Removed ${contactList.length - uniqueContacts.length} duplicate(s)`);
	}

	const progress = loadProgress();
	const alreadySent = Object.values(progress).filter((s) => s === "✅").length;
	const remaining = uniqueContacts.filter(({ phoneNumber }) => !progress[phoneNumber]);
	if (alreadySent > 0) {
		log(`Resuming — ${alreadySent} already sent, ${remaining.length} remaining`);
	}

	const chunkSize = data.chunkSize ?? 20;
	const total = uniqueContacts.length;
	let completed = alreadySent;
	let failed = 0;

	for (let i = 0; i < remaining.length; i++) {
		const { phoneNumber, name } = remaining[i];
		const fullMessage = `${messageTextStartGreeting(name)} ${message}`;

		try {
			await client.messages.create({
				from: `whatsapp:+${fromNumber.replace(/^\+/, "")}`,
				to: `whatsapp:+${phoneNumber.replace("@c.us", "")}`,
				body: fullMessage,
			});
			completed++;
			progress[phoneNumber] = "✅";
			saveProgress(progress);
			log(`[${completed}/${total}] Sent to ${name} @ ${phoneNumber}`);
		} catch (err) {
			failed++;
			progress[phoneNumber] = "❌";
			saveProgress(progress);
			log(`[FAILED] ${name} @ ${phoneNumber} — ${err.message}`);
		}

		if (completed % chunkSize === 0 && i < remaining.length - 1) {
			await new Promise((resolve) => setTimeout(resolve, 3000));
			log(`\n--- Chunk of ${chunkSize} sent. Pausing — press Enter to continue...`);
			await new Promise((resolve) => {
				const rl = require("readline").createInterface({ input: process.stdin, output: process.stdout });
				rl.question("", () => { rl.close(); resolve(); });
			});
			log("Resuming...");
		} else {
			const minDelay = data.minDelay ?? 2000;
			const maxDelay = data.maxDelay ?? 5000;
			const delay = Math.floor(Math.random() * (maxDelay - minDelay + 1)) + minDelay;
			log(`Waiting ${(delay / 1000).toFixed(1)}s before next message...`);
			await new Promise((resolve) => setTimeout(resolve, delay));
		}
	}

	log(`Done. Sent: ${completed}/${total} | Failed: ${failed}`);
	saveProgress(progress);
};

run().catch((err) => console.error("Fatal error:", err));
