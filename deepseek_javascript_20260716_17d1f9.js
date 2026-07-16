// Simple email-based authentication with magic link
export async function handleAuth(request, env) {
  const url = new URL(request.url);
  const path = url.pathname;

  // Check existing session
  const sessionId = request.headers.get('Cookie')?.match(/session=([^;]+)/)?.[1];
  if (sessionId) {
    const user = await validateSession(sessionId, env);
    if (user) {
      return { authenticated: true, user };
    }
  }

  // Login page
  if (path === '/login') {
    const email = url.searchParams.get('email');
    if (email) {
      // Send magic link
      await sendMagicLink(email, env);
      return new Response(renderMagicLinkSent(email), {
        headers: { 'Content-Type': 'text/html' }
      });
    }
    return new Response(renderLoginPage(), {
      headers: { 'Content-Type': 'text/html' }
    });
  }

  // Magic link callback
  if (path === '/auth/callback') {
    const token = url.searchParams.get('token');
    if (token) {
      const user = await verifyMagicToken(token, env);
      if (user) {
        const sessionId = await createSession(user, env);
        return new Response(null, {
          status: 302,
          headers: {
            'Location': '/dashboard',
            'Set-Cookie': `session=${sessionId}; HttpOnly; Secure; SameSite=Lax; Max-Age=604800`
          }
        });
      }
    }
    return new Response('Invalid or expired token', { status: 401 });
  }

  return { authenticated: false };
}

export function requireAuth(handler) {
  return async (request, env, user) => {
    if (!user) {
      return new Response('Unauthorized', { status: 401 });
    }
    return handler(request, env, user);
  };
}

async function validateSession(sessionId, env) {
  // In production, use D1 to store sessions
  const result = await env.DB.prepare(
    `SELECT u.* FROM sessions s 
     JOIN users u ON s.user_id = u.id 
     WHERE s.id = ? AND s.expires_at > CURRENT_TIMESTAMP`
  ).bind(sessionId).first();
  
  return result || null;
}

async function createSession(user, env) {
  const sessionId = crypto.randomUUID();
  await env.DB.prepare(
    `INSERT INTO sessions (id, user_id, expires_at) 
     VALUES (?, ?, datetime('now', '+7 days'))`
  ).bind(sessionId, user.id).run();
  return sessionId;
}

async function verifyMagicToken(token, env) {
  const result = await env.DB.prepare(
    `SELECT u.* FROM magic_tokens mt 
     JOIN users u ON mt.user_id = u.id 
     WHERE mt.token = ? AND mt.expires_at > CURRENT_TIMESTAMP`
  ).bind(token).first();
  return result || null;
}

async function sendMagicLink(email, env) {
  const token = crypto.randomUUID();
  // Store token in D1
  await env.DB.prepare(
    `INSERT OR REPLACE INTO magic_tokens (email, token, expires_at) 
     VALUES (?, ?, datetime('now', '+15 minutes'))`
  ).bind(email, token).run();

  // In production, send via Cloudflare Email Worker
  console.log(`Magic link: https://your-domain.com/auth/callback?token=${token}`);
}

function renderLoginPage() {
  return `<!DOCTYPE html>
<html>
<head><title>Login · CYRAX SSD</title>
<style>
body { font-family: system-ui; background: #0a0a0a; color: #fff; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; }
.login-box { background: #1a1a1a; padding: 3rem; border-radius: 16px; border: 1px solid #F78100; max-width: 400px; width: 100%; }
h1 { color: #F78100; margin-top: 0; }
input { width: 100%; padding: 12px; border-radius: 8px; border: 1px solid #333; background: #222; color: #fff; font-size: 16px; margin: 8px 0; }
button { width: 100%; padding: 14px; background: #F78100; border: none; border-radius: 8px; color: #fff; font-weight: 600; font-size: 16px; cursor: pointer; }
button:hover { background: #e67300; }
</style>
</head>
<body>
<div class="login-box">
  <h1>🔐 CYRAX SSD Magician</h1>
  <p>Enter your email to receive a magic link</p>
  <form method="GET">
    <input type="email" name="email" placeholder="you@example.com" required>
    <button type="submit">Send Magic Link →</button>
  </form>
</div>
</body>
</html>`;
}

function renderMagicLinkSent(email) {
  return `<!DOCTYPE html>
<html>
<head><title>Check your email</title>
<style>body { font-family: system-ui; background: #0a0a0a; color: #fff; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; } .box { text-align: center; }</style>
</head>
<body>
<div class="box">
  <h1 style="color:#F78100">📨 Check your email</h1>
  <p>Magic link sent to <strong>${email}</strong></p>
  <p style="color:#666; font-size:14px;">Click the link in your email to log in</p>
</div>
</body>
</html>`;
}