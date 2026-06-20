// config.js

const { google } = require("googleapis");
const auth = new google.auth.GoogleAuth({
	keyFile: "./google.json", // Path to your service account key file.
	scopes: ["https://www.googleapis.com/auth/spreadsheets"], // Scope for Google Sheets API.
});

// Initialize the Google Sheets API client
const sheets = google.sheets({ version: "v4", auth });

module.exports = { sheets };
