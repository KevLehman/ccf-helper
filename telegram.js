const TelegramBot = require('node-telegram-bot-api');
const { db: getDb } = require('./db');

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });

bot.on('message', async (msg) => {
	const chatId = msg.chat.id;
	const db = await getDb();

	// Check if message is the command /start 
	if (msg.text === '/start') {
	  await db.run('INSERT INTO telegram (chatId, username) VALUES (?, ?)', chatId, msg.chat.username);
		bot.sendMessage(chatId, 'Welcome to the bot! You will receive updates from the CCF bot here.');
	}

	if (msg.text.startsWith('/ccf')) {
		const dates = msg.text.split(' ')[1];
		if (!dates) {
			bot.sendMessage(chatId, 'Invalid date format. Please use the format /ccf YYYY-MM-DDXYYYY-MM-DD');
			return;
		}
		// Format is YYYY-MM-DDXYYYY-MM-DD
		const [startDate, endDate] = dates.split('X');
		if (!startDate || !endDate) {
			bot.sendMessage(chatId, 'Invalid date format. Please use the format /ccf YYYY-MM-DDXYYYY-MM-DD');
			return;
		}

		const row = await db.get('SELECT * FROM telegram WHERE chatId = ?', chatId);
		if (!row) {
			bot.sendMessage(chatId, 'You are not authorized to use this bot :(');
		}

		// Check if the dates are valid
		if (new Date(startDate) > new Date(endDate)) {
			bot.sendMessage(chatId, 'Invalid date format. Please ensure start date happens before end date. Comparison doesnt take hours into consideration for now :(');
			return;
		}
	
		// get all attachments between the dates
		const attachments = await db.all('SELECT * FROM attachment WHERE dateReceived BETWEEN ? AND ? AND contentType = ? AND processed = ?', new Date(startDate), new Date(endDate), 'application/pdf', false);
		if (attachments.length === 0) {
			bot.sendMessage(chatId, 'No attachments found for the given dates.');
		}

		// Send attachments to the user
		//
		for (const attachment of attachments) {
			bot.sendDocument(chatId, Buffer.from(attachment.content), {
				filename: attachment.checksum,
				caption: `Attachment received on ${attachment.dateReceived}`,
			});
		}

		// Mark attachments as processed
		await db.run('UPDATE attachment SET processed = true WHERE dateReceived BETWEEN ? AND ? AND contentType = ?', new Date(startDate), new Date(endDate), 'application/pdf');
	}
});

module.exports = bot;
