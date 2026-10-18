import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { BOAT_GAME_QUESTIONS } from '../server/scheduleData.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const outputDir = path.join(__dirname, '..', 'qrs');
fs.mkdirSync(outputDir, { recursive: true });

console.log(`\n======================================================`);
console.log(`🛶 GENERATING 20 BOAT TAGS (10 Question + 10 Answer Boats)`);
console.log(`======================================================\n`);

const questionBoats = BOAT_GAME_QUESTIONS.map((bq) => ({
  boatNumber: bq.questionBoatNumber || bq.teamNumber,
  type: 'QUESTION_BOAT',
  teamNumber: bq.teamNumber,
  code: bq.questionCode,
  title: `Question Boat #${bq.questionBoatNumber || bq.teamNumber}`,
  subtitle: 'Open to ANY Team (First-Come, First-Served)',
  instruction: 'Enter this 6-character code in your app to lock this Question Boat to your team and reveal your Challenge Question.',
  badgeColor: '#b30012',
  codeColor: '#fcc934',
  questionSnippet: bq.question
}));

const answerBoats = BOAT_GAME_QUESTIONS.map((bq) => ({
  boatNumber: bq.answerBoatNumber || (bq.teamNumber + 10),
  type: 'ANSWER_BOAT',
  teamNumber: bq.teamNumber,
  code: bq.answerCode || bq.code,
  title: `Answer Boat #${bq.answerBoatNumber || (bq.teamNumber + 10)}`,
  answerText: bq.answer,
  instruction: 'If this boat displays the correct answer to your question, enter this code in your app!',
  badgeColor: '#065f46',
  codeColor: '#10b981'
}));

const all20Boats = [...questionBoats, ...answerBoats];

