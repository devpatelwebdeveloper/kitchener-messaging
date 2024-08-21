const { google } = require("googleapis");

// Initializes the Google APIs client library and sets up the authentication using service account credentials.
const auth = new google.auth.GoogleAuth({
	keyFile: "./google.json", // Path to your service account key file.
	scopes: ["https://www.googleapis.com/auth/spreadsheets"], // Scope for Google Sheets API.
});

// Asynchronous function to write data to a Google Sheet.

// Asynchronous function to read data from a Google Sheet.
async function readSheet() {
	const sheets = google.sheets({ version: "v4", auth });
	const spreadsheetId = "1HOJWpBDCLSpiUeklifzmOQ3ySiVa9P0B_7rRr_l9ci0";
	const range = "Sheet1!A1:E10"; // Specifies the range to read.

	try {
		const response = await sheets.spreadsheets.values.get({
			spreadsheetId,
			range,
		});
		const rows = response.data.values; // Extracts the rows from the response.
		return rows; // Returns the rows.
	} catch (error) {
		console.error("error", error); // Logs errors.
	}
}

// Immediately-invoked function expression (IIFE) to execute the read and write operations.
(async () => {
	// const writer = await writeToSheet([
	// 	["Name", "Age", "Location"],
	// 	["Ado", 33, "Miami"],
	// 	["Pepe", 21, "Singapore"],
	// 	["Juan", 32, "Mexico"],
	// ]);
	// console.log(writer); // Logs the write operation's response.

	const data = await readSheet(); // Reads data from the sheet.
	console.log(data); // Logs the read data.
})();
