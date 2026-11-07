/**
 * Standalone Single-File Windows Installer & Portable Zip Packager
 * Packs entire Electron distribution into:
 * 1) ClassicWorld-POS-Setup.exe (Single-file self-extracting installer that auto-installs to %LOCALAPPDATA%\Programs, adds Desktop/Start Menu shortcuts & launches)
 * 2) ClassicWorld-POS-win-x64.zip (Single portable zip containing full runtime & all DLLs)
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

function buildInstaller(projectDir, appName, exeName) {
  const softwareDir = path.join(projectDir, "software");
  const publicDir = path.join(projectDir, "public");
  const sfxModule = "C:\\Users\\Windows\\scoop\\apps\\7zip\\26.00\\7z.sfx";

  if (!fs.existsSync(softwareDir)) {
    console.error(`Software directory not found at: ${softwareDir}`);
    return;
  }

  console.log(`\n======================================================`);
  console.log(`[Packager] Building Single-Pack Installer for: ${appName}`);
  console.log(`======================================================`);

  // 1. Create create-shortcuts.cmd inside softwareDir
  const shortcutScript = `@echo off
setlocal
set APP_DIR=%~dp0
set EXE_PATH=%APP_DIR%${exeName}

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$ws = New-Object -ComObject WScript.Shell; " ^
  "$desktop = [Environment]::GetFolderPath('Desktop'); " ^
  "$s1 = $ws.CreateShortcut(\\"$desktop\\${appName}.lnk\\"); " ^
  "$s1.TargetPath = \\"%EXE_PATH%\\"; " ^
  "$s1.WorkingDirectory = \\"%APP_DIR%\\"; " ^
  "$s1.IconLocation = \\"%EXE_PATH%,0\\"; " ^
  "$s1.Save(); " ^
  "$programs = [Environment]::GetFolderPath('Programs'); " ^
  "$s2 = $ws.CreateShortcut(\\"$programs\\${appName}.lnk\\"); " ^
  "$s2.TargetPath = \\"%EXE_PATH%\\"; " ^
  "$s2.WorkingDirectory = \\"%APP_DIR%\\"; " ^
  "$s2.IconLocation = \\"%EXE_PATH%,0\\"; " ^
  "$s2.Save();"

start "" "%EXE_PATH%"
exit
`;
  fs.writeFileSync(path.join(softwareDir, "create-shortcuts.cmd"), shortcutScript, "utf8");

  // 2. Create 7z SFX configuration file
  const sfxConfig = `;!@Install@!UTF-8!
Title="${appName} POS Setup"
BeginPrompt="Install ${appName} POS on your computer?"
Progress="yes"
InstallPath="%%LOCALAPPDATA%%\\\\Programs\\\\${appName.replace(/\s+/g, "")}"
RunProgram="create-shortcuts.cmd"
;!@InstallEnd@!
`;
  const configPath = path.join(projectDir, "_sfx_config.txt");
  fs.writeFileSync(configPath, sfxConfig, "utf8");

  // 3. Compress entire software directory into a 7z archive (excluding previous setup or zips)
  const archive7z = path.join(projectDir, "_package_temp.7z");
  if (fs.existsSync(archive7z)) fs.unlinkSync(archive7z);

  console.log(`[Packager] Compressing ${appName} software into 7z archive...`);
  execSync(`7z a -t7z -mx=5 "${archive7z}" "${softwareDir}\\*" -x!*-Setup.exe -x!*.zip`, { stdio: "inherit" });

  // 4. Combine 7z.sfx + config + archive -> Setup.exe natively via Node buffer concat!
  const setupExeName = `${exeName.replace(/\.exe$/i, "")}-Setup.exe`;
  const setupExePath = path.join(softwareDir, setupExeName);

  console.log(`[Packager] Creating single-file installer binary: ${setupExeName}...`);
  const sfxBuf = fs.readFileSync(sfxModule);
  const cfgBuf = fs.readFileSync(configPath);
  const archiveBuf = fs.readFileSync(archive7z);
  fs.writeFileSync(setupExePath, Buffer.concat([sfxBuf, cfgBuf, archiveBuf]));

  // Clean temp files
  if (fs.existsSync(configPath)) fs.unlinkSync(configPath);
  if (fs.existsSync(archive7z)) fs.unlinkSync(archive7z);

  // 5. Also build portable ZIP
  const zipName = `${exeName.replace(/\.exe$/i, "")}-win-x64.zip`;
  const zipPath = path.join(softwareDir, zipName);
  if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);

  console.log(`[Packager] Creating portable zip: ${zipName}...`);
  execSync(`7z a -tzip -mx=5 "${zipPath}" "${softwareDir}\\*" -x!*.zip`, { stdio: "inherit" });

  // 6. Copy to public directory for direct browser download
  if (fs.existsSync(publicDir)) {
    fs.copyFileSync(setupExePath, path.join(publicDir, setupExeName));
    fs.copyFileSync(zipPath, path.join(publicDir, zipName));
    console.log(`[Packager] Copied ${setupExeName} and ${zipName} to ${publicDir}`);
  }

  console.log(`[Packager] SUCCESS! Single-file installer ready at:`);
  console.log(`  ${setupExePath}`);
  console.log(`  Size: ${(fs.statSync(setupExePath).size / (1024 * 1024)).toFixed(2)} MB`);
}

// Build for Classic World
buildInstaller(
  "c:\\Users\\Windows\\Downloads\\dreamfashion\\Classic-World",
  "Classic World",
  "ClassicWorld-POS.exe"
);

// Build for Dream Fashion
buildInstaller(
  "c:\\Users\\Windows\\Downloads\\dreamfashion",
  "Dream Fashion",
  "DreamFashion-POS.exe"
);
