import 'dotenv/config';
import { createServer } from 'http';
import { appendFile, existsSync, mkdirSync, writeFile, createReadStream, readdir, readFileSync, writeFileSync } from 'fs';
import { resolve, basename, extname } from 'path';
import { Pool } from 'pg';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import XLSX from 'xlsx';

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
const splitDir = resolve(process.cwd(), 'server', 'split');
if (!existsSync(splitDir)) {
  mkdirSync(splitDir, { recursive: true });
}
const signedDir = resolve(process.cwd(), 'server', 'signed');
if (!existsSync(signedDir)) {
  mkdirSync(signedDir, { recursive: true });
}

const signatureText =
  process.env.PDF_SIGNATURE_TEXT ||
  'חתום דיגיטלית על ידי צדקה עניי ישראל ובני ירושלים';

async function signPdf(originalPath) {
  try {
    const pdfBytes = readFileSync(originalPath);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const pages = pdfDoc.getPages();
    for (const page of pages) {
      const { width } = page.getSize();
      const textWidth = font.widthOfTextAtSize(signatureText, 10);
      const x = Math.max(40, width - textWidth - 40);
      page.drawText(signatureText, {
        x,
        y: 40,
        size: 10,
        font,
        color: rgb(0, 0, 0),
        opacity: 0.75,
      });
    }

    const signedBytes = await pdfDoc.save();
    const originalName = basename(originalPath);
    const extension = extname(originalName);
    const baseName =
      extension.toLowerCase() === '.pdf'
        ? originalName.slice(0, -extension.length)
        : originalName;

    let signedFileName = `${baseName}-signed.pdf`;
    let signedPath = resolve(signedDir, signedFileName);
    let counter = 1;
    while (existsSync(signedPath)) {
      signedFileName = `${baseName}-signed-${counter}.pdf`;
      signedPath = resolve(signedDir, signedFileName);
      counter += 1;
    }

    writeFileSync(signedPath, signedBytes);
    return signedPath;
  } catch (err) {
    console.error('Failed to sign PDF', err);
    return originalPath;
  }
}

