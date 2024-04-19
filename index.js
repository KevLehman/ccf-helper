require('dotenv').config()

const { ImapFlow } = require('imapflow')
const { db: getDb, init } = require('./db')
const { processEmail } = require('./emailProcessor')
const { args } = require('./argsMapper')

require('./telegram')

const client = new ImapFlow({
    host: 'imap.gmail.com',
    port: 993,
    secure: true,
    auth: {
        user: process.env.IMAP_USER,
        pass: process.env.IMAP_PASSWORD,
    },
    logger: false,
})

// Monkeypatch BigInt to return string when JSON.stringify is called
BigInt.prototype.toJSON = function toJSON() {
    return this.toString()
}

const main = async () => {
    await init()
    if (args['--telegramOnlyMode']) {
        console.log('Telegram mode enabled. No new emails will be processed')
        return
    }

    await client.connect()
    const lock = await client.getMailboxLock('INBOX')
    const db = await getDb()

    const fetchSince = args['--fetchSince'] || new Date()
    const fetchOldEmails = args['--fetchOldEmails']

    // Allows you to decide if you want to fetch emails newer than fetchSince. Useful to prepopulate your DB with messages from an older date
    if (fetchOldEmails) {
        console.log(`Fetching emails newer than ${fetchSince}`)
        try {
            for await (const mes of client.fetch(
                { sentSince: new Date(fetchSince).toISOString() },
                {
                    source: true,
                    uid: true,
                    bodyStructure: true,
                    envelope: true,
                    threadId: true,
                }
            )) {
                await processEmail(db, mes)
            }
        } catch (err) {
            console.error(err)
        }
    }

    // This one listens to new emails received on the INBOX
    // IMAP is a bit of a troll so there's that possibility of an email being received millis before
    // this event is registered and therefore lost. You can always start with fetchOldEmails: true to get those if you're unsure
    client.on('exists', async (data) => {
        console.log(`New email received: ${data.count}`)
        const msg = await client.fetchOne(data.count, {
            source: true,
            uid: true,
            envelope: true,
            flags: true,
            threadId: true,
            bodyStructure: true,
        })
        await processEmail(db, msg)
    })

    process.on('unhandledPromiseRejection', () => {
        lock.release()
        client.logout()
    })

    process.on('unhandledRejection', () => {
        lock.release()
        client.logout()
    })

    process.on('beforeExit', () => {
        lock.release()
        client.logout()
    })
}

main().catch(console.error)
