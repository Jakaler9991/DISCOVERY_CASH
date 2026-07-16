# 1. Create D1 Database
wrangler d1 create cyrax_ssd_db

# 2. Apply schema
wrangler d1 execute cyrax_ssd_db --file=./schema.sql

# 3. Create R2 Bucket
wrangler r2 bucket create cyrax-ssd-storage

# 4. Create Analytics Dataset (via Cloudflare Dashboard)
# Go to Analytics Engine → Create Dataset → "ssd_magician_analytics"

# 5. Deploy Worker
wrangler deploy

# 6. Test WebSocket
# Open browser console: new WebSocket('wss://your-worker.workers.dev/ws')