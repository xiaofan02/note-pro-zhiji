import path from "node:path";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

// Ensure Vite disables PWA plugin for Tauri build (VITE_PWA is checked as a string).
process.env.VITE_PWA = "false";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");

const npmCmd = process.platform === "win32" ? "npm.cmd" : "npm";
try {
  execSync(`${npmCmd} run build`, {
    stdio: "inherit",
    cwd: repoRoot,
    env: process.env,
    shell: true,
  });
} catch (err) {
  console.error("Frontend build failed.");
  console.error(err);
  process.exit(1);
}

