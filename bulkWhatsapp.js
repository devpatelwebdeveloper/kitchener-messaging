require("dotenv").config();
const { Client, LocalAuth } = require("whatsapp-web.js");
const sendBulkMessage = require("./getContactListsAndMessage.js");
const qrcode = require("qrcode-terminal");

// Create a new client instance
const client = new Client({
	authStrategy: new LocalAuth({
		clientId: "client1",
		dataPath: "./sessions",
	}),
});

const contactListConfig = {
	contactList: "FullKitchenerList",
	scansheet: "D3:I",
	message: "B1:B3",
	default: 0,
	ambrish: 1,
	gharMandir: 2,
	testList: 3,
};

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
			contactListConfig,
			listType
		);

		if (!contactList.length) {
			console.log("No contacts found.");
			return;
		}

		// Loop to send message to each recipient with a delay of 5 seconds
		for (const { phoneNumber } of contactList) {
			await sendMessage(phoneNumber, message);

			// Wait for 5 seconds before sending the next message
			await new Promise((resolve) => setTimeout(resolve, 2000));
		}

		console.log("All messages sent. Disconnecting client...");
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
		console.log(`Message sent to ${to}: ${message}`);
	} catch (error) {
		console.error("Error sending message:", error);
	}
}

// Start the client
client.initialize();
