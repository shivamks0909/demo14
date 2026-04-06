# PowerShell and CMD Setup Script
# Run with: powershell -ExecutionPolicy Bypass -File .\setup-shell.ps1

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  PowerShell and CMD Setup Script" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Step 1: Fix PowerShell Execution Policy
Write-Host "[1/5] Fixing PowerShell Execution Policy..." -ForegroundColor Yellow

try {
    Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser -Force
    Write-Host "  CurrentUser policy set to RemoteSigned" -ForegroundColor Green
} catch {
    Write-Host "  Warning: Could not set CurrentUser policy: $_" -ForegroundColor Red
}

try {
    Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope LocalMachine -Force
    Write-Host "  LocalMachine policy set to RemoteSigned" -ForegroundColor Green
} catch {
    Write-Host "  Warning: Could not set LocalMachine policy (try running as Admin): $_" -ForegroundColor Yellow
}

$currentPolicy = Get-ExecutionPolicy -Scope CurrentUser
Write-Host "  Current policy: $currentPolicy" -ForegroundColor Green

# Step 2: Check or Install PSReadLine
Write-Host "`n[2/5] Setting up PSReadLine..." -ForegroundColor Yellow

$psReadLine = Get-Module -Name PSReadLine -ListAvailable
if ($psReadLine) {
    Write-Host "  PSReadLine already installed (version $($psReadLine[0].Version))" -ForegroundColor Green
} else {
    Write-Host "  Installing PSReadLine..." -ForegroundColor Yellow
    Install-Module -Name PSReadLine -Force -SkipPublisherCheck -Scope CurrentUser
    Write-Host "  PSReadLine installed" -ForegroundColor Green
}

# Step 3: Configure PowerShell Profile
Write-Host "`n[3/5] Configuring PowerShell profile..." -ForegroundColor Yellow

$profilePath = $PROFILE.CurrentUserCurrentHost
$profileDir = Split-Path $profilePath -Parent

if (-not (Test-Path $profileDir)) {
    New-Item -ItemType Directory -Path $profileDir -Force | Out-Null
    Write-Host "  Created profile directory: $profileDir" -ForegroundColor Green
}

if (Test-Path $profilePath) {
    $timestamp = Get-Date -Format 'yyyyMMdd_HHmmss'
    $backupPath = "$profilePath.backup_$timestamp"
    Copy-Item $profilePath $backupPath -Force
    Write-Host "  Backed up existing profile to: $backupPath" -ForegroundColor Yellow
}

# Build profile content as a single string with proper escaping
$profileContent = @"
# PowerShell Profile - Auto-Complete and Auto-Proceed

Import-Module PSReadLine

# Auto-Complete Settings
Set-PSReadLineOption -PredictionSource History
Set-PSReadLineOption -PredictionViewStyle ListView
Set-PSReadLineKeyHandler -Key Tab -Function MenuComplete
Set-PSReadLineKeyHandler -Key Shift+Tab -Function PreviousHistory
Set-PSReadLineOption -HistorySearchCursorMovesToEnd
Set-PSReadLineOption -HistoryNoDuplicates

