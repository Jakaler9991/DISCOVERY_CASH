import { handleAuth, requireAuth } from './auth.js';
import { handleDatabase, databaseRoutes } from './database.js';
import { handleStorage, storageRoutes } from './storage.js';
import { handleWebSocket, WebSocketHandler } from './websocket.js';
import { handleEmail, emailRoutes } from './email.js';
import { renderDashboard, renderLogin } from './ui.js';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    // ========== 1. AUTHENTICATION ==========
    // Check if user is authenticated
    const authResult = await handleAuth(request, env);
    
    // Public routes (no auth required)
    if (path === '/login' || path === '/auth/callback') {
      return handleAuth(request, env);
    }

    // Private routes (require auth)
    if (!authResult.authenticated) {
      return Response.redirect(new URL('/login', request.url), 302);
    }

    // ========== 2. ROUTING ==========
    try {
      // WebSocket connections
      if (request.headers.get('Upgrade') === 'websocket') {
        return handleWebSocket(request, env, authResult.user);
      }

      // API Routes
      if (path.startsWith('/api/')) {
        // Database operations
        if (databaseRoutes[path]) {
          return databaseRoutes[path](request, env, authResult.user);
        }
        
        // Storage operations
        if (storageRoutes[path]) {
          return storageRoutes[path](request, env, authResult.user);
        }
        
        // Email operations
        if (emailRoutes[path]) {
          return emailRoutes[path](request, env, authResult.user);
        }

        // SSD Magician specific endpoints
        if (path === '/api/magician/sync') {
          return handleMagicianSync(request, env, authResult.user);
        }
        
        if (path === '/api/magician/status') {
          return handleMagicianStatus(request, env, authResult.user);
        }
      }

      // ========== 3. DASHBOARD UI ==========
      if (path === '/' || path === '/dashboard') {
        const html = await renderDashboard(authResult.user, env);
        return new Response(html, {
          headers: { 'Content-Type': 'text/html' }
        });
      }

      // ========== 4. STATIC ASSETS ==========
      return env.ASSETS.fetch(request);

    } catch (error) {
      console.error('Error:', error);
      return new Response(JSON.stringify({
        error: 'Internal Server Error',
        message: error.message
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }
};

// ========== SSD MAGICIAN HANDLERS ==========
async function handleMagicianSync(request, env, user) {
  // Log to Analytics
  env.CYRAX_SSD.writeDataPoint({
    'blobs': ['magician', 'sync', user.email],
    'doubles': [Date.now(), 1.0],
    'indexes': [user.id]
  });

  // Store in D1
  await env.DB.prepare(
    `INSERT INTO sync_logs (user_id, action, timestamp) 
     VALUES (?, 'sync', CURRENT_TIMESTAMP)`
  ).bind(user.id).run();

  // Store in R2
  const key = `syncs/${user.id}/${Date.now()}.json`;
  await env.STORAGE.put(key, JSON.stringify({
    user: user.email,
    timestamp: Date.now(),
    status: 'synced'
  }));

  return new Response(JSON.stringify({
    status: 'success',
    message: 'SSD Magician synced successfully',
    timestamp: Date.now()
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
}

async function handleMagicianStatus(request, env, user) {
  // Get recent syncs from D1
  const result = await env.DB.prepare(
    `SELECT * FROM sync_logs WHERE user_id = ? 
     ORDER BY timestamp DESC LIMIT 10`
  ).bind(user.id).all();

  return new Response(JSON.stringify({
    user: user.email,
    status: 'active',
    recent_syncs: result.results,
    budget: '$1,600.00',
    mode: env.MAGICIAN_MODE || 'enabled'
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
}