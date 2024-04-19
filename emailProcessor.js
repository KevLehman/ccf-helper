const { simpleParser } = require("mailparser");

async function processEmail(db, email) {
  const parsedEmail = await simpleParser(email.source);

  // Check email is not already in the database
  const dbEmail = await db.get("SELECT * FROM emails WHERE uid = ?", email.uid);
  if (dbEmail) {
    return;
  }

  const res = await db.run(
    "INSERT INTO emails (uid, threadId, envelope) VALUES (?, ?, ?)",
    email.uid,
    email.threadId,
    JSON.stringify(email.envelope),
  );

  if (!res || !res.lastID) {
    console.error("Failed to insert email into database");
    return;
  }

  if (parsedEmail.attachments) {
		// Check if the atachment array contains a JSON AND a PDF attachment
		const jsonAttachment = parsedEmail.attachments.find(
			(attachment) => attachment.contentType === "application/json",
		);
		const pdfAttachment = parsedEmail.attachments.find(
			(attachment) => attachment.contentType === "application/pdf",
		);

		if (!jsonAttachment || !pdfAttachment) {
			console.error("Email has attachments, but doesn't have both JSON and PDF");
			return;
		}
    // eslint-disable-next-line no-restricted-syntax
    for await (const attachment of parsedEmail.attachments) {
      const { content, ...att } = attachment;
      if (
        !["application/json", "application/pdf"].includes(
          attachment.contentType,
        )
      ) {
        // eslint-disable-next-line no-continue
        continue;
      }

      // Insert content as a blob into the database
      await db.run(
        "INSERT INTO attachment (checksum, emailId, content, contentType, dateReceived, processed) VALUES (?, ?, ?, ?, ?, ?)",
        att.checksum,
        res.lastID,
        content,
        att.contentType,
        email.envelope.date,
        false,
      );
    }
  }
}

module.exports = {
	processEmail,
};
