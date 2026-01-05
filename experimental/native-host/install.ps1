# athreei Native Host Installation Script for Windows
#
# This script installs the athreei native messaging host for Chrome-based browsers.
#
# Usage:
#   .\install.ps1 [-ExtensionId <id>] [-Browser <browser>] [-Uninstall]
#
# Parameters:
#   -ExtensionId  The Chrome extension ID (32 lowercase letters)
#   -Browser      Target browser: chrome, edge, brave, or all (default: chrome)
#   -Uninstall    Remove the native host instead of installing

param(
    [string]$ExtensionId = "EXTENSION_ID_PLACEHOLDER",
    [ValidateSet("chrome", "edge", "brave", "all")]
    [string]$Browser = "chrome",
    [switch]$Uninstall
)

$ErrorActionPreference = "Stop"

# Configuration
$HostName = "com.athreei.native_host"
$BinaryName = "athreei-host.exe"
$InstallDir = "$env:APPDATA\athreei"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

# Registry paths for different browsers
$RegistryPaths = @{
    "chrome" = "HKCU:\Software\Google\Chrome\NativeMessagingHosts\$HostName"
    "edge"   = "HKCU:\Software\Microsoft\Edge\NativeMessagingHosts\$HostName"
    "brave"  = "HKCU:\Software\BraveSoftware\Brave-Browser\NativeMessagingHosts\$HostName"
}

# Browser display names
$BrowserNames = @{
    "chrome" = "Google Chrome"
    "edge"   = "Microsoft Edge"
    "brave"  = "Brave Browser"
}

function Get-BinaryPath {
    # Try platform-specific binary first
    $platformBinary = Join-Path $ScriptDir "dist\athreei-host-windows.exe"
    if (Test-Path $platformBinary) {
        return $platformBinary
    }

    # Fall back to generic binary
    $genericBinary = Join-Path $ScriptDir "dist\athreei-host.exe"
    if (Test-Path $genericBinary) {
        return $genericBinary
    }

    # Try without .exe extension
    $genericBinaryNoExt = Join-Path $ScriptDir "dist\athreei-host"
    if (Test-Path $genericBinaryNoExt) {
        return $genericBinaryNoExt
    }

    return $null
}

function Install-NativeHost {
    param([string]$TargetBrowser)

    $registryPath = $RegistryPaths[$TargetBrowser]
    $browserName = $BrowserNames[$TargetBrowser]

    Write-Host "Installing for $browserName..." -ForegroundColor Yellow

    # Get binary path
    $binarySource = Get-BinaryPath
    if (-not $binarySource) {
        Write-Host "Error: Binary not found in dist/" -ForegroundColor Red
        Write-Host "Please run 'bun run build' first" -ForegroundColor Red
        exit 1
    }

    # Create install directory
    if (-not (Test-Path $InstallDir)) {
        Write-Host "Creating installation directory: $InstallDir"
        New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null
    }

    # Copy binary
    $binaryDest = Join-Path $InstallDir $BinaryName
    Write-Host "Copying binary to: $binaryDest"
    Copy-Item -Path $binarySource -Destination $binaryDest -Force

    # Create manifest
    $manifestPath = Join-Path $InstallDir "$HostName.json"
    $manifest = @{
        name = $HostName
        description = "athreei Native Messaging Host - Bridge between Chrome extension and MCP server"
        path = $binaryDest
        type = "stdio"
        allowed_origins = @("chrome-extension://$ExtensionId/")
    }

    Write-Host "Creating manifest: $manifestPath"
    $manifest | ConvertTo-Json -Depth 10 | Set-Content -Path $manifestPath -Encoding UTF8

    # Create registry key
    Write-Host "Creating registry key: $registryPath"

    # Ensure parent path exists
    $parentPath = Split-Path -Parent $registryPath
    if (-not (Test-Path $parentPath)) {
        New-Item -Path $parentPath -Force | Out-Null
    }

    # Set registry value (points to manifest file)
    New-Item -Path $registryPath -Force | Out-Null
    Set-ItemProperty -Path $registryPath -Name "(Default)" -Value $manifestPath

    Write-Host "✓ Installed for $browserName" -ForegroundColor Green
}

function Uninstall-NativeHost {
    param([string]$TargetBrowser)

    $registryPath = $RegistryPaths[$TargetBrowser]
    $browserName = $BrowserNames[$TargetBrowser]

    Write-Host "Uninstalling for $browserName..." -ForegroundColor Yellow

    # Remove registry key
    if (Test-Path $registryPath) {
        Remove-Item -Path $registryPath -Force
        Write-Host "✓ Removed registry key" -ForegroundColor Green
    } else {
        Write-Host "⚠ Registry key not found" -ForegroundColor Yellow
    }
}

function Show-Summary {
    Write-Host ""
    Write-Host "Installation complete!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Binary location:   $InstallDir\$BinaryName"
    Write-Host "Manifest location: $InstallDir\$HostName.json"
    Write-Host ""

    if ($ExtensionId -eq "EXTENSION_ID_PLACEHOLDER") {
        Write-Host "Warning: Using placeholder extension ID" -ForegroundColor Yellow
        Write-Host "You need to update with your actual Chrome extension ID."
        Write-Host "Run: .\install.ps1 -ExtensionId YOUR_EXTENSION_ID"
        Write-Host ""
    }

    Write-Host "Next steps:"
    Write-Host "  1. Install the Chrome extension"
    Write-Host "  2. Get the extension ID from chrome://extensions"
    Write-Host "  3. Re-run this script with -ExtensionId YOUR_EXTENSION_ID"
    Write-Host "  4. Test the connection by opening the extension"
    Write-Host ""
}

# Main
Write-Host ""
Write-Host "athreei Native Host Installer (Windows)" -ForegroundColor Cyan
Write-Host "========================================"
Write-Host ""

if ($Uninstall) {
    Write-Host "Uninstalling athreei native host..." -ForegroundColor Yellow
    Write-Host ""

    if ($Browser -eq "all") {
        foreach ($b in @("chrome", "edge", "brave")) {
            Uninstall-NativeHost -TargetBrowser $b
        }
    } else {
        Uninstall-NativeHost -TargetBrowser $Browser
    }

    # Remove install directory
    if (Test-Path $InstallDir) {
        Write-Host ""
        Write-Host "Removing installation directory..."
        Remove-Item -Path $InstallDir -Recurse -Force
        Write-Host "✓ Removed: $InstallDir" -ForegroundColor Green
    }

    Write-Host ""
    Write-Host "Uninstallation complete!" -ForegroundColor Green
} else {
    Write-Host "Installing athreei native host..." -ForegroundColor Yellow
    Write-Host "Extension ID: $ExtensionId"
    Write-Host "Target browser: $Browser"
    Write-Host ""

    if ($Browser -eq "all") {
        foreach ($b in @("chrome", "edge", "brave")) {
            Install-NativeHost -TargetBrowser $b
            Write-Host ""
        }
    } else {
        Install-NativeHost -TargetBrowser $Browser
    }

    Show-Summary
}
