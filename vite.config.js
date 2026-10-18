import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import app from './server/app.js'

function expressApiPlugin() {
  return {
    name: 'express-api-plugin',
    configureServer(server) {
      server.middlewares.use(app);
    }
  };
}

export default defineConfig({
  plugins: [react(), expressApiPlugin()],
  server: {
    port: 5173
  }
});
