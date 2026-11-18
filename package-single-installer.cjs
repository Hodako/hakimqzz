const { execSync } = require("child_process");
const path = require("path");
const fs = require("fs");

const projectDir = path.resolve(__dirname);
const appName = "Dream Fashion POS";
const exeName = "DreamFashion-POS.exe";
const softwareDir = path.join(projectDir, "software");
const iconPath = path.join(projectDir, "public", "favicon.ico");
const setupExeName = "DreamFashion-POS-Setup.exe";

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

if (!fs.existsSync(softwareDir)) {
  console.error(`[Installer] ERROR: Software directory not found at: ${softwareDir}`);
  process.exit(1);
}

// 1. Prepare Inno Setup Script for Dream Fashion
const issPath = path.join(projectDir, "DreamFashion.iss");
const issContent = `; Inno Setup Script for Dream Fashion POS
#define MyAppName "Dream Fashion POS"
#define MyAppVersion "2.5.2"
#define MyAppPublisher "Dream Fashion"
#define MyAppURL "https://hakim.qzz.io"
#define MyAppExeName "${exeName}"

[Setup]
AppId={{8E4C7B21-A93D-4F1E-9C52-3F4A8E7D1B99}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
AppSupportURL={#MyAppURL}
AppUpdatesURL={#MyAppURL}
DefaultDirName={localappdata}\\Programs\\DreamFashion
DefaultGroupName=Dream Fashion
DisableProgramGroupPage=yes
OutputDir=${softwareDir.replace(/\\/g, "\\\\")}
OutputBaseFilename=DreamFashion-POS-Setup
SetupIconFile=${iconPath.replace(/\\/g, "\\\\")}
Compression=lzma2/ultra64
SolidCompression=yes
WizardStyle=modern
PrivilegesRequired=lowest
UninstallDisplayIcon={app}\\favicon.ico
UninstallDisplayName=Dream Fashion POS
CloseApplications=force

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"

[Files]
Source: "${softwareDir.replace(/\\/g, "\\\\")}\\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs; Excludes: "*-Setup.exe,*.zip,*.iss"

[Icons]
Name: "{autoprograms}\\Dream Fashion POS"; Filename: "{app}\\{#MyAppExeName}"; IconFilename: "{app}\\favicon.ico"
Name: "{autodesktop}\\Dream Fashion"; Filename: "{app}\\{#MyAppExeName}"; IconFilename: "{app}\\favicon.ico"; Tasks: desktopicon

[Run]
Filename: "{app}\\{#MyAppExeName}"; Description: "{cm:LaunchProgram,Dream Fashion POS}"; Flags: nowait postinstall skipifsilent
`;

fs.writeFileSync(issPath, issContent, "utf8");

// Remove any existing setup exe
const existingSetup = path.join(softwareDir, setupExeName);
if (fs.existsSync(existingSetup)) {
  try { fs.unlinkSync(existingSetup); } catch (_) {}
}

console.log("[Installer] Compiling standalone Windows Inno Setup installer for Dream Fashion...");
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

// Copy setup exe to root downloads directory
const downloadsDir = path.resolve(__dirname, "downloads");
if (fs.existsSync(downloadsDir)) {
  fs.copyFileSync(setupExePath, path.join(downloadsDir, setupExeName));
  fs.copyFileSync(setupExePath, path.join(downloadsDir, "DreamFashion-POS.exe"));
  console.log(`[Installer] Copied installer to ${downloadsDir}`);
}

const rootPublicDir = path.resolve(__dirname, "public");
if (fs.existsSync(rootPublicDir)) {
  try {
    fs.copyFileSync(setupExePath, path.join(rootPublicDir, setupExeName));
    console.log(`[Installer] Copied installer to ${rootPublicDir}`);
  } catch (_) {}
}

// 2. Generate portable ZIP directly into downloads
const zipName = "DreamFashion-POS-win-x64.zip";
const destZipPath = path.join(downloadsDir, zipName);
if (fs.existsSync(destZipPath)) {
  try { fs.unlinkSync(destZipPath); } catch (_) {}
}

try {
  console.log(`[Installer] Creating portable zip directly in downloads: ${zipName}...`);
  execSync(`7z a -tzip -mx=3 "${destZipPath}" "${softwareDir}\\*" -x!*-Setup.exe -x!*.zip`, { stdio: "inherit" });
  console.log(`[Installer] Portable zip generated successfully at: ${destZipPath}`);
} catch (zipErr) {
  console.warn(`[Installer] Portable zip warning:`, zipErr.message);
}

console.log(`\n======================================================`);
console.log(`SUCCESS! Proper Windows Dream Fashion POS installer created!`);
console.log(`  Path: ${setupExePath}`);
console.log(`  Size: ${(fs.statSync(setupExePath).size / (1024 * 1024)).toFixed(2)} MB`);
console.log(`======================================================\n`);
