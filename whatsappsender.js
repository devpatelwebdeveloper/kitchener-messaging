require("dotenv").config();
const { Client, LocalAuth, MessageMedia } = require("whatsapp-web.js");
const sendBulkMessage = require("./getContactListsAndMessage.js");
const {
	escapeAppleScriptString,
	messageTextStartGreeting,
} = require("./utils.js");
const qrcode = require("qrcode-terminal");
const configArg = process.argv[2];
const dataFile = configArg ? `./data-${configArg}.json` : "./data.json";
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
		remotePath: "https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.3000.1015857474.html",
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

client.on("ready", async () => {
	console.log("Client is ready!");

	try {
		// Get the contact list and message from sendBulkMessage
		const { contactList, message } = await sendBulkMessage(
			data.contactListConfig,
			data.listType,
			"whatsapp",
			data.spreadsheetId
		);

		if (!contactList.length) {
			console.log("No contacts found.");
			return;
		}
		// Loop to send message to each recipient with a delay of 5 seconds
		for (const { phoneNumber, name, address } of contactList) {
			if (data.flyerPath) {
				await client.sendMessage(phoneNumber, MessageMedia.fromFilePath(flyerPath));
				if (data.flyerType === "sabha" && data.routePath) {
					await client.sendMessage(phoneNumber, MessageMedia.fromFilePath(routePath));
					console.log(`Flyer and route sent to ${name} @ ${phoneNumber}`);
				}
			}
			if (data.pdfPath) {
				const pdfMedia = MessageMedia.fromFilePath(`./flyers/${data.pdfPath}`);
				await client.sendMessage(phoneNumber, pdfMedia);
				console.log(`PDF sent to ${name} @ ${phoneNumber}`);
			}
			const directionsLink =
				address && data.eventAddress
					? `\n\n📍 Directions: https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(address)}&destination=${encodeURIComponent(data.eventAddress)}`
					: "";
			await sendMessage(
				phoneNumber,
				`${messageTextStartGreeting(name)} ${message}${directionsLink}`,
				name
			);

			// Wait for 3 seconds before sending the next message
			await new Promise((resolve) => setTimeout(resolve, data.timeinterval));
		}

		console.log(
			`All messages sent. Total message sent: ${contactList.length} Disconnecting client...`
		);
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
	console.error("Authentication failed:", msg);
});

client.on("disconnected", () => {
	console.log("Client disconnected");
});

async function sendMessage(to, message) {
	try {
		if (!client.info) {
			console.log("Client is not ready yet.");
			return;
		}

		console.log(`Sending message to ${to}`);
		const chat = await client.getChatById(to);
		if (!chat) {
			console.error("Chat not found. Check the phone number format.");
			return;
		}

		await chat.sendMessage(message);
		console.log(`Message sent to ${to}`);
	} catch (error) {
		console.error("Error sending message:", error);
	}
}

// Start the client
client.initialize();
