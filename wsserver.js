const { WebSocketServer } = require('ws');
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || (process.env.VERCEL ? 'myblog_liquid_glass_secret_key_2024' : 'local_dev_blog_key_not_for_production');

/* Track connected clients: Map<userId, Set<WebSocket>> */
const clients = new Map();

function setupWebSocket(server) {
  const wss = new WebSocketServer({ server, path: '/ws' });
  console.log('[WS] WebSocket server ready at /ws');

  wss.on('connection', (ws, req) => {
    try {
      const url = new URL(req.url, 'http://localhost');
      const token = url.searchParams.get('token');
      if (!token) { ws.close(4001, 'Missing token'); return; }
      
      const decoded = jwt.verify(token, JWT_SECRET);
      ws.userId = decoded.id;
      ws.userRole = decoded.role || 'user';

      if (!clients.has(ws.userId)) clients.set(ws.userId, new Set());
      clients.get(ws.userId).add(ws);
      console.log('[WS] User ' + ws.userId + ' connected (' + ws.userRole + ')');
    } catch(e) {
      ws.close(4001, 'Invalid token');
      return;
    }

    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString());
        if (msg.type === 'ping') {
          ws.send(JSON.stringify({ type: 'pong' }));
        }
      } catch(e) {}
    });

    ws.on('close', () => {
      if (ws.userId && clients.has(ws.userId)) {
        clients.get(ws.userId).delete(ws);
        if (clients.get(ws.userId).size === 0) clients.delete(ws.userId);
      }
    });

    ws.on('error', () => {
      if (ws.userId && clients.has(ws.userId)) {
        clients.get(ws.userId).delete(ws);
        if (clients.get(ws.userId).size === 0) clients.delete(ws.userId);
      }
    });

    ws.send(JSON.stringify({ type: 'connected', userId: ws.userId }));
  });
}

function notifyUser(userId, payload) {
  if (clients.has(userId)) {
    const msg = JSON.stringify(payload);
    clients.get(userId).forEach(ws => {
      if (ws.readyState === 1) ws.send(msg);
    });
  }
}

function notifyAdmins(payload) {
  const msg = JSON.stringify(payload);
  for (const [userId, sockets] of clients) {
    for (const ws of sockets) {
      if ((ws.userRole === 'admin' || ws.userRole === 'semi_admin') && ws.readyState === 1) {
        ws.send(msg);
      }
    }
  }
}

module.exports = { setupWebSocket, notifyUser, notifyAdmins };
