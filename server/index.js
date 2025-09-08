import { createServer } from 'http';
import { readFileSync, appendFile } from 'fs';
import { resolve } from 'path';
import { Pool } from 'pg';

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

const required = [
  'VITE_TRANZILA_SUPPLIER_ID',
  'VITE_TRANZILA_PUBLIC_KEY',
  'VITE_TRANZILA_PRIVATE_KEY',
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
  } else {
    res.writeHead(404);
    res.end();
  }
});

server.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
