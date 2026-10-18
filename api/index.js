import 'dotenv/config';
import app from '../server/app.js';

export default function handler(req, res) {
  // Ensure req.url retains /api prefix when invoked by Vercel serverless rewrites
  if (req.url && !req.url.startsWith('/api')) {
    req.url = '/api' + req.url;
  }
  return app(req, res);
}
