export function handleWebSocket(request, env, user) {
  const pair = new WebSocketPair();
  const [client, server] = Object.values(pair);

  // Accept the WebSocket connection
  server.accept();

  // Create handler instance
  const handler = new WebSocketHandler(server, user, env);

  // Send welcome message
  server.send(JSON.stringify({
    type: 'welcome',
    user: user.email,
    timestamp: Date.now(),
    message: 'Connected to CYRAX SSD Magician'
  }));

  return new Response(null, {
    status: 101,
    webSocket: client
  });
}

export class WebSocketHandler {
  constructor(ws, user, env) {
    this.ws = ws;
    this.user = user;
    this.env = env;
    this.pingInterval = null;

    // Set up message handler
    ws.addEventListener('message', (event) => this.handleMessage(event));
    ws.addEventListener('close', () => this.handleClose());
    ws.addEventListener('error', (error) => console.error('WebSocket error:', error));

    // Start heartbeat
    this.pingInterval = setInterval(() => {
      ws.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
    }, 30000);
  }

  async handleMessage(event) {
    try {
      const data = JSON.parse(event.data);
      
      // Log to Analytics
      this.env.CYRAX_SSD.writeDataPoint({
        'blobs': ['websocket', data.type, this.user.email],
        'doubles': [Date.now()],
        'indexes': [this.user.id]
      });

      switch (data.type) {
        case 'sync_ssd':
          await this.handleSyncSSD(data);
          break;
        case 'get_status':
          await this.sendStatus();
          break;
        case 'command':
          await this.handleCommand(data);
          break;
        default:
          this.ws.send(JSON.stringify({
            type: 'error',
            message: `Unknown command: ${data.type}`
          }));
      }
    } catch (e) {
      this.ws.send(JSON.stringify({
        type: 'error',
        message: 'Invalid message format'
      }));
    }
  }

  async handleSyncSSD(data) {
    // Simulate SSD sync
    this.ws.send(JSON.stringify({
      type: 'sync_start',
      message: 'Starting SSD sync...',
      timestamp: Date.now()
    }));

    // Do the sync
    await this.env.DB.prepare(
      `INSERT INTO sync_logs (user_id, action, data, timestamp) 
       VALUES (?, 'websocket_sync', ?, CURRENT_TIMESTAMP)`
    ).bind(this.user.id, JSON.stringify(data)).run();

    // Send progress updates
    for (let i = 0; i <= 100; i += 20) {
      this.ws.send(JSON.stringify({
        type: 'sync_progress',
        progress: i,
        message: `Syncing... ${i}%`
      }));
      await sleep(500);
    }

    this.ws.send(JSON.stringify({
      type: 'sync_complete',
      message: 'SSD sync complete!',
      timestamp: Date.now()
    }));
  }

  async sendStatus() {
    const stats = await this.env.DB.prepare(
      `SELECT COUNT(*) as count FROM sync_logs WHERE user_id = ?`
    ).bind(this.user.id).first();

    this.ws.send(JSON.stringify({
      type: 'status',
      user: this.user.email,
      syncs: stats.count,
      connected: true,
      timestamp: Date.now()
    }));
  }

  async handleCommand(data) {
    this.ws.send(JSON.stringify({
      type: 'command_ack',
      command: data.command,
      status: 'executed',
      timestamp: Date.now()
    }));
  }

  handleClose() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
    console.log(`WebSocket closed for user: ${this.user.email}`);
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}