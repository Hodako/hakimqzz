const { execSync } = require("child_process");
const path = require("path");
const fs = require("fs");

const projectDir = path.resolve(__dirname);
const appName = "Classic World POS";
const exeName = "ClassicWorld-POS.exe";
const softwareDir = path.join(projectDir, "software");
const iconPath = path.join(projectDir, "public", "favicon.ico");
const setupExeName = "ClassicWorld-POS-Setup.exe";

function findIscc() {
  const candidates = [
    path.join(process.env.LOCALAPPDATA || "", "Programs", "Inno Setup 6", "ISCC.exe"),
    "C:\\Program Files (x86)\\Inno Setup 6\\ISCC.exe",
    "C:\\Program Files\\Inno Setup 6\\ISCC.exe",
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return null;
}

const isccExe = findIscc();
if (!isccExe) {
  console.error("[Installer] ERROR: Inno Setup 6 (ISCC.exe) not found!");
  process.exit(1);
}
console.log(`[Installer] Using Inno Setup Compiler at: ${isccExe}`);

// 1. Prepare Inno Setup Script
const issPath = path.join(projectDir, "ClassicWorld.iss");
const issContent = `; Inno Setup Script for Classic World POS
#define MyAppName "Classic World POS"
#define MyAppVersion "2.5.2"
#define MyAppPublisher "Classic World"
#define MyAppURL "https://classicworld-pos.web.app"
#define MyAppExeName "${exeName}"

[Setup]
AppId={{5D01E17F-A882-4B6A-8A4E-7EB53F38B901}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
AppSupportURL={#MyAppURL}
AppUpdatesURL={#MyAppURL}
DefaultDirName={localappdata}\\Programs\\ClassicWorld
DefaultGroupName=Classic World
DisableProgramGroupPage=yes
OutputDir=${softwareDir.replace(/\\/g, "\\\\")}
OutputBaseFilename=ClassicWorld-POS-Setup
SetupIconFile=${iconPath.replace(/\\/g, "\\\\")}
Compression=lzma2/ultra64
SolidCompression=yes
WizardStyle=modern
PrivilegesRequired=lowest
UninstallDisplayIcon={app}\\favicon.ico
UninstallDisplayName=Classic World POS
CloseApplications=force

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"

[Files]
Source: "${softwareDir.replace(/\\/g, "\\\\")}\\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs; Excludes: "*-Setup.exe,*.zip,*.iss"

[Icons]
Name: "{autoprograms}\\Classic World POS"; Filename: "{app}\\{#MyAppExeName}"; IconFilename: "{app}\\favicon.ico"
Name: "{autodesktop}\\Classic World"; Filename: "{app}\\{#MyAppExeName}"; IconFilename: "{app}\\favicon.ico"; Tasks: desktopicon

[Run]
Filename: "{app}\\{#MyAppExeName}"; Description: "{cm:LaunchProgram,Classic World POS}"; Flags: nowait postinstall skipifsilent
`;

fs.writeFileSync(issPath, issContent, "utf8");

// Remove any old setup exe in software
const existingSetup = path.join(softwareDir, setupExeName);
if (fs.existsSync(existingSetup)) {
  try { fs.unlinkSync(existingSetup); } catch (_) {}
}

console.log("[Installer] Compiling standalone Windows Inno Setup installer...");
try {
  execSync(`"${isccExe}" "${issPath}"`, { stdio: "inherit" });
  console.log("[Installer] Setup compilation successful!");
} finally {
  if (fs.existsSync(issPath)) {
    try { fs.unlinkSync(issPath); } catch (_) {}
  }
}

const setupExePath = path.join(softwareDir, setupExeName);
if (!fs.existsSync(setupExePath)) {
  console.error(`[Installer] ERROR: ${setupExePath} was not generated!`);
  process.exit(1);
}

// Copy setup exe to root downloads and public directories
const downloadsDir = path.resolve(__dirname, "..", "downloads");
if (fs.existsSync(downloadsDir)) {
  const destSetup = path.join(downloadsDir, setupExeName);
  const destAlias = path.join(downloadsDir, "ClassicWorld-POS.exe");
  try { if (fs.existsSync(destSetup)) fs.unlinkSync(destSetup); } catch (_) {}
  try { if (fs.existsSync(destAlias)) fs.unlinkSync(destAlias); } catch (_) {}
  fs.copyFileSync(setupExePath, destSetup);
  fs.copyFileSync(setupExePath, destAlias);
  console.log(`[Installer] Copied installer to ${downloadsDir}`);
}

const rootPublicDir = path.resolve(__dirname, "..", "public");
if (fs.existsSync(rootPublicDir)) {
  try {
    const destSetup = path.join(rootPublicDir, setupExeName);
    const destAlias = path.join(rootPublicDir, "ClassicWorld-POS.exe");
    try { if (fs.existsSync(destSetup)) fs.unlinkSync(destSetup); } catch (_) {}
    try { if (fs.existsSync(destAlias)) fs.unlinkSync(destAlias); } catch (_) {}
    fs.copyFileSync(setupExePath, destSetup);
    fs.copyFileSync(setupExePath, destAlias);
    console.log(`[Installer] Copied installer to ${rootPublicDir}`);
  } catch (_) {}
}

// 2. Generate portable ZIP
const zipName = "ClassicWorld-POS-win-x64.zip";
const zipPath = path.join(softwareDir, zipName);
if (fs.existsSync(zipPath)) {
  try { fs.unlinkSync(zipPath); } catch (_) {}
}

try {
  console.log(`[Installer] Creating portable zip: ${zipName}...`);
  execSync(`7z a -tzip -mx=3 "${zipPath}" "${softwareDir}\\*" -x!*-Setup.exe -x!*.zip`, { stdio: "inherit" });
  if (fs.existsSync(downloadsDir) && fs.existsSync(zipPath)) {
    const destZip = path.join(downloadsDir, zipName);
    try { if (fs.existsSync(destZip)) fs.unlinkSync(destZip); } catch (_) {}
    fs.copyFileSync(zipPath, destZip);
    console.log(`[Installer] Copied zip to ${downloadsDir}`);
  }
  if (fs.existsSync(rootPublicDir) && fs.existsSync(zipPath)) {
    try {
      const destZip = path.join(rootPublicDir, zipName);
      try { if (fs.existsSync(destZip)) fs.unlinkSync(destZip); } catch (_) {}
      fs.copyFileSync(zipPath, destZip);
      console.log(`[Installer] Copied zip to ${rootPublicDir}`);
    } catch (_) {}
  }
  if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);
} catch (zipErr) {
  console.warn(`[Installer] Portable zip warning:`, zipErr.message);
}

console.log(`\n======================================================`);
console.log(`SUCCESS! Proper Windows Classic World POS installer created!`);
console.log(`  Path: ${setupExePath}`);
console.log(`  Size: ${(fs.statSync(setupExePath).size / (1024 * 1024)).toFixed(2)} MB`);
console.log(`======================================================\n`);
