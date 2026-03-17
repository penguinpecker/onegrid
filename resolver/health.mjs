import http from 'http';
const PORT = process.env.PORT || 3000;
http.createServer((req, res) => {
  res.writeHead(200);
  res.end('OneGrid resolver running');
}).listen(PORT, () => console.log(`[HEALTH] Listening on port ${PORT}`));
