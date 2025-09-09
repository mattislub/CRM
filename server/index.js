import 'dotenv/config';
import { createServer } from 'http';
import { appendFile, existsSync, mkdirSync, writeFile, createReadStream } from 'fs';
import { resolve } from 'path';
import { Pool } from 'pg';

const required = [
  'PORT',
  'PGHOST',
  'PGUSER',
  'PGPASSWORD',
  'PGDATABASE',
];
for (const key of required) {
  if (!process.env[key]) {
    console.error(`Missing required environment variable ${key}`);
    process.exit(1);
  }
}

const port = parseInt(process.env.PORT, 10);

const logFile = resolve(process.cwd(), 'server', 'logs.txt');
const emailLogFile = resolve(process.cwd(), 'server', 'emails.txt');
const uploadDir = resolve(process.cwd(), 'server', 'uploads');
if (!existsSync(uploadDir)) {
  mkdirSync(uploadDir, { recursive: true });
}

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

const pool = new Pool({
  host: process.env.PGHOST,
  port: process.env.PGPORT ? parseInt(process.env.PGPORT, 10) : undefined,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  database: process.env.PGDATABASE,
});

pool
  .query(
    `CREATE TABLE IF NOT EXISTS logs (
      id SERIAL PRIMARY KEY,
      data TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`
  )
  .catch(err => {
    console.error('Failed to ensure logs table exists', err);
  });

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
      pool
        .query('INSERT INTO logs(data) VALUES($1)', [body])
        .catch(err => {
          console.error('Failed to insert log', err);
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
  } else if (req.url === '/upload' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
    });
    req.on('end', () => {
      try {
        const { fileName, content } = JSON.parse(body);
        const filePath = resolve(uploadDir, fileName);
        writeFile(filePath, Buffer.from(content, 'base64'), err => {
          if (err) {
            console.error('Failed to save file', err);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false }));
            return;
          }
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, url: `/uploads/${fileName}` }));
        });
      } catch (err) {
        console.error('Failed to process upload', err);
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false }));
      }
    });
  } else if (req.url?.startsWith('/uploads/') && req.method === 'GET') {
    const filePath = resolve(uploadDir, '.' + req.url.replace('/uploads', ''));
    const stream = createReadStream(filePath);
    stream.on('error', () => {
      res.writeHead(404);
      res.end();
    });
    stream.pipe(res);
  } else {
    res.writeHead(404);
    res.end();
  }
});

server.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
