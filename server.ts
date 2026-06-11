// ============================================================
// DecidArch V2 — Custom Next.js Server with WebSocket
// ============================================================

import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { WebSocketServer } from 'ws';
import { setupWebSocket } from './src/lib/socketManager';

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = parseInt(process.env.PORT || '3000', 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const upgradeHandler = app.getUpgradeHandler();

  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url || '/', true);
    handle(req, res, parsedUrl);
  });

  // WebSocket server — upgrade on /ws path
  const wss = new WebSocketServer({ noServer: true });
  setupWebSocket(wss);

  server.on('upgrade', (request, socket, head) => {
    const { pathname } = parse(request.url || '/', true);

    if (pathname === '/ws') {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    } else {
      upgradeHandler(request, socket, head);
    }
  });

  server.listen(port, () => {
    console.log(`\n  ⚡ DecidArch V2 ready at http://${hostname}:${port}\n`);
  });
});
