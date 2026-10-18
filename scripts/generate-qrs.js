import QRCode from 'qrcode';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { STARTING_STATIONS, GAME_DETAILS } from '../server/scheduleData.js';
import { generateQrWithLogo } from '../server/qrHelper.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Base URL for the deployed web app.
const BASE_URL = process.argv[2] || process.env.APP_URL || 'https://nidhivetta.vercel.app';

const outputDir = path.join(__dirname, '..', 'qrs');
const stationsDir = path.join(outputDir, 'starting-stations');
const gamesDir = path.join(outputDir, 'game-stations');

fs.mkdirSync(stationsDir, { recursive: true });
fs.mkdirSync(gamesDir, { recursive: true });

console.log(`\n======================================================`);
console.log(`🚀 GENERATING THANIMA TREASURE HUNT QR CODES`);
console.log(`🌐 Base Web App URL: ${BASE_URL}`);
console.log(`🖼️  With Center Logo: qr_image.png`);
console.log(`======================================================\n`);

async function generateAll() {
  const stationCards = [];

  // 1. Generate 5 Starting Stations
  console.log(`📍 Generating 5 Starting Station QR Codes (2 teams per QR)...`);
  for (let i = 0; i < STARTING_STATIONS.length; i++) {
    const st = STARTING_STATIONS[i];
    const stationNum = i + 1;
    const allowedTeamsText = `Team ${st.allowedTeamNumbers.join(' & Team ')}`;

    // URL encoded so when phone camera scans it, it opens directly in browser!
    const scanUrl = `${BASE_URL}/?start_qr=${encodeURIComponent(st.qrCode)}`;
    const baseFilename = `Station-${stationNum}-Teams-${st.allowedTeamNumbers.join('-and-')}`;

    // Generate SVG with embedded qr_image in center
    const { svg, dataUri } = await generateQrWithLogo(scanUrl, {
      color: { dark: '#2b0a07', light: '#ffffff' }
    });

    // Save SVG file
    const svgPath = path.join(stationsDir, `${baseFilename}.svg`);
    fs.writeFileSync(svgPath, svg, 'utf-8');

    // Also save PNG fallback
    const pngPath = path.join(stationsDir, `${baseFilename}.png`);
    await QRCode.toFile(pngPath, scanUrl, {
      width: 600,
      margin: 2,
      errorCorrectionLevel: 'H',
      color: { dark: '#2b0a07', light: '#ffffff' }
    });

    stationCards.push({
      stationNum,
      stationId: st.stationId,
      allowedTeams: allowedTeamsText,
      locationHint: st.locationHint,
      qrCode: st.qrCode,
      scanUrl,
      dataUri,
      svg
    });

    console.log(`   ✓ Station ${stationNum} (${allowedTeamsText}) -> qrs/starting-stations/${baseFilename}.svg`);
  }

  // 2. Generate In-Game Challenge Station QRs
  console.log(`\n🎯 Generating 6 In-Game Challenge Station QR Codes...`);
  const gameNames = ['Hot & Cold', 'Numbers on Trees', 'Photo Game', 'Movie Game', 'Boat Game', 'Final Game'];
  const gameCards = [];

  for (const gName of gameNames) {
    const details = GAME_DETAILS[gName];
    const cleanName = gName.replace(/[^a-zA-Z0-9]/g, '-');

    const { svg, dataUri } = await generateQrWithLogo(details.qrCode, {
      color: { dark: '#2b0a07', light: '#ffffff' }
    });

    const svgPath = path.join(gamesDir, `${cleanName}.svg`);
    fs.writeFileSync(svgPath, svg, 'utf-8');

    const pngPath = path.join(gamesDir, `${cleanName}.png`);
    await QRCode.toFile(pngPath, details.qrCode, {
      width: 600,
      margin: 2,
      errorCorrectionLevel: 'H',
      color: { dark: '#2b0a07', light: '#ffffff' }
    });

    gameCards.push({
      name: gName,
      title: details.clueTitle,
      locationHint: details.crypticHint,
      qrCode: details.qrCode,
      dataUri,
      svg
    });

    console.log(`   ✓ ${gName} -> qrs/game-stations/${cleanName}.svg (Code: ${details.qrCode})`);
  }

  // 3. Create a beautiful printable HTML page for Starting Stations
  const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>THANIMA - 5 Starting Station QR Codes</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Lora:wght@700&family=Inter:wght@400;600;700&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Inter', sans-serif;
      background: #f4efe6;
      color: #2b0a07;
      padding: 30px;
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
      border-bottom: 3px double #fcc934;
      padding-bottom: 20px;
    }
    .header h1 {
      font-family: 'Lora', serif;
      font-size: 32px;
      letter-spacing: 2px;
      color: #2b0a07;
    }
    .header p {
      font-size: 14px;
      color: #555;
      margin-top: 5px;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(340px, 1fr));
      gap: 25px;
    }
    .card {
      background: #fff;
      border: 3px solid #fcc934;
      border-radius: 20px;
      padding: 24px;
      text-align: center;
      box-shadow: 0 8px 24px rgba(43, 10, 7, 0.08);
      page-break-inside: avoid;
    }
    .badge {
      display: inline-block;
      background: #2b0a07;
      color: #fcc934;
      font-size: 13px;
      font-weight: 700;
      letter-spacing: 1.5px;
      text-transform: uppercase;
      padding: 6px 16px;
      border-radius: 30px;
      margin-bottom: 12px;
    }
    .teams {
      font-size: 18px;
      font-weight: 800;
      color: #b30012;
      margin-bottom: 8px;
    }
    .hint {
      font-size: 13px;
      color: #444;
      font-style: italic;
      min-height: 38px;
      margin-bottom: 15px;
    }
    .qr-box {
      background: #fff;
      padding: 10px;
      border-radius: 16px;
      display: inline-block;
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
      margin-bottom: 12px;
      border: 1px solid #eee;
    }
    .qr-box img, .qr-box svg {
      width: 250px;
      height: 250px;
      display: block;
    }
    .instructions {
      font-size: 11px;
      color: #666;
      line-height: 1.4;
      margin-top: 8px;
    }
    .raw-code {
      font-family: monospace;
      font-size: 10px;
      background: #f7e3c0;
      padding: 4px 8px;
      border-radius: 6px;
      color: #2b0a07;
      margin-top: 6px;
      display: inline-block;
    }
    @media print {
      body { background: #fff; padding: 10px; }
      .card { page-break-inside: avoid; margin-bottom: 20px; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="no-print" style="margin-bottom: 15px;">
      <button onclick="window.print()" style="background: #2b0a07; color: #fcc934; border: 2px solid #fcc934; padding: 10px 24px; border-radius: 20px; font-weight: bold; cursor: pointer; font-size: 14px;">
        🖨️ Print All 5 Starting QR Cards
      </button>
    </div>
    <h1>THANIMA: NIDHIVETTA TREASURE HUNT</h1>
    <p>5 Starting Stations • 2 Teams Assigned Per Station • QR with Center Emblem</p>
  </div>

  <div class="grid">
    ${stationCards
      .map(
        (c) => `
    <div class="card">
      <div class="badge">Starting Station ${c.stationNum}</div>
      <div class="teams">${c.allowedTeams} ONLY</div>
      <div class="hint">${c.locationHint}</div>
      <div class="qr-box">
        <img src="${c.dataUri}" alt="Station ${c.stationNum} QR" />
      </div>
      <div class="instructions">
        Scan with your mobile camera to unlock your team gate.<br/>
        Enter your team code when prompted.
      </div>
      <div class="raw-code">Station ID: ${c.qrCode}</div>
    </div>`
      )
      .join('\n')}
  </div>
</body>
</html>`;

  const htmlPath = path.join(outputDir, 'print-starting-stations.html');
  fs.writeFileSync(htmlPath, htmlContent, 'utf-8');

  console.log(`\n======================================================`);
  console.log(`🎉 ALL QR CODES GENERATED SUCCESSFULLY WITH CENTER LOGO!`);
  console.log(`📄 Open in browser to print:`);
  console.log(`   file://${htmlPath}`);
  console.log(`======================================================\n`);
}

generateAll().catch(err => {
  console.error('Failed to generate QRs:', err);
});
