// config.js

const { google } = require("googleapis");
const auth = new google.auth.GoogleAuth({
	keyFile: "./google.json", // Path to your service account key file.
	scopes: ["https://www.googleapis.com/auth/spreadsheets"], // Scope for Google Sheets API.
});

// Initialize the Google Sheets API client
const sheets = google.sheets({ version: "v4", auth });

// const spreadsheetId = "1HOJWpBDCLSpiUeklifzmOQ3ySiVa9P0B_7rRr_l9ci0"; Devashish Test Sheet
const spreadsheetId = "1K10lmYSNGEfnDfj13N858umGQ6wpnVkaDQiIJ59XdzA";

module.exports = { sheets, spreadsheetId };
