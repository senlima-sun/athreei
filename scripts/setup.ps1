# athreei Setup Script for Windows
#
# This script guides you through setting up athreei for development or use.
# It builds all packages and installs the native messaging host.
#
# Usage:
#   .\setup.ps1

$ErrorActionPreference = "Stop"

# Configuration
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptDir

# Print banner
function Write-Banner {
    Write-Host ""
    Write-Host "  ╔═══════════════════════════════════════════╗" -ForegroundColor Cyan
    Write-Host "  ║                                           ║" -ForegroundColor Cyan
    Write-Host "  ║     athreei Setup                         ║" -ForegroundColor Cyan
    Write-Host "  ║     Browser automation via MCP            ║" -ForegroundColor Cyan
    Write-Host "  ║                                           ║" -ForegroundColor Cyan
    Write-Host "  ╚═══════════════════════════════════════════╝" -ForegroundColor Cyan
    Write-Host ""
}

# Print step header
function Write-Step {
    param([int]$Number, [string]$Title)
    Write-Host ""
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Blue
    Write-Host "Step ${Number}: $Title" -ForegroundColor White
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Blue
}

# Check if a command exists
function Test-CommandExists {
    param([string]$Command)
    $null -ne (Get-Command $Command -ErrorAction SilentlyContinue)
}

# Check prerequisites
function Test-Prerequisites {
    Write-Step -Number 1 -Title "Checking prerequisites"

    $missing = @()

    # Check for Bun
    if (Test-CommandExists "bun") {
        $bunVersion = & bun --version 2>$null
        Write-Host "✓ Bun $bunVersion found" -ForegroundColor Green
    } else {
        Write-Host "✗ Bun not found" -ForegroundColor Red
        $missing += "bun"
    }

    # Check for Chrome/Edge/Brave
    $browserFound = $false
    $chromePaths = @(
        "${env:ProgramFiles}\Google\Chrome\Application\chrome.exe",
        "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe",
        "${env:LocalAppData}\Google\Chrome\Application\chrome.exe"
    )
    $edgePaths = @(
        "${env:ProgramFiles}\Microsoft\Edge\Application\msedge.exe",
        "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe"
    )
    $bravePaths = @(
        "${env:ProgramFiles}\BraveSoftware\Brave-Browser\Application\brave.exe",
        "${env:LocalAppData}\BraveSoftware\Brave-Browser\Application\brave.exe"
    )

    foreach ($path in $chromePaths) {
        if (Test-Path $path) {
            Write-Host "✓ Google Chrome found" -ForegroundColor Green
            $browserFound = $true
            break
        }
    }

    if (-not $browserFound) {
        foreach ($path in $edgePaths) {
            if (Test-Path $path) {
                Write-Host "✓ Microsoft Edge found" -ForegroundColor Green
                $browserFound = $true
                break
            }
        }
    }

    if (-not $browserFound) {
        foreach ($path in $bravePaths) {
            if (Test-Path $path) {
                Write-Host "✓ Brave Browser found" -ForegroundColor Green
                $browserFound = $true
                break
            }
        }
    }

    if (-not $browserFound) {
        Write-Host "⚠ No Chrome-based browser detected (may still work if installed elsewhere)" -ForegroundColor Yellow
    }

    # Check for Git
    if (Test-CommandExists "git") {
        $gitVersion = & git --version 2>$null
        Write-Host "✓ $gitVersion found" -ForegroundColor Green
    } else {
        Write-Host "✗ Git not found" -ForegroundColor Red
        $missing += "git"
    }

    if ($missing.Count -gt 0) {
        Write-Host ""
        Write-Host "Missing required tools: $($missing -join ', ')" -ForegroundColor Red
        Write-Host ""
        Write-Host "Please install the missing tools:"
        foreach ($tool in $missing) {
            switch ($tool) {
                "bun" { Write-Host "  Bun: irm bun.sh/install.ps1 | iex" }
                "git" { Write-Host "  Git: https://git-scm.com/downloads" }
            }
        }
        exit 1
    }

    Write-Host ""
    Write-Host "All prerequisites satisfied!" -ForegroundColor Green
}

# Install dependencies
function Install-Dependencies {
    Write-Step -Number 2 -Title "Installing dependencies"

    Set-Location $ProjectRoot

    Write-Host "Running: bun install"
    & bun install

    if ($LASTEXITCODE -ne 0) {
        throw "Failed to install dependencies"
    }

    Write-Host ""
    Write-Host "Dependencies installed successfully!" -ForegroundColor Green
}

