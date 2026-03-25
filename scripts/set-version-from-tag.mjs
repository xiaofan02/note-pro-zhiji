import fs from "fs";
import path from "path";

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + "\n", "utf8");
}

function updateCargoToml(cargoPath, version) {
  const cargo = fs.readFileSync(cargoPath, "utf8");
  const updated = cargo.replace(/^version\s*=\s*".*?"\s*$/m, `version = "${version}"`);
  if (updated === cargo) {
    throw new Error(`Failed to update Cargo.toml version in ${cargoPath}`);
  }
  fs.writeFileSync(cargoPath, updated, "utf8");
}

const tag = process.env.GITHUB_REF_NAME || "";
const version = tag.startsWith("v") ? tag.slice(1) : tag;

if (!version) {
  throw new Error(`GITHUB_REF_NAME is empty. Got tag: "${tag}"`);
}

const repoRoot = process.cwd();

// Keep Tauri updater (Rust) + frontend (PWA/assets) versions in sync.
writeJson(path.join(repoRoot, "package.json"), {
  ...readJson(path.join(repoRoot, "package.json")),
  version,
});

writeJson(path.join(repoRoot, "src-tauri", "tauri.conf.json"), {
  ...readJson(path.join(repoRoot, "src-tauri", "tauri.conf.json")),
  version,
});

updateCargoToml(path.join(repoRoot, "src-tauri", "Cargo.toml"), version);

console.log(`Updated versions from tag ${tag} -> ${version}`);

