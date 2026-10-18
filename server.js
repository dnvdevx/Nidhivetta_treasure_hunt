import 'dotenv/config';
import app from './server/app.js';

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Thanima Nidhivetta Server running on http://localhost:${PORT}`);
  console.log(`📡 Ready for local development & Vercel deployment!`);
});
