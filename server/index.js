import 'dotenv/config';
import { createServer } from 'http';
import { appendFile, existsSync, mkdirSync, writeFile, createReadStream, readdir } from 'fs';
import { resolve } from 'path';
import { Pool } from 'pg';

const required = [
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

const port = parseInt(process.env.PORT || '3001', 10);

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

pool
  .query(
    `CREATE TABLE IF NOT EXISTS donors (
      id SERIAL PRIMARY KEY,
      donor_number TEXT NOT NULL,
      full_name TEXT NOT NULL,
      email TEXT NOT NULL
    )`
  )
  .catch(err => {
    console.error('Failed to ensure donors table exists', err);
  });

pool
  .query(
    `CREATE TABLE IF NOT EXISTS donations (
      id SERIAL PRIMARY KEY,
      donor_id INTEGER REFERENCES donors(id) ON DELETE CASCADE,
      amount NUMERIC NOT NULL,
      donation_date DATE NOT NULL,
      description TEXT,
      pdf_url TEXT,
      email_sent BOOLEAN DEFAULT FALSE,
      sent_date TIMESTAMPTZ
    )`
  )
  .catch(err => {
    console.error('Failed to ensure donations table exists', err);
  });

const server = createServer((req, res) => {
  // Allow CORS so the front-end can access the API when served statically
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  console.log(`Incoming request: ${req.method} ${req.url}`);
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
        if (data.donationId) {
          pool
            .query('UPDATE donations SET email_sent = true, sent_date = NOW() WHERE id = $1', [data.donationId])
            .catch(err => {
              console.error('Failed to mark email sent', err);
            });
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
      } catch {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false }));
      }
    });
  } else if (req.url === '/donors' && req.method === 'GET') {
    pool
      .query(
        `SELECT d.id, d.donor_number, d.full_name, d.email,
                COALESCE(json_agg(
                  json_build_object(
                    'id', dn.id,
                    'amount', dn.amount,
                    'date', dn.donation_date,
                    'description', dn.description,
                    'pdfUrl', dn.pdf_url,
                    'emailSent', dn.email_sent,
                    'sentDate', dn.sent_date
                  )
                ) FILTER (WHERE dn.id IS NOT NULL), '[]') AS donations,
                COALESCE(SUM(dn.amount), 0) AS total_donations
           FROM donors d
           LEFT JOIN donations dn ON dn.donor_id = d.id
          GROUP BY d.id
          ORDER BY d.id`
      )
      .then(result => {
        const donors = result.rows.map(row => ({
          id: row.id,
          donorNumber: row.donor_number,
          fullName: row.full_name,
          email: row.email,
          donations: row.donations.map(d => ({
            ...d,
            amount: parseFloat(d.amount),
          })),
          totalDonations: parseFloat(row.total_donations),
        }));
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(donors));
      })
      .catch(err => {
        console.error('Failed to fetch donors', err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false }));
      });
  } else if (req.url === '/donors' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
    });
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        pool
          .query(
            'INSERT INTO donors(donor_number, full_name, email) VALUES($1, $2, $3) RETURNING id',
            [data.donorNumber, data.fullName, data.email]
          )
          .then(result => {
            const donor = {
              id: result.rows[0].id,
              donorNumber: data.donorNumber,
              fullName: data.fullName,
              email: data.email,
              donations: [],
              totalDonations: 0,
            };
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(donor));
          })
          .catch(err => {
            console.error('Failed to add donor', err);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false }));
          });
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false }));
      }
    });
  } else if (req.url === '/donations' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
    });
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        pool
          .query(
            `INSERT INTO donations(donor_id, amount, donation_date, description, pdf_url, email_sent, sent_date)
             VALUES($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
            [
              data.donorId,
              data.amount,
              data.date,
              data.description,
              data.pdfUrl || null,
              data.emailSent || false,
              data.sentDate || null,
            ]
          )
          .then(result => {
            const donation = {
              id: result.rows[0].id,
              amount: data.amount,
              date: data.date,
              description: data.description,
              pdfUrl: data.pdfUrl || null,
              emailSent: data.emailSent || false,
              sentDate: data.sentDate || null,
            };
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(donation));
          })
          .catch(err => {
            console.error('Failed to add donation', err);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false }));
          });
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false }));
      }
    });
  } else if (req.url === '/pdfs' && req.method === 'GET') {
    readdir(uploadDir, (err, files) => {
      if (err) {
        console.error('Failed to read uploads directory', err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false }));
        return;
      }
      const pdfs = files
        .filter(f => f.toLowerCase().endsWith('.pdf'))
        .map(name => ({ name, url: `/uploads/${name}` }));
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(pdfs));
    });
  } else if (req.url === '/upload' && req.method === 'POST') {
    console.log('Received upload request:', req.url);
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
