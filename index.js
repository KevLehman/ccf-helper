require('dotenv').config();
const { simpleParser } = require('mailparser');

const { ImapFlow } = require('imapflow');
const { db: getDb, init } = require('./db');
const { processEmail } = require('./emailProcessor');
require('./telegram');

const client = new ImapFlow({
  host: 'imap.gmail.com',
  port: 993,
  secure: true,
  auth: {
    user: process.env.IMAP_USER,
    pass: process.env.IMAP_PASSWORD,
  },
  logger: false,
});

// Monkeypatch BigInt to return string when JSON.stringify is called
BigInt.prototype.toJSON = function toJSON() {
  return this.toString();
};

const main = async () => {
  await init();
  await client.connect();
  const lock = await client.getMailboxLock('INBOX');
  const db = await getDb();

  try {
    // eslint-disable-next-line no-restricted-syntax
    for await (const mes of client.fetch({ sentSince: '2024-04-01T00:00:00Z' }, {
      source: true, uid: true, bodyStructure: true, envelope: true, threadId: true,
    })) {
      await processEmail(db, mes);
    }
  } catch (err) {
    console.error(err);
  } finally {
    lock.release();
    await client.logout();
  }
};

main().catch(console.error);
