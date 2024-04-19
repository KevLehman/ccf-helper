const arg = require('arg');

const args = arg({
	'--telegramOnlyMode': Boolean,
	'--emailOnlyMode': Boolean,
	'--listenForNewEmails': Boolean,
});

module.exports = { args };
