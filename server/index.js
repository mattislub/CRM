import { createServer } from 'http';
import { readFileSync, appendFile } from 'fs';
import { resolve } from 'path';

function loadEnv(path = '.env') {
  try {
    const envFile = readFileSync(resolve(process.cwd(), path), 'utf-8');
    for (const line of envFile.split('\n')) {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let value = match[2] || '';
        value = value.replace(/(^['"]|['"]$)/g, '');
        process.env[key] = value;
      }
    }
  } catch {
    // ignore missing env file
  }
}

loadEnv();

const required = ['VITE_TRANZILA_SUPPLIER_ID', 'VITE_TRANZILA_PUBLIC_KEY', 'VITE_TRANZILA_PRIVATE_KEY', 'PORT'];
for (const key of required) {
  if (!process.env[key]) {
    console.error(`Missing required environment variable ${key}`);
    process.exit(1);
  }
}

const port = parseInt(process.env.PORT, 10);

const logFile = resolve(process.cwd(), 'server', 'logs.txt');
const emailLogFile = resolve(process.cwd(), 'server', 'emails.txt');

async function sendEmail({ to, subject, text, html }) {
  try {
    const nodemailer = await import('nodemailer');
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });

    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to,
      subject,
      text,
      html
    });
  } catch (err) {
    const message = `Failed to send email to ${to}: ${err.message}`;
    console.error(message);
    appendFile(emailLogFile, message + '\n', () => {});
    throw err;
  }
}

const server = createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok' }));
  } else if (req.url === '/logs' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
    });
    req.on('end', () => {
      appendFile(logFile, body + '\n', err => {
        if (err) {
          console.error('Failed to write log', err);
        }
      });
      res.writeHead(204);
      res.end();
    });
  } else if (req.url === '/email' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
    });
    req.on('end', async () => {
      try {
        const data = JSON.parse(body);
        await sendEmail(data);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
      } catch {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false }));
      }
    });
  } else {
    res.writeHead(404);
    res.end();
  }
});

server.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
