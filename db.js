const { AsyncDatabase } = require('promised-sqlite3')

let db

const getDb = async () => {
    if (!db) {
        db = await AsyncDatabase.open('sqlite.db')
    }
    return db
}

const initDb = async () => {
    const client = await getDb()

    await client.run(
        'CREATE TABLE IF NOT EXISTS emails (uid INTEGER PRIMARY KEY, threadId TEXT, envelope TEXT)'
    )
    await client.run(
        'CREATE TABLE IF NOT EXISTS telegram (chatId INTEGER PRIMARY KEY, username TEXT)'
    )
    await client.run(
        'CREATE TABLE IF NOT EXISTS attachment (id INTEGER PRIMARY KEY AUTOINCREMENT, emailId INTEGER, checksum TEXT, content BLOB, contentType TEXT, dateReceived DATE, processed BOOLEAN DEFAULT FALSE, FOREIGN KEY(emailId) REFERENCES emails(uid))'
    )
}

module.exports = {
    init: initDb,
    db: getDb,
}
