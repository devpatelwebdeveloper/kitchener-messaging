const { exec } = require("child_process");
const { google } = require("googleapis");

//AUTHentication
const auth = new google.auth.GoogleAuth({
	keyFile: "./google.json", // Path to your service account key file.
	scopes: ["https://www.googleapis.com/auth/spreadsheets"], // Scope for Google Sheets API.
});
const spreadsheetId = "1HOJWpBDCLSpiUeklifzmOQ3ySiVa9P0B_7rRr_l9ci0";
const sheets = google.sheets({ version: "v4", auth });
//AUTHentication

function escapeAppleScriptString(str) {
	return str
		.replace(/\\/g, "\\\\") // Escape backslashes
		.replace(/"/g, '\\"') // Escape double quotes
		.replace(/\n/g, "\\n") // Escape newlines
		.replace(/\r/g, "\\r"); // Escape carriage returns
}

function sendMessage(phoneNumber, name, messageText) {
	const escapedMessage = escapeAppleScriptString(messageText);

	// Construct the AppleScript command
	const script = `
			tell application "Messages"
					set targetService to 1st service whose service type = SMS
					set targetBuddy to buddy "${phoneNumber}" of targetService
					send "Das Na Das Na Jay Swaminarayan ${name} \n\n ${escapedMessage}" to targetBuddy
			end tell
	`;

	// Use single quotes to wrap the AppleScript code and escape single quotes
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

async function sendBulkMessage(listType) {
	const response = await sheets.spreadsheets.values.get({
		spreadsheetId,
		range: `Message!${listType.message}`,
	});
	const messageContent = response.data.values[0][0];

	const res = await sheets.spreadsheets.values.get({
		spreadsheetId,
		range: `${listType.contactList}!A2:E`,
	});

	const contactList = res.data.values;

	if (contactList.length) {
		contactList.forEach((contact) => {
			const phoneNumber = contact[0];
			const name = contact[1];
			sendMessage(phoneNumber, name, messageContent);
		});
	} else {
		console.log("No data found.");
	}
}

const list = {
	fullKitchenerYuvakoList: {
		contactList: "FullKitchenerList",
		message: "B1",
	},
	ambrish: {
		contactList: "AmbrishBhaktoList",
		message: "B2",
	},
};

sendBulkMessage(list.ambrish);
