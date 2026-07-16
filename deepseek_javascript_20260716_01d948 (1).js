// ============================================================
// CYRAX SSD MAGICIAN - Database Schema & Hooks
// ============================================================

// ========== DATABASE SCHEMA (for D1) ==========
const DATABASE_SCHEMA = `
-- Users table
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Sessions
CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    expires_at DATETIME NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Magic link tokens
CREATE TABLE IF NOT EXISTS magic_tokens (
    email TEXT PRIMARY KEY,
    token TEXT NOT NULL,
    expires_at DATETIME NOT NULL
);

-- Sync logs
CREATE TABLE IF NOT EXISTS sync_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    action TEXT NOT NULL,
    data TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    type TEXT NOT NULL,
    message TEXT NOT NULL,
    read BOOLEAN DEFAULT 0,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Indexes
CREATE INDEX idx_syncs_user ON sync_logs(user_id);
CREATE INDEX idx_syncs_time ON sync_logs(timestamp);
CREATE INDEX idx_notifications_user ON notifications(user_id);
`;

// ========== HOOK FUNCTIONS ==========

/**
 * Hook: Run before a sync operation
 * @param {Object} env - Cloudflare environment
 * @param {Object} user - Authenticated user
 * @param {Object} data - Sync data
 */
export async function beforeSyncHook(env, user, data) {
    console.log(`🔵 [HOOK] Pre-sync for user: ${user.email}`);
    
    // Log to Analytics
    if (env.CYRAX_SSD) {
        env.CYRAX_SSD.writeDataPoint({
            'blobs': ['hook', 'before_sync', user.email],
            'doubles': [Date.now()],
            'indexes': [user.id]
        });
    }
    
    // Validate SSD type
    const validSSDs = ['EVO', 'PRO', '990', '870', '980'];
    const ssdType = data?.ssd || 'unknown';
    if (!validSSDs.some(v => ssdType.toUpperCase().includes(v))) {
        throw new Error(`Invalid SSD type: ${ssdType}. Must be one of: ${validSSDs.join(', ')}`);
    }
    
    return { valid: true, ssdType };
}

/**
 * Hook: Run after a sync operation
 * @param {Object} env - Cloudflare environment
 * @param {Object} user - Authenticated user
 * @param {Object} result - Sync result
 */
export async function afterSyncHook(env, user, result) {
    console.log(`🟢 [HOOK] Post-sync for user: ${user.email}`);
    
    // Store in R2 for audit
    if (env.STORAGE) {
        const key = `audit/${user.id}/${Date.now()}_sync.json`;
        await env.STORAGE.put(key, JSON.stringify({
            user: user.email,
            timestamp: Date.now(),
            result: result
        }));
    }
    
    // Send notification
    await sendNotification(env, user, 'Sync completed successfully');
    
    return { stored: true, key: `audit/${user.id}/${Date.now()}_sync.json` };
}

/**
 * Hook: Error handler
 * @param {Object} env - Cloudflare environment
 * @param {Object} user - Authenticated user
 * @param {Error} error - The error that occurred
 */
export async function errorHook(env, user, error) {
    console.error(`🔴 [HOOK] Error for user ${user.email}:`, error.message);
    
    // Log error to Analytics
    if (env.CYRAX_SSD) {
        env.CYRAX_SSD.writeDataPoint({
            'blobs': ['hook', 'error', user.email, error.message],
            'doubles': [Date.now()],
            'indexes': [user.id]
        });
    }
    
    // Store error in D1
    if (env.DB) {
        await env.DB.prepare(
            `INSERT INTO sync_logs (user_id, action, data, timestamp) 
             VALUES (?, 'error', ?, CURRENT_TIMESTAMP)`
        ).bind(user.id, JSON.stringify({ error: error.message })).run();
    }
    
    return { handled: true, error: error.message };
}

/**
 * Hook: Authentication hook
 * @param {Object} env - Cloudflare environment
 * @param {Object} user - Authenticated user
 */
export async function authHook(env, user) {
    // Check if user has valid session
    const result = await env.DB.prepare(
        `SELECT * FROM sessions WHERE user_id = ? AND expires_at > CURRENT_TIMESTAMP`
    ).bind(user.id).first();
    
    if (!result) {
        throw new Error('Session expired or invalid');
    }
    
    return { valid: true, session: result };
}

// ========== HELPER FUNCTIONS ==========

async function sendNotification(env, user, message) {
    try {
        await env.DB.prepare(
            `INSERT INTO notifications (user_id, type, message, timestamp) 
             VALUES (?, 'system', ?, CURRENT_TIMESTAMP)`
        ).bind(user.id, message).run();
        
        console.log(`📧 [HOOK] Notification sent to ${user.email}: ${message}`);
    } catch (e) {
        console.warn('Failed to send notification:', e.message);
    }
}

// ========== EXPORT HOOKS ==========
export default {
    beforeSyncHook,
    afterSyncHook,
    errorHook,
    authHook,
    DATABASE_SCHEMA
};