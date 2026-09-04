import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig(({ mode }) => {
  // Reads VITE_API_URL from the shell env (Docker build ARG/ENV) or a local
  // .env file. Statically replacing `process.env.VITE_API_URL` here — rather
  // than reading `import.meta.env.VITE_API_URL` at runtime in src code —
  // keeps that literal token (`import.meta`) out of api-client/client.ts,
  // which tests/e2e/*.test.ts also `require()` directly under plain Node
  // via ts-node; see the comment on getBaseApiUrl() there for why.
  const env = loadEnv(mode, path.resolve(__dirname, '..'), 'VITE_');

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@shared': path.resolve(__dirname, '../shared'),
      },
    },
    define: {
      'process.env.VITE_API_URL': JSON.stringify(process.env.VITE_API_URL || env.VITE_API_URL || ''),
    },
    server: {
      port: 5173,
      proxy: {
        '/api': {
          target: 'http://localhost:5000',
          changeOrigin: true,
        },
      },
    },
  };
});
