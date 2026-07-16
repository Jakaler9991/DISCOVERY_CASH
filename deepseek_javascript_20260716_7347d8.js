export async function renderDashboard(user, env) {
  // Get stats from D1
  const stats = await env.DB.prepare(
    `SELECT COUNT(*) as syncs FROM sync_logs WHERE user_id = ?`
  ).bind(user.id).first();

  return `<!DOCTYPE html>
<html>
<head>
    <title>🪄 CYRAX SSD Magician · Dashboard</title>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: system-ui; background: #0a0a0a; color: #fff; padding: 2rem; }
        .container { max-width: 1200px; margin: 0 auto; }
        .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #F78100; padding-bottom: 1rem; }
        .header h1 { color: #F78100; }
        .user-info { color: #888; }
        .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1.5rem; margin: 2rem 0; }
        .card { background: #1a1a1a; padding: 1.5rem; border-radius: 12px; border: 1px solid #333; }
        .card h3 { color: #F78100; margin-bottom: 0.5rem; }
        .card .value { font-size: 2rem; font-weight: bold; }
        .card .label { color: #888; font-size: 0.8rem; text-transform: uppercase; }
        .btn { background: #F78100; border: none; padding: 0.8rem 1.5rem; border-radius: 8px; color: #fff; font-weight: 600; cursor: pointer; }
        .btn:hover { background: #e67300; }
        .ws-status { display: inline-block; padding: 0.3rem 1rem; border-radius: 100px; font-size: 0.8rem; }
        .online { background: #00ff8844; color: #00ff88; }
        .offline { background: #ff444444; color: #ff4444; }
        #wsIndicator { display: flex; align-items: center; gap: 0.5rem; margin: 1rem 0; }
        .dot { width: 10px; height: 10px; border-radius: 50%; display: inline-block; }
        .dot.green { background: #00ff88; animation: pulse 2s infinite; }
        @keyframes pulse { 50% { opacity: 0.5; } }
        #log { background: #111; padding: 1rem; border-radius: 8px; max-height: 300px; overflow-y: auto; font-family: monospace; font-size: 0.8rem; border: 1px solid #222; }
        #log .entry { padding: 4px 0; border-bottom: 1px solid #1a1a1a; color: #aaa; }
        #log .entry .time { color: #666; margin-right: 8px; }
        .flex { display: flex; gap: 1rem; flex-wrap: wrap; margin: 1rem 0; }
    </style>
</head>
<body>
<div class="container">
    <div class="header">
        <div>
            <h1>🪄 CYRAX SSD Magician</h1>
            <p style="color:#888;">Samsung EVO · PRO 990 · Dual Core</p>
        </div>
        <div class="user-info">
            👤 ${user.email} · <a href="/logout" style="color:#666; text-decoration:none;">logout</a>
        </div>
    </div>

    <div class="grid">
        <div class="card">
            <div class="label">Syncs</div>
            <div class="value" id="syncCount">${stats?.syncs || 0}</div>
        </div>
        <div class="card">
            <div class="label">Budget</div>
            <div class="value">$1,600</div>
        </div>
        <div class="card">
            <div class="label">Mode</div>
            <div class="value" style="font-size:1.2rem;">${env.MAGICIAN_MODE || 'enabled'}</div>
        </div>
        <div class="card">
            <div class="label">Status</div>
            <div class="value" style="font-size:1.2rem;" id="statusDisplay">🟢 Active</div>
        </div>
    </div>

    <div class="flex">
        <button class="btn" id="syncBtn">🔄 Sync SSD</button>
        <button class="btn" id="pingBtn">📡 Ping</button>
        <button class="btn" id="animateBtn">🎨 Animate</button>
    </div>

    <div id="wsIndicator">
        <span class="dot green" id="wsDot"></span>
        <span id="wsText">WebSocket Connected</span>
        <span class="ws-status online" id="wsStatus">ONLINE</span>
    </div>

    <div id="log">
        <div class="entry"><span class="time">[${new Date().toLocaleTimeString()}]</span> Welcome to CYRAX SSD Magician</div>
        <div class="entry"><span class="time">[${new Date().toLocaleTimeString()}]</span> WebSocket connected</div>
    </div>
</div>

<script>
    // ========== WEBSOCKET ==========
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(protocol + '//' + window.location.host + '/ws');
    const log = document.getElementById('log');
    const statusDisplay = document.getElementById('statusDisplay');
    const wsDot = document.getElementById('wsDot');
    const wsText = document.getElementById('wsText');
    const wsStatus = document.getElementById('wsStatus');
    let syncCount = parseInt(document.getElementById('syncCount').textContent);

    function addLog(message, type = 'info') {
        const time = new Date().toLocaleTimeString();
        const entry = document.createElement('div');
        entry.className = 'entry';
        entry.innerHTML = \`<span class="time">[\${time}]</span> \${message}\`;
        log.appendChild(entry);
        log.scrollTop = log.scrollHeight;
    }

    ws.onopen = () => {
        wsDot.className = 'dot green';
        wsText.textContent = 'WebSocket Connected';
        wsStatus.textContent = 'ONLINE';
        wsStatus.className = 'ws-status online';
        addLog('🟢 WebSocket connected');
    };

    ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        switch(data.type) {
            case 'welcome':
                addLog('👋 ' + data.message);
                break;
            case 'sync_start':
                addLog('🔄 ' + data.message);
                break;
            case 'sync_progress':
                addLog('📊 ' + data.message);
                break;
            case 'sync_complete':
                syncCount++;
                document.getElementById('syncCount').textContent = syncCount;
                addLog('✅ ' + data.message);
                break;
            case 'ping':
                addLog('🏓 Pong');
                break;
            case 'status':
                addLog('📊 Status: ' + data.syncs + ' syncs');
                break;
            case 'error':
                addLog('❌ ' + data.message, 'error');
                break;
            default:
                addLog('📨 ' + JSON.stringify(data));
        }
    };

    ws.onclose = () => {
        wsDot.className = 'dot';
        wsDot.style.background = '#ff4444';
        wsText.textContent = 'WebSocket Disconnected';
        wsStatus.textContent = 'OFFLINE';
        wsStatus.className = 'ws-status offline';
        addLog('🔴 WebSocket disconnected');
    };

    // ========== BUTTONS ==========
    document.getElementById('syncBtn').addEventListener('click', () => {
        ws.send(JSON.stringify({ type: 'sync_ssd', ssd: 'Samsung EVO 990 PRO' }));
        addLog('📡 Sync command sent');
    });

    document.getElementById('pingBtn').addEventListener('click', () => {
        ws.send(JSON.stringify({ type: 'ping' }));
        addLog('🏓 Ping sent');
    });

    document.getElementById('animateBtn').addEventListener('click', () => {
        ws.send(JSON.stringify({ type: 'command', command: 'animate' }));
        addLog('🎨 Animation triggered');
        
        // Visual feedback
        document.querySelectorAll('.card').forEach((card, i) => {
            setTimeout(() => {
                card.style.borderColor = '#F78100';
                card.style.transform = 'scale(1.02)';
                setTimeout(() => {
                    card.style.borderColor = '#333';
                    card.style.transform = '';
                }, 500);
            }, i * 150);
        });
    });
</script>
</body>
</html>`;
}