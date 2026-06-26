require("dotenv").config();
const { Client, LocalAuth, MessageMedia } = require("whatsapp-web.js");
const { DefaultOptions } = require("whatsapp-web.js/src/util/Constants");
const WA_WEB_VERSION = DefaultOptions.webVersion;
const sendBulkMessage = require("./getContactListsAndMessage.js");
const {
	escapeAppleScriptString,
	messageTextStartGreeting,
} = require("./utils.js");
const qrcode = require("qrcode-terminal");
const fs = require("fs");
const configArg = process.argv[2];
const dataFile = configArg ? `./data-${configArg}.json` : "./data.json";
const logFile = configArg ? `./logs/run-${configArg}.log` : "./logs/run.log";
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

const readline = require("readline");

function waitForEnter(prompt) {
	return new Promise((resolve) => {
		const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
		rl.question(prompt, () => {
			rl.close();
			resolve();
		});
	});
}

process.on("SIGINT", () => {
	log("Interrupted — progress saved. Run again to resume.");
	process.exit(0);
});

const data = require(dataFile);
const flyerPath = `./flyers/${data.flyerPath}`;
const routePath = `./flyers/${data.routePath}`;

// Create a new client instance
const client = new Client({
	authStrategy: new LocalAuth({
		clientId: "client1",
		dataPath: "./sessions",
	}),
	puppeteer: {
		executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
		args: ["--no-sandbox", "--disable-setuid-sandbox"],
	},
	webVersionCache: {
		type: "remote",
		remotePath: `https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/${WA_WEB_VERSION}.html`,
	},
});

/**
 *
 * @param {string} listType - The type of list to be checked
 */
/* ************************ */
const listType = "ambrish";
/* ************************ */
client.on("qr", (qr) => {
	// Generate and display the QR code to scan with WhatsApp
	qrcode.generate(qr, { small: true });
});

let sessionActive = false;
client.on("ready", async () => {
	if (sessionActive) {
		log("Reconnected — session already running, skipping re-send.");
		return;
	}
	sessionActive = true;
	log("Client is ready!");

	try {
		let contactList, message;
		if (data.testMode) {
			const msgResponse = await require("./config").sheets.spreadsheets.values.get({
				spreadsheetId: data.spreadsheetId,
				range: `Message!${data.contactListConfig.message}`,
			});
			const msgIndex = data.contactListConfig.default;
			message = msgResponse.data.values[msgIndex][0];
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
			log(`Removed ${contactList.length - uniqueContacts.length} duplicate(s) from contact list`);
		}

		// Load already-sent contacts from a previous run
		const progress = loadProgress();
		const alreadySent = Object.values(progress).filter((s) => s === "✅").length;
		const remaining = uniqueContacts.filter(({ phoneNumber }) => !progress[phoneNumber]);
		if (alreadySent > 0) {
			log(`Resuming — ${alreadySent} already sent, ${remaining.length} remaining`);
		}

		const chunkSize = data.chunkSize ?? 20;
		const maxSend = data.maxSend ?? Infinity;
		const total = uniqueContacts.length;
		let completed = alreadySent;
		let failed = 0;

		for (let i = 0; i < remaining.length; i++) {
			if (completed - alreadySent >= maxSend) {
				log(`Reached maxSend limit of ${maxSend}. Stopping. Run again to continue.`);
				break;
			}
			const { phoneNumber, name, address } = remaining[i];

			if (!phoneNumber || phoneNumber === "NA") {
				log(`Skipping ${name} — no phone number`);
				continue;
			}

			const isOnWhatsApp = await client.isRegisteredUser(phoneNumber).catch(() => false);
			if (!isOnWhatsApp) {
				log(`Skipping ${name} @ ${phoneNumber} — not on WhatsApp`);
				failed++;
				continue;
			}

			const directionsLink = data.eventAddress
				? `\n\n📍 Directions: https://www.google.com/maps/dir/?api=1${
						data.useCurrentLocation || !address
							? ""
							: `&origin=${encodeURIComponent(address)}`
					}&destination=${encodeURIComponent(data.eventAddress)}`
				: "";
			const fullMessage = `${messageTextStartGreeting(name)} ${message}${directionsLink}`;

			try {
				if (data.flyerPath) {
					await client.sendMessage(phoneNumber, MessageMedia.fromFilePath(flyerPath), { caption: fullMessage });
					if (data.flyerType === "sabha" && data.routePath) {
						await client.sendMessage(phoneNumber, MessageMedia.fromFilePath(routePath));
					}
				}
				if (data.pdfPath) {
					await client.sendMessage(phoneNumber, MessageMedia.fromFilePath(`./flyers/${data.pdfPath}`), { caption: fullMessage });
				} else if (!data.flyerPath) {
					await sendMessage(phoneNumber, fullMessage, name);
				}

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

			// After every chunkSize sends, disconnect and ask to re-authenticate
			if (completed % chunkSize === 0 && i < remaining.length - 1) {
				log(`\n--- Chunk of ${chunkSize} sent. Disconnecting for re-authentication... ---`);
				await client.logout();
				client.destroy();
				await waitForEnter(`\nPress Enter when you are ready to scan the QR code to continue...`);
				log("Re-initializing client...");
				sessionActive = false;
				client.initialize();
				return;
			}

			// Random delay between sends
			const minDelay = data.minDelay ?? 15000;
			const maxDelay = data.maxDelay ?? 45000;
			const delay = Math.floor(Math.random() * (maxDelay - minDelay + 1)) + minDelay;
			log(`Waiting ${(delay / 1000).toFixed(1)}s before next message...`);
			await new Promise((resolve) => setTimeout(resolve, delay));
		}

		log(`Done. Sent: ${completed}/${total} | Failed: ${failed}`);
		saveProgress(progress);
		await client.logout();
		client.destroy();
	} catch (error) {
		console.error("Error in sending bulk messages:", error);
	}
});

client.on("authenticated", () => {
	console.log("Client is authenticated");
});

client.on("auth_failure", (msg) => {
	log(`Authentication cancelled or failed — progress saved. Run again to resume. (${msg})`);
	process.exit(0);
});

client.on("disconnected", () => {
	console.log("Client disconnected");
});

async function sendMessage(to, message) {
	if (!client.info) {
		throw new Error("Client is not ready yet.");
	}
	const chat = await client.getChatById(to);
	if (!chat) {
		throw new Error(`Chat not found for ${to} — check phone number format`);
	}
	await chat.sendMessage(message);
}

// Start the client
client.initialize();
