export const databaseRoutes = {
  '/api/db/users': async (request, env, user) => {
    if (request.method === 'GET') {
      const result = await env.DB.prepare('SELECT id, email, created_at FROM users').all();
      return new Response(JSON.stringify(result.results), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
    return new Response('Method not allowed', { status: 405 });
  },

  '/api/db/syncs': async (request, env, user) => {
    const result = await env.DB.prepare(
      `SELECT * FROM sync_logs WHERE user_id = ? ORDER BY timestamp DESC LIMIT 20`
    ).bind(user.id).all();
    
    return new Response(JSON.stringify(result.results), {
      headers: { 'Content-Type': 'application/json' }
    });
  },

  '/api/db/stats': async (request, env, user) => {
    const total = await env.DB.prepare('SELECT COUNT(*) as count FROM sync_logs').first();
    const userSyncs = await env.DB.prepare(
      'SELECT COUNT(*) as count FROM sync_logs WHERE user_id = ?'
    ).bind(user.id).first();

    return new Response(JSON.stringify({
      total_syncs: total.count,
      user_syncs: userSyncs.count,
      user: user.email
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
};