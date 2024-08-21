require("dotenv").config();
const { Client, LocalAuth } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");

// Create a new client instance
const client = new Client({
	authStrategy: new LocalAuth({
		clientId: "client1",
		dataPath: "./sessions",
	}),
});

client.on("qr", (qr) => {
	// Generate and display the QR code to scan with WhatsApp
	qrcode.generate(qr, { small: true });
});

client.on("ready", () => {
	console.log("Client is ready!");
	const recipientNumber = `12268993491@c.us`;
	// const recipientNumber = process.env.RECIPIENT_NUMBER;
	const messageContent = "Hello from Automated message";
	sendMessage(recipientNumber, messageContent);
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
