Write-Host "Building HakimQzz Android APK..." -ForegroundColor Cyan

if (-not $env:JAVA_HOME -or -not (Test-Path "$env:JAVA_HOME\bin\javac.exe")) {
    $jdkPaths = @(
        "C:\Users\Windows\.antigravity\extensions\redhat.java-1.56.0-win32-x64\jre\21.0.12.1-win32-x86_64",
        "C:\Users\Windows\.gradle\jdks\eclipse_adoptium-17-amd64-windows.2"
    )
    foreach ($path in $jdkPaths) {
        if (Test-Path "$path\bin\javac.exe") {
            $env:JAVA_HOME = $path
            $env:Path = "$path\bin;" + $env:Path
            Write-Host "Using JDK at: $path" -ForegroundColor Green
            break
        }
    }
}

Push-Location android-app
try {
    .\gradlew.bat assembleDebug --no-daemon
    if ($LASTEXITCODE -eq 0) {
        $apkPath = Get-ChildItem -Path "app\build\outputs\apk\release\*.apk" | Select-Object -First 1
        if (-not $apkPath) {
            $apkPath = Get-ChildItem -Path "app\build\outputs\apk\debug\*.apk" | Select-Object -First 1
        }
        if ($apkPath) {
            Copy-Item $apkPath.FullName -Destination "..\public\hakimqzz-sms-gateway.apk" -Force
            Copy-Item $apkPath.FullName -Destination "..\hakimqzz-sms-gateway.apk" -Force
            Copy-Item $apkPath.FullName -Destination "..\hakimqzz-pos.apk" -Force
            Copy-Item $apkPath.FullName -Destination "..\dream_v3.apk" -Force
            Copy-Item $apkPath.FullName -Destination "..\dreamFashion.apk" -Force
            Copy-Item $apkPath.FullName -Destination "..\dreamfashion-live.apk" -Force
            Write-Host "SUCCESS: APK created and copied to public/hakimqzz-sms-gateway.apk and root." -ForegroundColor Green
        }
    } else {
        Write-Host "Gradle build returned exit code $LASTEXITCODE" -ForegroundColor Yellow
    }
} finally {
    Pop-Location
}