const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>THANIMA - 20 Boat Fleet Tags</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Lora:wght@700&family=Inter:wght@400;600;700;800&family=JetBrains+Mono:wght@700;800&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Inter', sans-serif;
      background: #f4efe6;
      color: #2b0a07;
      padding: 30px;
    }
    .header {
      text-align: center;
      margin-bottom: 25px;
      border-bottom: 3px double #fcc934;
      padding-bottom: 20px;
    }
    .header h1 {
      font-family: 'Lora', serif;
      font-size: 28px;
      letter-spacing: 1.5px;
      color: #2b0a07;
    }
    .header p {
      font-size: 13px;
      color: #666;
      margin-top: 4px;
    }
    .section-title {
      font-family: 'Lora', serif;
      font-size: 20px;
      font-weight: 700;
      color: #2b0a07;
      margin: 25px 0 15px 0;
      border-left: 5px solid #b30012;
      padding-left: 12px;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
      gap: 20px;
      margin-bottom: 30px;
    }
    .boat-card {
      background: #ffffff;
      border: 3px solid #fcc934;
      border-radius: 18px;
      padding: 20px;
      text-align: center;
      box-shadow: 0 6px 18px rgba(43, 10, 7, 0.08);
      page-break-inside: avoid;
      position: relative;
    }
    .boat-card.answer-card {
      border-color: #059669;
    }
    .boat-badge {
      display: inline-block;
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 1.5px;
      text-transform: uppercase;
      padding: 5px 14px;
      border-radius: 20px;
      margin-bottom: 8px;
      color: #fff;
    }
    .badge-q {
      background: #b30012;
    }
    .badge-a {
      background: #047857;
    }
    .boat-num {
      font-family: 'Lora', serif;
      font-size: 22px;
      font-weight: 700;
      color: #2b0a07;
      margin-bottom: 4px;
    }
    .answer-display {
      font-size: 18px;
      font-weight: 800;
      color: #065f46;
      background: #ecfdf5;
      border: 2px dashed #059669;
      border-radius: 12px;
      padding: 10px 14px;
      margin: 10px 0;
      line-height: 1.3;
    }
    .code-box {
      background: #2b0a07;
      border: 2px solid #fcc934;
      border-radius: 14px;
      padding: 12px;
      margin: 12px 0;
    }
    .code-label {
      font-size: 9px;
      font-weight: 700;
      letter-spacing: 2px;
      text-transform: uppercase;
      color: #f7e3c0;
      display: block;
      margin-bottom: 2px;
    }
    .code-value {
      font-family: 'JetBrains Mono', monospace;
      font-size: 32px;
      font-weight: 800;
      letter-spacing: 6px;
      color: #fcc934;
    }
    .answer-card .code-box {
      border-color: #10b981;
    }
    .answer-card .code-value {
      color: #34d399;
    }
    .instructions {
      font-size: 11px;
      color: #555;
      line-height: 1.4;
      margin-top: 6px;
    }
    @media print {
      body { background: #fff; padding: 10px; }
      .boat-card { page-break-inside: avoid; margin-bottom: 15px; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="no-print" style="margin-bottom: 15px;">
      <button onclick="window.print()" style="background: #2b0a07; color: #fcc934; border: 2px solid #fcc934; padding: 10px 24px; border-radius: 20px; font-weight: bold; cursor: pointer; font-size: 14px;">
        🖨️ Print All 20 Physical Boat Tags
      </button>
    </div>
    <h1>THANIMA: VALLAMKALI 20-BOAT FLEET TAGS</h1>
    <p>10 Question Boats (Boats 1–10) • 10 Answer Boats (Boats 11–20) • 20 Unique Codes</p>
  </div>

  <h2 class="section-title">📍 PART 1: 10 Question Boats (Attach to Boats 1 to 10)</h2>
  <div class="grid">
    ${questionBoats
      .map(
        (b) => `
    <div class="boat-card">
      <span class="boat-badge badge-q">QUESTION VESSEL</span>
      <div class="boat-num">Boat #${b.boatNumber}</div>
      <p style="font-size: 12px; font-weight: 700; color: #b30012;">Open to ANY Team (First Come, First Served)</p>

      <div class="code-box">
        <span class="code-label">Question Code</span>
        <div class="code-value">${b.code}</div>
      </div>

      <p class="instructions">
        <strong>Any Team:</strong> Enter this 6-character code in your app to lock this Question Boat to your team and reveal your challenge question!
      </p>
    </div>`
      )
      .join('\n')}
  </div>

  <h2 class="section-title">🎯 PART 2: 10 Answer Boats (Attach to Boats 11 to 20)</h2>
  <div class="grid">
    ${answerBoats
      .map(
        (b) => `
    <div class="boat-card answer-card">
      <span class="boat-badge badge-a">ANSWER VESSEL</span>
      <div class="boat-num">Boat #${b.boatNumber}</div>

      <div class="answer-display">
        ${b.answerText}
      </div>

      <div class="code-box">
        <span class="code-label">Answer Verification Code</span>
        <div class="code-value">${b.code}</div>
      </div>

      <p class="instructions">
        If this boat matches your question's answer, enter this 6-character code in your app to solve the challenge!
      </p>
    </div>`
      )
      .join('\n')}
  </div>
</body>
</html>`;

const filePath = path.join(outputDir, 'print-boat-tags.html');
fs.writeFileSync(filePath, html, 'utf-8');

// Also write to public/qrs for Vite dev server static serving
const publicQrsDir = path.join(__dirname, '..', 'public', 'qrs');
fs.mkdirSync(publicQrsDir, { recursive: true });
fs.writeFileSync(path.join(publicQrsDir, 'print-boat-tags.html'), html, 'utf-8');

console.log(`✓ Generated 20 boat tags in: ${filePath} & public/qrs/print-boat-tags.html`);
console.log(`\n======================================================`);
console.log(`📋 SUMMARY OF 20 FLEET CODES:`);
console.log(`======================================================`);
BOAT_GAME_QUESTIONS.forEach((bq) => {
  console.log(`Team ${bq.teamNumber}:`);
  console.log(`   Question Boat #${bq.questionBoatNumber || bq.teamNumber} Code: [ ${bq.questionCode} ]`);
  console.log(`   Answer   Boat #${bq.answerBoatNumber || (bq.teamNumber + 10)} Code: [ ${bq.answerCode || bq.code} ] -> "${bq.answer}"`);
});
console.log(`======================================================\n`);