async function sendEmail({ to, subject, text, html, attachments, senderName }) {
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

    const defaultFrom =
      process.env.SMTP_FROM ||
      (process.env.SMTP_USER
        ? `צדקה עניי ישראל ובני ירושלים <${process.env.SMTP_USER}>`
        : undefined);

    let from = defaultFrom;
    if (senderName) {
      const match = process.env.SMTP_FROM?.match(/<([^>]+)>/);
      const emailAddress = match?.[1] || process.env.SMTP_USER;
      if (emailAddress) {
        from = `${senderName} <${emailAddress}>`;
      }
    }

    await transporter.sendMail({
      from,
      to,
      subject,
      text,
      html,
      attachments
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
      fund_number TEXT,
      email_sent BOOLEAN DEFAULT FALSE,
      sent_date TIMESTAMPTZ
    )`
  )
  .catch(err => {
    console.error('Failed to ensure donations table exists', err);
  });

pool
  .query('ALTER TABLE donations ADD COLUMN IF NOT EXISTS fund_number TEXT')
  .catch(err => {
    console.error('Failed to ensure fund_number column exists on donations table', err);
  });

pool
  .query(
    `CREATE TABLE IF NOT EXISTS pdf_pages (
      id SERIAL PRIMARY KEY,
      original_name TEXT NOT NULL,
      page_number INTEGER NOT NULL,
      file_url TEXT NOT NULL
    )`
  )
  .catch(err => {
    console.error('Failed to ensure pdf_pages table exists', err);
  });

const server = createServer((req, res) => {
  // Allow CORS so the front-end can access the API when served statically
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
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
        const attachments = [];
        if (data.pdfUrl) {
          let filePath;
          if (data.pdfUrl.startsWith('/uploads/')) {
            filePath = resolve(uploadDir, '.' + data.pdfUrl.replace('/uploads', ''));
          } else if (data.pdfUrl.startsWith('/split/')) {
            filePath = resolve(splitDir, '.' + data.pdfUrl.replace('/split', ''));
          }
          if (filePath) {
            const signedPath = await signPdf(filePath);
            attachments.push({ filename: basename(signedPath), path: signedPath });
          }
        }
        await sendEmail({ ...data, attachments });
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
                    'fundNumber', dn.fund_number,
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
            fundNumber: d.fundNumber ?? null,
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
          .query('SELECT id FROM donors WHERE donor_number = $1', [data.donorNumber])
          .then(existing => {
            if (existing.rowCount > 0) {
              res.writeHead(409, { 'Content-Type': 'application/json' });
              res.end(
                JSON.stringify({
                  success: false,
                  message: 'Donor with this donor number already exists',
                })
              );
              return;
            }
            return pool
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
              });
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
  } else if (req.url?.startsWith('/donors/') && req.method === 'PUT') {
    const match = req.url.match(/^\/donors\/(\d+)$/);
    if (!match) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, message: 'Donor not found' }));
      return;
    }
    const donorId = parseInt(match[1], 10);
    if (Number.isNaN(donorId)) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false }));
      return;
    }

    let body = '';
    req.on('data', chunk => {
      body += chunk;
    });
    req.on('end', () => {
      try {
        const data = JSON.parse(body || '{}');
        if (!data.donorNumber || !data.fullName || !data.email) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, message: 'Missing required fields' }));
          return;
        }

        pool
          .query('SELECT id FROM donors WHERE donor_number = $1 AND id <> $2', [data.donorNumber, donorId])
          .then(existing => {
            if (existing.rowCount > 0) {
              res.writeHead(409, { 'Content-Type': 'application/json' });
              res.end(
                JSON.stringify({
                  success: false,
                  message: 'Donor with this donor number already exists',
                })
              );
              return;
            }

            return pool
              .query(
                `UPDATE donors
                 SET donor_number = $1,
                     full_name = $2,
                     email = $3
                 WHERE id = $4
                 RETURNING id, donor_number, full_name, email`,
                [data.donorNumber, data.fullName, data.email, donorId]
              )
              .then(result => {
                if (result.rowCount === 0) {
                  res.writeHead(404, { 'Content-Type': 'application/json' });
                  res.end(JSON.stringify({ success: false, message: 'Donor not found' }));
                  return;
                }

                const donor = {
                  id: result.rows[0].id,
                  donorNumber: result.rows[0].donor_number,
                  fullName: result.rows[0].full_name,
                  email: result.rows[0].email,
                };
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(donor));
              });
          })
          .catch(err => {
            console.error('Failed to update donor', err);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false }));
          });
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false }));
      }
    });
  } else if (req.url === '/donations' && req.method === 'GET') {
    pool
      .query(
        `SELECT dn.id,
                dn.donor_id,
                dn.amount,
                dn.donation_date,
                dn.description,
                dn.pdf_url,
                dn.fund_number,
                dn.email_sent,
                dn.sent_date,
                d.donor_number,
                d.full_name,
                d.email
           FROM donations dn
           LEFT JOIN donors d ON dn.donor_id = d.id
          ORDER BY dn.donation_date DESC NULLS LAST, dn.id DESC`
      )
      .then(result => {
        const donations = result.rows.map(row => ({
          id: row.id,
          donorId: row.donor_id,
          donorNumber: row.donor_number,
          donorName: row.full_name,
          donorEmail: row.email,
          amount: row.amount != null ? parseFloat(row.amount) : 0,
          donationDate: row.donation_date,
          description: row.description,
          pdfUrl: row.pdf_url,
          fundNumber: row.fund_number,
          emailSent: row.email_sent,
          sentDate: row.sent_date,
        }));
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(donations));
      })
      .catch(err => {
        console.error('Failed to fetch donations', err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false }));
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
            `INSERT INTO donations(donor_id, amount, donation_date, description, pdf_url, fund_number, email_sent, sent_date)
             VALUES($1, $2, $3, $4, $5, $6, $7, $8)
             RETURNING id, donor_id, amount, donation_date, description, pdf_url, fund_number, email_sent, sent_date`,
            [
              data.donorId,
              data.amount,
              data.date,
              data.description,
              data.pdfUrl || null,
              data.fundNumber || null,
              data.emailSent || false,
              data.sentDate || null,
            ]
          )
          .then(result => {
            const inserted = result.rows[0];
            const donation = {
              id: inserted.id,
              donorId: inserted.donor_id,
              amount: inserted.amount != null ? parseFloat(inserted.amount) : 0,
              date: inserted.donation_date,
              description: inserted.description,
              pdfUrl: inserted.pdf_url,
              fundNumber: inserted.fund_number,
              emailSent: inserted.email_sent,
              sentDate: inserted.sent_date,
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
  } else if (req.url?.startsWith('/donations/') && req.method === 'PUT') {
    const match = req.url.match(/^\/donations\/(\d+)$/);
    if (!match) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, message: 'Donation not found' }));
      return;
    }
    const donationId = parseInt(match[1], 10);
    if (Number.isNaN(donationId)) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false }));
      return;
    }
    let body = '';
    req.on('data', chunk => {
      body += chunk;
    });
    req.on('end', () => {
      try {
        const data = JSON.parse(body || '{}');
        pool
          .query(
            `UPDATE donations
             SET amount = $1,
                 donation_date = $2,
                 description = $3,
                 pdf_url = $4,
                 fund_number = $5
             WHERE id = $6
             RETURNING id, donor_id, amount, donation_date, description, pdf_url, fund_number, email_sent, sent_date`,
            [
              data.amount,
              data.date,
              data.description,
              data.pdfUrl || null,
              data.fundNumber || null,
              donationId,
            ]
          )
          .then(result => {
            if (result.rowCount === 0) {
              res.writeHead(404, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ success: false, message: 'Donation not found' }));
              return;
            }
            const updated = result.rows[0];
            const donation = {
              id: updated.id,
              donorId: updated.donor_id,
              amount: updated.amount != null ? parseFloat(updated.amount) : 0,
              date: updated.donation_date,
              description: updated.description,
              pdfUrl: updated.pdf_url,
              fundNumber: updated.fund_number,
              emailSent: updated.email_sent,
              sentDate: updated.sent_date,
            };
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(donation));
          })
          .catch(err => {
            console.error('Failed to update donation', err);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false }));
          });
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false }));
      }
    });
  } else if (req.url?.startsWith('/donations/') && req.method === 'DELETE') {
    const match = req.url.match(/^\/donations\/(\d+)$/);
    if (!match) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, message: 'Donation not found' }));
      return;
    }

    const donationId = parseInt(match[1], 10);
    if (Number.isNaN(donationId)) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false }));
      return;
    }

    pool
      .query('DELETE FROM donations WHERE id = $1 RETURNING id', [donationId])
      .then(result => {
        if (result.rowCount === 0) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, message: 'Donation not found' }));
          return;
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
      })
      .catch(err => {
        console.error('Failed to delete donation', err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false }));
      });
  } else if (req.url === '/pdfs' && req.method === 'GET') {
    readdir(uploadDir, async (err, files) => {
      if (err) {
        console.error('Failed to read uploads directory', err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false }));
        return;
      }

      try {
        const { rows } = await pool.query(
          'SELECT original_name, page_number, file_url FROM pdf_pages ORDER BY id'
        );
        const grouped = rows.reduce((acc, row) => {
          if (!acc[row.original_name]) acc[row.original_name] = [];
          acc[row.original_name].push({
            name: `${row.original_name} - page ${row.page_number}`,
            url: row.file_url,
          });
          return acc;
        }, {});

        const { rows: assignmentRows } = await pool.query(
          `SELECT pp.original_name,
                  COALESCE(json_agg(json_build_object(
                    'donorNumber', d.donor_number,
                    'fullName', d.full_name,
                    'amount', dn.amount,
                    'donationDate', dn.donation_date
                  )) FILTER (WHERE dn.id IS NOT NULL), '[]') AS assignments
             FROM pdf_pages pp
             LEFT JOIN donations dn ON dn.pdf_url = pp.file_url
             LEFT JOIN donors d ON dn.donor_id = d.id
            GROUP BY pp.original_name`
        );
        const assignmentsMap = assignmentRows.reduce((acc, row) => {
          acc[row.original_name] = row.assignments.map(a => ({
            donorNumber: a.donorNumber,
            fullName: a.fullName,
            amount: parseFloat(a.amount),
            donationDate: a.donationDate,
          }));
          return acc;
        }, {});

        const pdfs = files
          .filter(f => f.toLowerCase().endsWith('.pdf'))
          .map(name => ({
            name,
            url: `/uploads/${name}`,
            splitPdfs: grouped[name] || [],
            excelAssigned: (assignmentsMap[name] || []).length > 0,
            assignments: assignmentsMap[name] || [],
          }));

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(pdfs));
      } catch (e) {
        console.error('Failed to fetch pdfs', e);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false }));
      }
    });
  } else if (req.url === '/split-pdf' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
    });
    req.on('end', async () => {
      try {
        const { name } = JSON.parse(body);
        const existing = await pool.query(
          'SELECT 1 FROM pdf_pages WHERE original_name = $1 LIMIT 1',
          [name]
        );
        if (existing.rowCount > 0) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, message: 'PDF already split' }));
          return;
        }

        const sourcePath = resolve(uploadDir, name);
        const fileBytes = readFileSync(sourcePath);
        const doc = await PDFDocument.load(fileBytes);
        const totalPages = doc.getPageCount();
        for (let i = 0; i < totalPages; i++) {
          const newDoc = await PDFDocument.create();
          const [page] = await newDoc.copyPages(doc, [i]);
          newDoc.addPage(page);
          const pageBytes = await newDoc.save();
          const pageName = `${name.replace(/\.pdf$/i, '')}-page-${i + 1}.pdf`;
          const pagePath = resolve(splitDir, pageName);
          writeFileSync(pagePath, pageBytes);
          await pool.query(
            'INSERT INTO pdf_pages(original_name, page_number, file_url) VALUES($1, $2, $3)',
            [name, i + 1, `/split/${pageName}`]
          );
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
      } catch (err) {
        console.error('Failed to split PDF', err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false }));
      }
    });
  } else if (req.url === '/assign-excel' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
    });
    req.on('end', async () => {
      try {
        const { name, content } = JSON.parse(body);
        const buffer = Buffer.from(content, 'base64');
        const workbook = XLSX.read(buffer, { type: 'buffer' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        const headerRow = rows[0] || [];
        const dateColumnIndex = headerRow.findIndex(cell => {
          if (cell == null) {
            return false;
          }
          return cell.toString().trim() === 'תאריך';
        });
        const fundNumberColumnIndex = headerRow.findIndex(cell => {
          if (cell == null) {
            return false;
          }
          return cell.toString().trim() === 'מס_קרן';
        });

        const parseExcelDate = value => {
          if (value == null || value === '') {
            return undefined;
          }
          if (typeof value === 'number') {
            const parsed = XLSX.SSF.parse_date_code(value);
            if (!parsed) {
              return undefined;
            }
            const { y, m, d, H = 0, M = 0, S = 0 } = parsed;
            return new Date(Date.UTC(y, m - 1, d, H, M, Math.floor(S)));
          }
          const text = value.toString().trim();
          if (!text) {
            return undefined;
          }
          const parsed = new Date(text);
          if (Number.isNaN(parsed.getTime())) {
            return undefined;
          }
          return parsed;
        };
        const { rows: pageRows } = await pool.query(
          'SELECT file_url FROM pdf_pages WHERE original_name = $1 ORDER BY page_number',
          [name]
        );
        // prevent re-assignment if donations already exist for this PDF
        const { rowCount: alreadyAssigned } = await pool.query(
          `SELECT 1 FROM pdf_pages pp JOIN donations dn ON dn.pdf_url = pp.file_url WHERE pp.original_name = $1 LIMIT 1`,
          [name]
        );
        if (alreadyAssigned > 0) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, message: 'PDF already assigned' }));
          return;
        }
        const pages = pageRows.map(r => r.file_url);
        const assignments = [];
        for (let i = 1; i < rows.length && i - 1 < pages.length; i++) {
          const row = rows[i];
          const donorNumber = row[0]?.toString() || '';
          const fullName = `${row[6] || ''} ${row[8] || ''} ${row[7] || ''}`.trim() || 'Unknown Donor';
          const amount = parseFloat(row[4]) || 0;
          const dateCellIndex = dateColumnIndex >= 0 ? dateColumnIndex : 12;
          const donationDate =
            parseExcelDate(row[dateCellIndex]) || (dateColumnIndex >= 0 ? undefined : parseExcelDate(row[12])) || new Date();
          const fundNumber =
            fundNumberColumnIndex >= 0
              ? (row[fundNumberColumnIndex] != null ? row[fundNumberColumnIndex].toString().trim() : '')
              : '';
          let donorId;
          const existing = await pool.query(
            'SELECT id FROM donors WHERE donor_number = $1',
            [donorNumber]
          );
          if (existing.rowCount > 0) {
            donorId = existing.rows[0].id;
          } else {
            const inserted = await pool.query(
              'INSERT INTO donors(donor_number, full_name, email) VALUES($1, $2, $3) RETURNING id',
              [donorNumber, fullName, `${donorNumber}@example.com`]
            );
            donorId = inserted.rows[0].id;
          }
          await pool.query(
            'INSERT INTO donations(donor_id, amount, donation_date, description, pdf_url, fund_number) VALUES($1, $2, $3, $4, $5, $6)',
            [donorId, amount, donationDate, row[2] || '', pages[i - 1], fundNumber || null]
          );
          assignments.push({ donorNumber, fullName, amount, donationDate, fundNumber });
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, assignments }));
      } catch (err) {
        console.error('Failed to assign donors from excel', err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false }));
      }
    });
  } else if (req.url === '/donors/import' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
    });
    req.on('end', async () => {
      try {
        const { fileName, content } = JSON.parse(body);
        if (!fileName || !content) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, message: 'Invalid request body' }));
          return;
        }

        const buffer = Buffer.from(content, 'base64');
        const workbook = XLSX.read(buffer, { type: 'buffer' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        if (!sheet) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, message: 'Excel file is empty' }));
          return;
        }

        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        if (rows.length <= 1) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, message: 'Excel file does not contain data rows' }));
          return;
        }

        const donorsFromFile = rows
          .map((row, index) => ({
            rowNumber: index + 1,
            fullName: (row[0] || '').toString().trim(),
            donorNumber: (row[1] || '').toString().trim(),
            email: (row[2] || '').toString().trim(),
          }))
          .filter(entry => entry.rowNumber !== 1); // Skip header row

        const errors = [];
        const validDonors = [];
        for (const donor of donorsFromFile) {
          if (!donor.fullName || !donor.donorNumber || !donor.email) {
            errors.push({ rowNumber: donor.rowNumber, reason: 'Missing required fields' });
            continue;
          }
          validDonors.push(donor);
        }

        if (validDonors.length === 0) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(
            JSON.stringify({
              success: true,
              inserted: [],
              duplicates: [],
              errors,
            })
          );
          return;
        }

        const donorNumbers = validDonors.map(d => d.donorNumber);
        const { rows: existingRows } = await pool.query(
          'SELECT donor_number FROM donors WHERE donor_number = ANY($1)',
          [donorNumbers]
        );
        const existingNumbers = new Set(existingRows.map(row => row.donor_number));
        const seenInFile = new Set();
        const duplicates = [];
        const inserted = [];

        for (const donor of validDonors) {
          if (existingNumbers.has(donor.donorNumber)) {
            duplicates.push({
              rowNumber: donor.rowNumber,
              donorNumber: donor.donorNumber,
              reason: 'Donor already exists in the system',
            });
            continue;
          }
          if (seenInFile.has(donor.donorNumber)) {
            duplicates.push({
              rowNumber: donor.rowNumber,
              donorNumber: donor.donorNumber,
              reason: 'Duplicate donor number in file',
            });
            continue;
          }

          try {
            const result = await pool.query(
              'INSERT INTO donors(donor_number, full_name, email) VALUES($1, $2, $3) RETURNING id',
              [donor.donorNumber, donor.fullName, donor.email]
            );
            inserted.push({
              id: result.rows[0].id,
              donorNumber: donor.donorNumber,
              fullName: donor.fullName,
              email: donor.email,
            });
            seenInFile.add(donor.donorNumber);
          } catch (err) {
            console.error('Failed to insert donor from import', err);
            errors.push({
              rowNumber: donor.rowNumber,
              reason: 'Failed to insert donor',
            });
          }
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            success: true,
            inserted,
            duplicates,
            errors,
          })
        );
      } catch (err) {
        console.error('Failed to import donors from excel', err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false }));
      }
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
  } else if (req.url?.startsWith('/split/') && req.method === 'GET') {
    const filePath = resolve(splitDir, '.' + req.url.replace('/split', ''));
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