# Build packages
function Build-Packages {
    Write-Step -Number 3 -Title "Building packages"

    Set-Location $ProjectRoot

    Write-Host "Running: bun run build"
    & bun run build

    if ($LASTEXITCODE -ne 0) {
        throw "Failed to build packages"
    }

    Write-Host ""
    Write-Host "All packages built successfully!" -ForegroundColor Green
}

# Instructions for loading extension
function Write-ExtensionInstructions {
    Write-Step -Number 4 -Title "Load the Chrome Extension"

    Write-Host ""
    Write-Host "To load the extension in Chrome/Edge:"
    Write-Host ""
    Write-Host "  1. Open Chrome and navigate to: " -NoNewline
    Write-Host "chrome://extensions" -ForegroundColor Cyan
    Write-Host "     (For Edge: edge://extensions)"
    Write-Host "  2. Enable " -NoNewline
    Write-Host "Developer mode" -ForegroundColor White -NoNewline
    Write-Host " (toggle in top right)"
    Write-Host "  3. Click " -NoNewline
    Write-Host "Load unpacked" -ForegroundColor White
    Write-Host "  4. Select the folder: " -NoNewline
    Write-Host "$ProjectRoot\packages\extension\dist" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "After loading, copy the Extension ID shown on the card." -ForegroundColor Yellow
    Write-Host "The ID is a 32-character string like: abcdefghijklmnopqrstuvwxyzabcdef"
    Write-Host ""
}

# Get extension ID from user
function Get-ExtensionId {
    Write-Step -Number 5 -Title "Enter Extension ID"

    Write-Host ""
    $extensionId = Read-Host "Paste your Extension ID"

    # Validate extension ID format (32 lowercase letters)
    if ($extensionId -notmatch "^[a-z]{32}$") {
        Write-Host "Invalid extension ID format." -ForegroundColor Red
        Write-Host "Extension IDs are 32 lowercase letters (a-z)."
        Write-Host ""
        $extensionId = Read-Host "Try again"

        if ($extensionId -notmatch "^[a-z]{32}$") {
            Write-Host "Still invalid. Proceeding with placeholder." -ForegroundColor Red
            Write-Host "You can re-run this script later with the correct ID."
            $extensionId = "EXTENSION_ID_PLACEHOLDER"
        }
    }

    Write-Host ""
    Write-Host "Using Extension ID: $extensionId" -ForegroundColor Green

    return $extensionId
}

# Install native host
function Install-NativeHost {
    param([string]$ExtensionId)

    Write-Step -Number 6 -Title "Installing Native Messaging Host"

    $installScript = Join-Path $ProjectRoot "packages\native-host\install.ps1"

    if (-not (Test-Path $installScript)) {
        throw "Error: install.ps1 not found at $installScript"
    }

    Write-Host "Running native host installer..."
    & $installScript -ExtensionId $ExtensionId
}

# Print Claude Desktop configuration
function Write-ClaudeConfig {
    Write-Step -Number 7 -Title "Configure Claude Desktop (Optional)"

    $binaryPath = "$env:APPDATA\athreei\athreei-host.exe"

    Write-Host ""
    Write-Host "To use athreei with Claude Desktop, add this to your config:"
    Write-Host ""
    Write-Host "Config location: " -NoNewline
    Write-Host "$env:APPDATA\Claude\claude_desktop_config.json" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Add or merge this configuration:" -ForegroundColor White
    Write-Host ""
    Write-Host "{"
    Write-Host "  `"mcpServers`": {"
    Write-Host "    `"athreei`": {"
    Write-Host "      `"command`": `"$($binaryPath -replace '\\', '\\\\')`""
    Write-Host "    }"
    Write-Host "  }"
    Write-Host "}"
    Write-Host ""
}

# Print completion message
function Write-Completion {
    Write-Host ""
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Green
    Write-Host "   Setup Complete!" -ForegroundColor Green
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:"
    Write-Host "  1. Configure Claude Desktop (see above)"
    Write-Host "  2. Restart Claude Desktop"
    Write-Host "  3. Open Chrome/Edge with the extension enabled"
    Write-Host "  4. Ask Claude to interact with web pages!"
    Write-Host ""
    Write-Host "For troubleshooting, see: $ProjectRoot\INSTALL.md"
    Write-Host ""
}

# Main
function Main {
    Write-Banner
    Test-Prerequisites
    Install-Dependencies
    Build-Packages
    Write-ExtensionInstructions
    $extensionId = Get-ExtensionId
    Install-NativeHost -ExtensionId $extensionId
    Write-ClaudeConfig
    Write-Completion
}

Main
