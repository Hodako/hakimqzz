Write-Host "Building HakimQzz Android APK..." -ForegroundColor Cyan
Push-Location android-app
try {
    .\gradlew.bat assembleDebug
    if ($LASTEXITCODE -eq 0) {
        $apkPath = Get-ChildItem -Path "app\build\outputs\apk\debug\*.apk" | Select-Object -First 1
        if ($apkPath) {
            Copy-Item $apkPath.FullName -Destination "..\hakimqzz-pos.apk" -Force
            Write-Host "SUCCESS: APK created at: $(Get-Location)\..\hakimqzz-pos.apk" -ForegroundColor Green
        }
    } else {
        Write-Host "Gradle build returned exit code $LASTEXITCODE" -ForegroundColor Yellow
    }
} finally {
    Pop-Location
}
