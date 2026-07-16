// index.js
import hooks, { DATABASE_SCHEMA } from './hooks/HOOKER_JOB(S).js';

export default {
    async fetch(request, env, ctx) {
        // ... your code
        
        // Use hooks
        try {
            const user = await getUser(request, env);
            
            // Before sync
            await hooks.beforeSyncHook(env, user, { ssd: 'EVO 990 PRO' });
            
            // Do the sync
            const result = await performSync(env, user);
            
            // After sync
            await hooks.afterSyncHook(env, user, result);
            
        } catch (error) {
            // Error hook
            await hooks.errorHook(env, user, error);
            return new Response(JSON.stringify({ error: error.message }), { status: 500 });
        }
    }
};