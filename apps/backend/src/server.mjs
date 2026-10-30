import http from 'node:http';

const PORT = Number(process.env.BACKEND_PORT || 4000);
const allowedOrigin = process.env.CLIENT_ORIGIN || 'http://localhost:3000';

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }

  if (req.url === '/api/health' && req.method === 'GET') {
    res.writeHead(200);
    return res.end(JSON.stringify({ ok: true, service: '3dautomision-backend' }));
  }

  res.writeHead(404);
  res.end(JSON.stringify({ ok: false, message: 'Route not found' }));
});

server.listen(PORT, () => {
  console.log(`3dautomision backend running at http://localhost:${PORT}`);
});
