const { exec } = require("child_process");
const sendBulkMessage = require("./getContactListsAndMessage.js");
const {
	escapeAppleScriptString,
	messageTextStartGreeting,
} = require("./utils.js");
const data = require("./data.json");

function sendTextMessage(phoneNumber, name, messageText) {
	const escapedMessage = escapeAppleScriptString(messageText);

	// Construct the AppleScript command

	const script = `
			tell application "Messages"
					set targetService to 1st service whose service type = SMS
					set targetBuddy to buddy "${phoneNumber}" of targetService
					send "${messageTextStartGreeting(name)} ${escapedMessage}" to targetBuddy
			end tell
	`;

	const escapedScript = script.replace(/'/g, "\\'");

	// Execute the AppleScript command
	exec(`osascript -e '${escapedScript}'`, (error, stdout, stderr) => {
		if (error) {
			console.error(`Error: ${error.message}`);
			return;
		}
		if (stderr) {
			console.error(`Stderr: ${stderr}`);
			return;
		}
		console.log(`Message sent to ${name} @ ${phoneNumber}`);
	});
}

const testFn = async () => {
	console.log("Client is ready!");

	try {
		// Get the contact list and message from sendBulkMessage
		const { contactList, message } = await sendBulkMessage(
			data.contactListConfig,
			data.listType,
			(messageType = "text")
		);

		if (!contactList.length) {
			console.log("No contacts found.");
			return;
		}
		// Loop to send message to each recipient with a delay of 5 seconds
		for (const { phoneNumber, name } of contactList) {
			console.log(`${name}: ${phoneNumber}`);
			sendTextMessage(phoneNumber, name, message);

			// Wait for 5 seconds before sending the next message
			await new Promise((resolve) => setTimeout(resolve, 10));
		}

		console.log("All messages sent. Disconnecting client...");
	} catch (error) {
		console.error("Error in sending bulk messages:", error);
	}
};

testFn();
