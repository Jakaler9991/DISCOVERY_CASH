# Execute schema from the file
wrangler d1 execute cyrax_ssd_db --command="$DATABASE_SCHEMA"

# Or use a separate schema file
wrangler d1 execute cyrax_ssd_db --file=./schema.sql