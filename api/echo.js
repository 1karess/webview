// Vercel Serverless Function: echo request headers/body (for research)
// Purpose: provide server-side proof that a header (e.g. tx_webkit_body_uuid) was received.

module.exports = async (req, res) => {
  try {
    // Collect raw body (works for JSON, text, Blob, etc.)
    const chunks = [];
    for await (const chunk of req) chunks.push(Buffer.from(chunk));
    const body = Buffer.concat(chunks);

    const contentType = req.headers['content-type'] || '';
    const isTextLike = /^text\/|application\/json|application\/x-www-form-urlencoded/.test(contentType);

    // Keep response small: preview only
    const bodyPreview = (() => {
      if (!body || body.length === 0) return '';
      if (isTextLike) return body.toString('utf8').slice(0, 2000);
      return body.toString('base64').slice(0, 1200); // binary preview
    })();

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(
      JSON.stringify(
        {
          ok: true,
          ts: new Date().toISOString(),
          method: req.method,
          url: req.url,
          headers: req.headers, // node lowercases header names
          body: {
            byteLength: body.length,
            contentType,
            preview: bodyPreview,
            previewEncoding: isTextLike ? 'utf8' : 'base64',
          },
        },
        null,
        2
      )
    );
  } catch (e) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ ok: false, error: String(e) }, null, 2));
  }
};

