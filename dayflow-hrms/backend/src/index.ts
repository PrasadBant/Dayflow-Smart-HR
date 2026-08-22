import app from './app';
import { env } from './config/env';

const server = app.listen(env.PORT, () => {
  console.log(`[Server] Dayflow HRMS Backend running on port ${env.PORT} (${env.NODE_ENV})`);
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('[Server] SIGTERM received. Closing HTTP server...');
  server.close(() => {
    console.log('[Server] HTTP server closed.');
    process.exit(0);
  });
});

export default server;
