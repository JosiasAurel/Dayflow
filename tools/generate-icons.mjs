import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const projectRoot = path.resolve(process.cwd());
const srcSvg = path.join(projectRoot, 'src-tauri', 'icons', 'dayflow.svg');
const outDir = path.join(projectRoot, 'src-tauri', 'icons');

const targets = [
  { name: '32x32.png', size: 32 },
  { name: '128x128.png', size: 128 },
  { name: '128x128@2x.png', size: 256 },
  { name: 'icon.png', size: 512 },
];

async function ensureSvgExists() {
  try {
    await fs.access(srcSvg);
  } catch {
    throw new Error(`Source SVG not found at ${srcSvg}`);
  }
}

async function generate() {
  await ensureSvgExists();
  const svgBuffer = await fs.readFile(srcSvg);
  await fs.mkdir(outDir, { recursive: true });

  for (const t of targets) {
    const outPath = path.join(outDir, t.name);
    const img = sharp(svgBuffer, { density: 384 })
      .resize(t.size, t.size, { fit: 'cover' })
      .png({ compressionLevel: 9, adaptiveFiltering: true });
    await img.toFile(outPath);
    console.log('Wrote', outPath);
  }
}

generate().catch((e) => {
  console.error(e);
  process.exit(1);
});


