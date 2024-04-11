require('dotenv').config();

const { ImapFlow } = require('imapflow');

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
BigInt.prototype.toJSON = function() {
	return this.toString();
};

const main = async () => {
	await client.connect();
	const lock = await client.getMailboxLock('INBOX');

	try {
		for await (const mes of client.fetch({ sentSince: '2024-04-01T00:00:00Z'}, { uid: true, bodyStructure: true, envelope: true, threadId: true, bodyParts: true })) {
			const mesWithAttachments = mes.bodyStructure?.childNodes?.find(node => node.type === 'application/octet-stream' || node.disposition === 'attachment');
			if (mesWithAttachments) {
				const attachments = mes.bodyStructure?.childNodes?.filter(node => node.type === 'application/octet-stream' || node.disposition === 'attachment');
				// check if attachments are a json and a pdf file 
				const jsonAttachment = attachments.find(node => node.parameters.name.toLowerCase().endsWith('.json'));
				const pdfAttachment = attachments.find(node => node.parameters.name.toLowerCase().endsWith('.pdf'));

				if (jsonAttachment && pdfAttachment) {
					console.log(mes);
				}
			}
		}
	} catch (err) {
		console.error(err);
	} finally {
		lock.release();
		await client.logout();
	}
}

main().catch(console.error);
