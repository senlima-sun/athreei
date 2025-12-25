# athreei Uninstall Script for Windows
#
# This script removes athreei components from your system.
#
# Usage:
#   .\uninstall.ps1 [-All]
#
# Options:
#   -All    Also remove user data

param(
    [switch]$All
)

$ErrorActionPreference = "Stop"

# Configuration
$HostName = "com.athreei.native_host"
$InstallDir = "$env:APPDATA\athreei"
$UserDataDir = "$env:USERPROFILE\.athreei"

Write-Host ""
Write-Host "athreei Uninstaller" -ForegroundColor Cyan
Write-Host "==================="
Write-Host ""

# Confirmation
Write-Host "This will remove:" -ForegroundColor Yellow
Write-Host "  - Native messaging host binary"
Write-Host "  - Native messaging registry entries"
if ($All) {
    Write-Host "  - User data directory ($UserDataDir)"
}
Write-Host ""
$confirm = Read-Host "Continue? [y/N]"

if ($confirm -notmatch "^[Yy]$") {
    Write-Host "Aborted."
    exit 0
}

Write-Host ""

# Remove native host binary
Write-Host "Removing native host binary..."
if (Test-Path $InstallDir) {
    Remove-Item -Path $InstallDir -Recurse -Force
    Write-Host "✓ Removed: $InstallDir" -ForegroundColor Green
} else {
    Write-Host "⚠ Not found: $InstallDir" -ForegroundColor Yellow
}

# Remove native messaging registry entries
Write-Host ""
Write-Host "Removing native messaging registry entries..."

$registryPaths = @(
    "HKCU:\Software\Google\Chrome\NativeMessagingHosts\$HostName",
    "HKCU:\Software\Microsoft\Edge\NativeMessagingHosts\$HostName",
    "HKCU:\Software\BraveSoftware\Brave-Browser\NativeMessagingHosts\$HostName"
)

$browserNames = @("Chrome", "Edge", "Brave")

for ($i = 0; $i -lt $registryPaths.Count; $i++) {
    $path = $registryPaths[$i]
    $browser = $browserNames[$i]

    if (Test-Path $path) {
        Remove-Item -Path $path -Force
        Write-Host "✓ Removed $browser registry entry" -ForegroundColor Green
    } else {
        Write-Host "⚠ $browser registry entry not found" -ForegroundColor Yellow
    }
}

# Remove user data (if requested)
if ($All) {
    Write-Host ""
    Write-Host "Removing user data..."
    if (Test-Path $UserDataDir) {
        Remove-Item -Path $UserDataDir -Recurse -Force
        Write-Host "✓ Removed: $UserDataDir" -ForegroundColor Green
    } else {
        Write-Host "⚠ Not found: $UserDataDir" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "Uninstallation complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Remaining manual steps:"
Write-Host "  1. Remove the Chrome/Edge extension from browser settings"
Write-Host "  2. Remove athreei from Claude Desktop config (if configured)"
Write-Host "  3. Delete the project directory (if desired)"
Write-Host ""
