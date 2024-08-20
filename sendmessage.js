const { exec } = require("child_process");
const { google } = require("googleapis");

//AUTHentication
const auth = new google.auth.GoogleAuth({
	keyFile: "./google.json", // Path to your service account key file.
	scopes: ["https://www.googleapis.com/auth/spreadsheets"], // Scope for Google Sheets API.
});
// const spreadsheetId = "1HOJWpBDCLSpiUeklifzmOQ3ySiVa9P0B_7rRr_l9ci0"; Devashish Test Sheet
const spreadsheetId = "1K10lmYSNGEfnDfj13N858umGQ6wpnVkaDQiIJ59XdzA";
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
					send "Das Na Das Na Jay Swaminarayan ${
						name === "no_name" ? "Bhagat" : `${name} Bhai`
					} \n\n ${escapedMessage}" to targetBuddy
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

async function sendBulkMessage(contactList, listType) {
	const response = await sheets.spreadsheets.values.get({
		spreadsheetId,
		range: `Message!${contactList.message}`,
	});
	const messageContent = response.data.values;

	console.log(messageContent);

	const res = await sheets.spreadsheets.values.get({
		spreadsheetId,
		range: `${contactList.contactList}!${contactList.scansheet}`,
	});

	const contactListFromExcel = res.data.values;

	if (contactListFromExcel.length) {
		contactListFromExcel.forEach((contact) => {
			const phoneNumber = contact[5];
			const name = contact[0];
			// console.log(`listType`, contactList[listType]);
			// console.log(
			// 	`Get`,
			// 	contactList[contactList[listType] ? listType : "default"]
			// );
			let message = messageContent[1][0];

			switch (listType) {
				case "ambrish": //Ambrisho
					if (contact[3] !== "" && contact[3] === "Ambrish_Test") {
						console.log(`${name} Bhai`);
						console.log(message);
						// sendMessage(phoneNumber, name, message);
					}
					break;
				case "gharMandir": //GharMandir
					if (contact[4] !== "") {
						// console.log(`${name} Bhai`);
						// console.log(message);
						// sendMessage(phoneNumber, name, message);
					}
					break;
				default: // FullList
					console.log(`${name} Bhai`);
					// console.log(`${name} Bhai`);
					// console.log(message);
					// sendMessage(phoneNumber, name, message);
					break;
			}

			// sendMessage(phoneNumber, name, message);
		});
	} else {
		console.log("No data found.");
	}
}

const list = {
	fullKitchenerYuvakoList: {
		contactList: "FullKitchenerList",
		scansheet: "D3:I", //Test: A2:E
		message: "B1:B3",
		default: 0,
		ambrish: 1,
		gharMandir: 2,
		testList: 3,
	},
};

sendBulkMessage(list.fullKitchenerYuvakoList, "ambrish");

/* Test in future
const script = `
tell application "Messages"
	set targetService to first service whose service type = iMessage
	if available of targetService then
			set targetBuddy to buddy "{phoneNumber}" of targetService
	else
			set targetService to first service whose service type = SMS
			set targetBuddy to buddy "{phoneNumber}" of targetService
	end if
	send "Das Na Das Na Jay Swaminarayan {name}\n\n{escapedMessage}" to targetBuddy
end tell
`;
*/
