import app from './app';
import { initDatabase } from './db/client';

const PORT = process.env.PORT || 3000;

// Initialize database connection
const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error('DATABASE_URL environment variable is required');
  process.exit(1);
}

initDatabase(dbUrl);

// Start server
export default {
  port: PORT,
  fetch: app.fetch,
};

console.log(`Sync server running on port ${PORT}`);
