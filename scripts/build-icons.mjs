/**
 * Rasterizes icon-source.svg to a 1024 PNG and runs `tauri icon` to refresh bundle assets.
 * Usage: npm run icons:build
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { execSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const svgPath = join(root, "src-tauri", "icons", "icon-source.svg");
const outPng = join(root, "src-tauri", "icons", "icon-1024.png");

async function main() {
  const sharp = (await import("sharp")).default;
  const svg = readFileSync(svgPath);
  await sharp(svg).resize(1024, 1024).png().toFile(outPng);
  console.log("Wrote", outPng);
  execSync(`npx tauri icon "${outPng}"`, { cwd: root, stdio: "inherit" });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
