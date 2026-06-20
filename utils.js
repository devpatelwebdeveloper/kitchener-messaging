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
	if (cleanedNumber.startsWith("+")) {
		return cleanedNumber.substring(1) + "@c.us";
	}
	// 10-digit North American number — prepend country code 1
	if (cleanedNumber.length === 10) {
		return "1" + cleanedNumber + "@c.us";
	}
	throw new Error(`Cannot format phone number: ${phoneNumber}`);
}

function messageTextStartGreeting(name) {
	return `Jay Swaminarayan, Jay Shree Krishna ${name} \n\n`;
}

// function messageTextStartGreeting(name) {
// 	return `Das Na Das Na Jay Swaminarayan ${
// 		name === "no_name" ? "Bhagat" : `${name} Bhai`
// 	} \n\n`;
// }

module.exports = {
	escapeAppleScriptString,
	convertToWhatsAppFormat,
	messageTextStartGreeting,
};