# Auto-Proceed Settings
`$ErrorActionPreference = 'Continue'
`$PSModuleAutoLoadingPreference = 'All'
`$ConfirmPreference = 'None'
`$WhatIfPreference = `$false

# Useful Aliases
Set-Alias -Name ll -Value Get-ChildItem
Set-Alias -Name cls -Value Clear-Host
Set-Alias -Name grep -Value Select-String

# Custom Prompt
function global:prompt {
    `$path = (Get-Location).Path
    `$homeDir = `$env:USERPROFILE
    if (`$path.StartsWith(`$homeDir)) {
        `$path = "~" + `$path.Substring(`$homeDir.Length)
    }
    Write-Host "`nPS " -NoNewline -ForegroundColor Cyan
    Write-Host "`$path" -NoNewline -ForegroundColor White
    Write-Host " > " -NoNewline -ForegroundColor Green
    return " "
}

# Auto-Complete for npm
Register-ArgumentCompleter -CommandName 'npm' -ScriptBlock {
    param(`$commandName, `$parameterName, `$wordToComplete, `$commandAst, `$fakeBoundParameter)
    `$npmCommands = @('install', 'run', 'start', 'build', 'test', 'init', 'update', 'uninstall', 'publish', 'list', 'outdated', 'audit', 'cache', 'config')
    `$npmCommands | Where-Object { `$_ -like "`$wordToComplete*" } | ForEach-Object {
        [System.Management.Automation.CompletionResult]::new(`$_, `$_, 'ParameterValue', `$_)
    }
}

# Auto-Complete for git
Register-ArgumentCompleter -CommandName 'git' -ScriptBlock {
    param(`$commandName, `$parameterName, `$wordToComplete, `$commandAst, `$fakeBoundParameter)
    `$gitCommands = @('status', 'add', 'commit', 'push', 'pull', 'branch', 'checkout', 'merge', 'log', 'diff', 'clone', 'init', 'remote', 'fetch', 'reset', 'stash', 'tag')
    `$gitCommands | Where-Object { `$_ -like "`$wordToComplete*" } | ForEach-Object {
        [System.Management.Automation.CompletionResult]::new(`$_, `$_, 'ParameterValue', `$_)
    }
}

Write-Host "PowerShell profile loaded" -ForegroundColor Green
"@

$profileContent | Out-File -FilePath $profilePath -Encoding UTF8 -Force
Write-Host "  Profile configured at: $profilePath" -ForegroundColor Green

# Step 4: Configure CMD Auto-Complete
Write-Host "`n[4/5] Configuring CMD auto-complete..." -ForegroundColor Yellow

$cmdRegPath = "HKCU:\Software\Microsoft\Command Processor"

try {
    Set-ItemProperty -Path $cmdRegPath -Name "CompletionChar" -Value 9 -Type DWord -Force
    Set-ItemProperty -Path $cmdRegPath -Name "PathCompletionChar" -Value 9 -Type DWord -Force
    Write-Host "  CMD tab completion enabled" -ForegroundColor Green
    
    $cmdAutorunPath = "$env:USERPROFILE\cmd_autorun.bat"
    
    $cmdContent = @"
@echo off
setlocal EnableDelayedExpansion
prompt `$P`$_`$G
set CMDEXTENSIONS=1
chcp 65001 >nul 2>&1
doskey ls=dir /b `$*
doskey ll=dir /w `$*
doskey cls=cls
doskey grep=findstr `$*
doskey ..=cd ..
doskey ...=cd ../..
doskey md=mkdir `$*
doskey rd=rmdir /s /q `$*
doskey cp=copy `$*
doskey mv=move `$*
doskey rm=del /q `$*
doskey cat=type `$*
echo CMD environment ready.
"@
    
    $cmdContent | Out-File -FilePath $cmdAutorunPath -Encoding ASCII -Force
    Set-ItemProperty -Path $cmdRegPath -Name "AutoRun" -Value $cmdAutorunPath -Type ExpandString -Force
    Write-Host "  CMD AutoRun configured at: $cmdAutorunPath" -ForegroundColor Green
    
} catch {
    Write-Host "  Warning: Could not configure CMD registry: $_" -ForegroundColor Red
    Write-Host "  Try running this script as Administrator" -ForegroundColor Yellow
}

# Step 5: Summary
Write-Host "`n[5/5] Setup Complete!" -ForegroundColor Green

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  Configuration Summary" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

Write-Host "PowerShell:" -ForegroundColor White
Write-Host "  Execution Policy: $(Get-ExecutionPolicy -Scope CurrentUser)" -ForegroundColor Green
$psrl = Get-Module PSReadLine -ListAvailable
if ($psrl) {
    Write-Host "  PSReadLine Version: $($psrl[0].Version)" -ForegroundColor Green
}
Write-Host "  Profile: $profilePath" -ForegroundColor Green

Write-Host "`nCMD:" -ForegroundColor White
Write-Host "  Tab Completion: Enabled" -ForegroundColor Green
Write-Host "  AutoRun: $env:USERPROFILE\cmd_autorun.bat" -ForegroundColor Green

Write-Host "`nFeatures:" -ForegroundColor White
Write-Host "  - Predictive IntelliSense from history" -ForegroundColor Green
Write-Host "  - Tab cycles through completion options" -ForegroundColor Green
Write-Host "  - Auto-proceed on non-critical operations" -ForegroundColor Green
Write-Host "  - CMD aliases: ls, ll, grep, cp, mv, rm, cat" -ForegroundColor Green

Write-Host "`nRestart PowerShell and CMD to apply changes.`n" -ForegroundColor Yellow
