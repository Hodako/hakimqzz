/**
 * Packager script to produce standalone Windows Desktop POS Executable / Package
 * Builds self-contained ClassicWorld-POS-win-x64
 */

const fs = require("fs");
const path = require("path");

const rootDir = __dirname;
const localElectron = path.join(rootDir, "node_modules", "electron", "dist");
const parentElectron = path.join(rootDir, "..", "node_modules", "electron", "dist");
const electronDistDir = fs.existsSync(localElectron) ? localElectron : parentElectron;
const oldDistDir = path.join(rootDir, "dist-electron");
const outputDir = path.join(rootDir, "software");
const resourcesAppDir = path.join(outputDir, "resources", "app");

console.log("[Electron Packager] Starting fresh standalone Windows package creation in Classic-World/software...");

if (!fs.existsSync(electronDistDir)) {
  console.error("[Electron Packager] ERROR: electron/dist not found!");
  process.exit(1);
}

// 0. Completely remove old dist-electron and software folders for a clean build
if (fs.existsSync(oldDistDir)) {
  console.log("[Electron Packager] Removing legacy dist-electron...");
  fs.rmSync(oldDistDir, { recursive: true, force: true });
}
if (fs.existsSync(outputDir)) {
  console.log("[Electron Packager] Cleaning old software directory for clean rebuild...");
  try {
    const items = fs.readdirSync(outputDir);
    for (const item of items) {
      const p = path.join(outputDir, item);
      try {
        fs.rmSync(p, { recursive: true, force: true });
      } catch (rmErr) {
        console.warn(`[Electron Packager] Notice: could not remove ${item}:`, rmErr.message);
      }
    }
  } catch (e) {
    console.warn("[Electron Packager] Notice: could not list items in software:", e.message);
  }
}

// 1. Create fresh output directory
fs.mkdirSync(outputDir, { recursive: true });

// 2. Copy all electron dist files fresh
function copyDir(src, dest, skipInstallers = false) {
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    if (
      skipInstallers &&
      (entry.name.endsWith(".exe") ||
        entry.name.endsWith(".zip") ||
        entry.name.endsWith(".7z") ||
        entry.name.endsWith(".apk"))
    ) {
      continue;
    }
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath, skipInstallers);
    } else {
      try {
        fs.copyFileSync(srcPath, destPath);
      } catch (err) {
        console.warn(`[Electron Packager] Warning copying ${entry.name}:`, err.message);
      }
    }
  }
}

console.log("[Electron Packager] Copying fresh Electron Windows binaries...");
copyDir(electronDistDir, outputDir, false);

// 3. Rename electron.exe to ClassicWorld-POS.exe
const defaultExe = path.join(outputDir, "electron.exe");
const targetExe = path.join(outputDir, "ClassicWorld-POS.exe");
if (fs.existsSync(defaultExe)) {
  try {
    if (fs.existsSync(targetExe)) {
      try { fs.unlinkSync(targetExe); } catch (_) {}
    }
    fs.renameSync(defaultExe, targetExe);
    console.log("[Electron Packager] Renamed electron.exe -> ClassicWorld-POS.exe");
  } catch (err) {
    try {
      if (!fs.existsSync(targetExe)) {
        fs.copyFileSync(defaultExe, targetExe);
      }
      try { fs.unlinkSync(defaultExe); } catch (_) {}
      console.log("[Electron Packager] Handled electron.exe -> ClassicWorld-POS.exe");
    } catch (e2) {
      console.warn("[Electron Packager] Warning on executable rename:", e2.message);
    }
  }
} else if (fs.existsSync(targetExe)) {
  console.log("[Electron Packager] ClassicWorld-POS.exe is ready.");
} else {
  console.error("[Electron Packager] ERROR: ClassicWorld-POS.exe not found in software directory!");
  process.exit(1);
}

// 4. Create fresh resources/app
fs.mkdirSync(resourcesAppDir, { recursive: true });
fs.mkdirSync(path.join(resourcesAppDir, "electron"), { recursive: true });

const embeddedPackageJson = {
  name: "classicworld-pos",
  version: "2.5.2",
  main: "electron/main.cjs",
  description: "Classic World Ultimate Windows POS Terminal",
};
fs.writeFileSync(
  path.join(resourcesAppDir, "package.json"),
  JSON.stringify(embeddedPackageJson, null, 2),
  "utf8"
);

// Copy updated electron scripts
const electronFiles = ["main.cjs", "preload.cjs", "pos-bridge.cjs", "error.html"];
for (const file of electronFiles) {
  const src = path.join(rootDir, "electron", file);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, path.join(resourcesAppDir, "electron", file));
  }
}

// Copy public assets if available
if (fs.existsSync(path.join(rootDir, "public"))) {
  copyDir(path.join(rootDir, "public"), path.join(resourcesAppDir, "public"), true);
  if (fs.existsSync(path.join(rootDir, "public", "favicon.ico"))) {
    fs.copyFileSync(path.join(rootDir, "public", "favicon.ico"), path.join(outputDir, "favicon.ico"));
  }
}

// Copy static export out if available
const outDir = path.join(rootDir, "out");
if (fs.existsSync(outDir)) {
  console.log("[Electron Packager] Bundling latest out/ into resources/app/out for offline support...");
  copyDir(outDir, path.join(resourcesAppDir, "out"), true);
}

console.log("[Electron Packager] SUCCESS: Brand new Standalone Windows POS app packaged at:");
console.log(`  ${targetExe}`);
