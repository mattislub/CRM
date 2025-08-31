import { createServer } from 'http';
import { readFileSync } from 'fs';
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

const server = createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok' }));
  } else {
    res.writeHead(404);
    res.end();
  }
});

server.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
