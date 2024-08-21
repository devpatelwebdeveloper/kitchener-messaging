/**
 * Escapes special characters in a string for use in AppleScript.
 * @param {string} str - The input string to escape.
 * @returns {string} - The escaped string.
 */
function escapeAppleScriptString(str) {
	return str
		.replace(/\\/g, "\\\\") // Escape backslashes
		.replace(/"/g, '\\"') // Escape double quotes
		.replace(/\n/g, "\\n") // Escape newlines
		.replace(/\r/g, "\\r"); // Escape carriage returns
}

/**
 * Converts a phone number to WhatsApp format.
 * @param {string} phoneNumber - The phone number to convert.
 * @returns {string} - The converted phone number in WhatsApp format.
 */
function convertToWhatsAppFormat(phoneNumber) {
	const cleanedNumber = phoneNumber.replace(/[^+\d]/g, "");
	if (!cleanedNumber.startsWith("+")) {
		throw new Error("Phone number must include a country code with + sign.");
	}
	return cleanedNumber.substring(1) + "@c.us";
}

module.exports = { escapeAppleScriptString, convertToWhatsAppFormat };
