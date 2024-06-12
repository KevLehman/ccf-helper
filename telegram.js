const TelegramBot = require('node-telegram-bot-api')
const { db: getDb } = require('./db')
const { args } = require('./argsMapper')

if (args['--emailOnlyMode']) {
    console.log(
        'Email only mode enabled. No Telegram messages will be processed'
    )
    return
}

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true })

async function processStartMessage(botInstance, dbInstance, chatId, msg) {
    await dbInstance.run(
        'INSERT INTO telegram (chatId, username) VALUES (?, ?)',
        chatId,
        msg.chat.username
    )
    botInstance.sendMessage(
        chatId,
        'Welcome to the bot! You will receive updates from the CCF bot here.'
    )
}

async function processCcfMessage(botInstance, dbInstance, chatId, msg) {
    const dates = msg.text.split(' ')[1]
    if (!dates) {
        botInstance.sendMessage(
            chatId,
            'Invalid date format. Please use the format /ccf YYYY-MM-DDXYYYY-MM-DD'
        )
        return
    }
    // Format is YYYY-MM-DDXYYYY-MM-DD
    const [startDate, endDate] = dates.split('X')
    if (!startDate || !endDate) {
        botInstance.sendMessage(
            chatId,
            'Invalid date format. Please use the format /ccf YYYY-MM-DDXYYYY-MM-DD'
        )
        return
    }

    const row = await dbInstance.get(
        'SELECT * FROM telegram WHERE chatId = ?',
        chatId
    )
    if (!row) {
        botInstance.sendMessage(
            chatId,
            'You are not authorized to use this bot :('
        )
    }

    // Check if the dates are valid
    if (new Date(startDate) > new Date(endDate)) {
        botInstance.sendMessage(
            chatId,
            'Invalid date format. Please ensure start date happens before end date. Comparison doesnt take hours into consideration for now :('
        )
        return
    }

    // get all attachments between the dates
    const attachments = await dbInstance.all(
        'SELECT * FROM attachment WHERE dateReceived BETWEEN ? AND ? AND contentType = ? AND processed = ?',
        new Date(startDate),
        new Date(endDate),
        'application/pdf',
        false
    )
    if (attachments.length === 0) {
        botInstance.sendMessage(
            chatId,
            'No attachments found for the given dates.'
        )
    }

    // Send attachments to the user
    // eslint-disable-next-line no-restricted-syntax
    for (const attachment of attachments) {
        botInstance.sendDocument(chatId, Buffer.from(attachment.content), {
            filename: attachment.checksum,
            caption: `Attachment received on ${attachment.dateReceived}`,
        })
    }

    // Mark attachments as processed
    await dbInstance.run(
        'UPDATE attachment SET processed = true WHERE dateReceived BETWEEN ? AND ? AND contentType = ?',
        new Date(startDate),
        new Date(endDate),
        'application/pdf'
    )
}

bot.on('message', async (msg) => {
    const chatId = msg.chat.id
    const db = await getDb()

    // Check if message is the command /start
    if (msg.text.startsWith('/start')) {
        await processStartMessage(bot, db, chatId, msg)
        return
    }

    if (msg.text.startsWith('/ccf')) {
        await processCcfMessage(bot, db, chatId, msg)
        return
    }

    bot.sendMessage(chatId, "I don't understand :(")
})

module.exports = bot
