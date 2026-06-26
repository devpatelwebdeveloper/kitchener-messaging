// messageSender.js

const { sheets } = require("./config"); // Make sure to configure and export sheets and spreadsheetId
const { convertToWhatsAppFormat, escapeAppleScriptString } = require("./utils"); // Import convertToWhatsAppFormat if it's in a separate file

/**
 * Retrieves and formats bulk messages from a Google Sheets spreadsheet.
 * @param {Object} contactList - The contact list configuration.
 * @param {string} listType - The type of list to use.
 * @returns {Promise<Object>} - An object containing the contact list and message.
 */
async function sendBulkMessage(contactList, listType, messageType = "text", spreadsheetId) {
	const [messageResponse, contactListResponse] = await Promise.all([
		sheets.spreadsheets.values.get({
			spreadsheetId,
			range: `Message!${contactList.message}`,
		}),
		sheets.spreadsheets.values.get({
			spreadsheetId,
			range: `${contactList.contactList}!${contactList.scansheet}`,
		}),
	]);

	const messageContent = messageResponse.data.values;
	const contactListFromExcel = contactListResponse.data.values;
	if (contactListFromExcel.length) {
		const phoneList = [];
		const message =
			messageContent[
				contactList[contactList[listType] ? listType : "default"]
			][0];
		contactListFromExcel.forEach((contact) => {
			const phoneNumber = contact[contactList.phoneColumn];
			const name = contact[contactList.nameColumn];

			if (
				(listType === "ambrish" && contact[3] === "Ambrish") ||
				(listType === "testList" && contact[3] === "Ambrish_Test") ||
				(listType === "gharMandir" && contact[4] !== "") ||
				listType === "default"
			) {
				if (!phoneNumber || phoneNumber === "NA") {
					console.log(`Skipping ${name} — no phone number`);
					return;
				}
				const formattedNumber = messageType === "whatsapp" ? convertToWhatsAppFormat(phoneNumber) : phoneNumber;
				if (!formattedNumber) {
					console.log(`Skipping ${name} — invalid phone number: ${phoneNumber}`);
					return;
				}
				phoneList.push({
					name,
					phoneNumber: formattedNumber,
					address: contactList.addressColumn !== undefined ? contact[contactList.addressColumn] : null,
				});
			}
		});
		return { contactList: phoneList, message };
	} else {
		return { contactList: [], message: "No data found." };
	}
}

module.exports = sendBulkMessage;
