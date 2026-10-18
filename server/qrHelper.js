import QRCode from 'qrcode';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cache the base64 qr_image
let cachedLogoDataUri = null;

function getLogoDataUri() {
  if (cachedLogoDataUri) return cachedLogoDataUri;
  const candidates = [
    path.join(__dirname, '../public/qr_image.png'),
    path.join(__dirname, '../qr_image.png')
  ];

  for (const p of candidates) {
    if (fs.existsSync(p)) {
      const b64 = fs.readFileSync(p).toString('base64');
      cachedLogoDataUri = `data:image/png;base64,${b64}`;
      return cachedLogoDataUri;
    }
  }
  return '';
}

/**
 * Generate an SVG QR code with qr_image.png embedded in the center.
 * Uses High Error Correction (level 'H', 30% tolerance) so scanning is 100% reliable.
 */
export async function generateQrWithLogo(text, options = {}) {
  const {
    margin = 2,
    color = { dark: '#2b0a07', light: '#ffffff' }
  } = options;

  const rawSvg = await QRCode.toString(text, {
    type: 'svg',
    errorCorrectionLevel: 'H',
    margin,
    color
  });

  const logoUri = getLogoDataUri();
  if (!logoUri) {
    const dataUri = `data:image/svg+xml;utf8,${encodeURIComponent(rawSvg)}`;
    return { svg: rawSvg, dataUri };
  }

  // Extract viewBox dimensions
  const vbMatch = /viewBox=["']0 0 (\d+(\.\d+)?) (\d+(\.\d+)?)["']/.exec(rawSvg);
  const size = vbMatch ? parseFloat(vbMatch[1]) : 33;

  // Center logo takes 24% of the QR matrix
  const logoSize = +(size * 0.24).toFixed(2);
  const logoPos = +((size - logoSize) / 2).toFixed(2);
  const bgSize = +(logoSize + 0.8).toFixed(2);
  const bgPos = +((size - bgSize) / 2).toFixed(2);

  const centerOverlay = `
  <g id="center-logo">
    <rect x="${bgPos}" y="${bgPos}" width="${bgSize}" height="${bgSize}" fill="#ffffff" rx="1.2" stroke="${color.dark}" stroke-width="0.35" />
    <image href="${logoUri}" x="${logoPos}" y="${logoPos}" width="${logoSize}" height="${logoSize}" preserveAspectRatio="xMidYMid meet" />
  </g>
</svg>`;

  const finalSvg = rawSvg.replace('</svg>', centerOverlay);
  const base64Svg = Buffer.from(finalSvg).toString('base64');
  const dataUri = `data:image/svg+xml;base64,${base64Svg}`;

  return {
    svg: finalSvg,
    dataUri
  };
}
