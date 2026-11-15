import sharp from 'sharp';
import { mkdirSync } from 'node:fs';

mkdirSync('public/icons', { recursive: true });

const svg = (size) => `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#FAF8F4"/>
      <stop offset="1" stop-color="#F1ECE2"/>
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" rx="${size * 0.22}" fill="url(#bg)"/>
  <circle cx="${size/2}" cy="${size/2}" r="${size*0.34}" fill="none" stroke="#A8813C" stroke-width="${size*0.045}"/>
  <text x="50%" y="56%" text-anchor="middle" dominant-baseline="middle"
        font-family="Georgia, 'Times New Roman', serif" font-weight="700"
        font-size="${size*0.42}" fill="#A8813C">D</text>
</svg>`;

const jobs = [
  { size: 192, out: 'public/icons/icon-192.png' },
  { size: 512, out: 'public/icons/icon-512.png' },
  { size: 180, out: 'public/icons/apple-touch-icon.png' },
  { size: 32, out: 'public/favicon.png' },
];

for (const j of jobs) {
  await sharp(Buffer.from(svg(j.size))).png({ compressionLevel: 9 }).toFile(j.out);
  console.log('wrote', j.out);
}
