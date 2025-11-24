# Setup Script for Direct HTTPS on Port 443
# Run this script as Administrator

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "WhatsApp Bot - Direct HTTPS Setup on Port 443" -ForegroundColor Cyan
Write-Host "============================================`n" -ForegroundColor Cyan

# Check if running as Administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "ERROR: This script must be run as Administrator!" -ForegroundColor Red
    Write-Host "Right-click PowerShell and select 'Run as Administrator'" -ForegroundColor Yellow
    exit 1
}

Write-Host "[OK] Running as Administrator`n" -ForegroundColor Green

# Step 1: Stop IIS
Write-Host "[1/7] Stopping IIS..." -ForegroundColor Yellow
try {
    iisreset /stop | Out-Null
    Set-Service -Name W3SVC -StartupType Disabled -ErrorAction SilentlyContinue
    Write-Host "[OK] IIS stopped and disabled`n" -ForegroundColor Green
} catch {
    Write-Host "[SKIP] IIS not installed or already stopped`n" -ForegroundColor Gray
}

# Step 2: Check/Install Chocolatey
Write-Host "[2/7] Checking Chocolatey..." -ForegroundColor Yellow
if (-not (Get-Command choco -ErrorAction SilentlyContinue)) {
    Write-Host "Installing Chocolatey..." -ForegroundColor Yellow
    Set-ExecutionPolicy Bypass -Scope Process -Force
    [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
    Invoke-Expression ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
    Write-Host "[OK] Chocolatey installed`n" -ForegroundColor Green
} else {
    Write-Host "[OK] Chocolatey already installed`n" -ForegroundColor Green
}

# Step 3: Configure Windows Firewall
Write-Host "[3/7] Configuring Windows Firewall..." -ForegroundColor Yellow

# Remove existing rules if they exist
Remove-NetFirewallRule -DisplayName "WhatsApp Bot HTTPS" -ErrorAction SilentlyContinue
Remove-NetFirewallRule -DisplayName "WhatsApp Bot HTTP Redirect" -ErrorAction SilentlyContinue

# Add new rules
New-NetFirewallRule -DisplayName "WhatsApp Bot HTTPS" -Direction Inbound -LocalPort 443 -Protocol TCP -Action Allow | Out-Null
New-NetFirewallRule -DisplayName "WhatsApp Bot HTTP Redirect" -Direction Inbound -LocalPort 80 -Protocol TCP -Action Allow | Out-Null

Write-Host "[OK] Firewall rules configured (ports 80, 443)`n" -ForegroundColor Green

# Step 4: Check Node.js
Write-Host "[4/7] Checking Node.js..." -ForegroundColor Yellow
if (Get-Command node -ErrorAction SilentlyContinue) {
    $nodeVersion = node --version
    Write-Host "[OK] Node.js installed: $nodeVersion`n" -ForegroundColor Green
} else {
    Write-Host "[ERROR] Node.js not found!" -ForegroundColor Red
    Write-Host "Please install Node.js from https://nodejs.org/`n" -ForegroundColor Yellow
    exit 1
}

# Step 5: Check PM2
Write-Host "[5/7] Checking PM2..." -ForegroundColor Yellow
if (Get-Command pm2 -ErrorAction SilentlyContinue) {
    $pm2Version = pm2 --version
    Write-Host "[OK] PM2 installed: $pm2Version`n" -ForegroundColor Green
} else {
    Write-Host "Installing PM2..." -ForegroundColor Yellow
    npm install -g pm2 pm2-windows-startup
    Write-Host "[OK] PM2 installed`n" -ForegroundColor Green
}

# Step 6: Configure PM2 Startup
Write-Host "[6/7] Configuring PM2 startup..." -ForegroundColor Yellow
try {
    pm2-startup install | Out-Null
    Write-Host "[OK] PM2 configured to start on boot`n" -ForegroundColor Green
} catch {
    Write-Host "[SKIP] PM2 startup already configured`n" -ForegroundColor Gray
}

# Step 7: Check for win-acme
Write-Host "[7/7] Checking for win-acme..." -ForegroundColor Yellow
$winAcmePath = "C:\win-acme\wacs.exe"

if (Test-Path $winAcmePath) {
    Write-Host "[OK] win-acme found at C:\win-acme\`n" -ForegroundColor Green
} else {
    Write-Host "[INFO] win-acme not found" -ForegroundColor Yellow
    Write-Host "Download from: https://www.win-acme.com/`n" -ForegroundColor Cyan
}

# Summary
Write-Host "`n============================================" -ForegroundColor Cyan
Write-Host "Setup Complete!" -ForegroundColor Green
Write-Host "============================================`n" -ForegroundColor Cyan

Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "1. Get SSL certificates (use win-acme or GoDaddy)" -ForegroundColor White
Write-Host "2. Edit .env file with your configuration:" -ForegroundColor White
Write-Host "   - Set PORT=443" -ForegroundColor Gray
Write-Host "   - Set HTTPS_ENABLED=true" -ForegroundColor Gray
Write-Host "   - Set SSL_KEY_PATH and SSL_CERT_PATH" -ForegroundColor Gray
Write-Host "3. Start your application:" -ForegroundColor White
Write-Host "   pm2 start server.js --name whatsapp-bot" -ForegroundColor Cyan
Write-Host "4. Save PM2 configuration:" -ForegroundColor White
Write-Host "   pm2 save" -ForegroundColor Cyan
Write-Host "5. Test: https://localhost/health`n" -ForegroundColor White

Write-Host "For detailed instructions, see: DIRECT_HTTPS_SETUP.md`n" -ForegroundColor Yellow
