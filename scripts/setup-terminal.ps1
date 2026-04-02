# VS Code Terminal Auto-Configuration Script
# Run this script to set PowerShell as default and disable prompts

Write-Host "Configuring VS Code for automatic command execution..." -ForegroundColor Cyan

# Check if VS Code is installed
$vscodePath = "${env:LOCALAPPDATA}\Programs\Microsoft VS Code\Code.exe"
if (-not (Test-Path $vscodePath)) {
    Write-Host "VS Code not found at expected location. Please install VS Code first." -ForegroundColor Yellow
    exit 1
}

# Create .vscode directory if it doesn't exist
$vscodeDir = Join-Path $PSScriptRoot "..\.vscode"
if (-not (Test-Path $vscodeDir)) {
    New-Item -ItemType Directory -Path $vscodeDir -Force | Out-Null
}

# Settings to configure
$settings = @{
    "terminal.integrated.defaultProfile.windows" = "PowerShell"
    "terminal.integrated.profiles.windows" = @{
        "PowerShell" = @{
            "source" = "PowerShell"
            "icon" = "terminal-powershell"
            "args" = @("-NoLogo", "-ExecutionPolicy", "Bypass")
        }
    }
    "terminal.integrated.confirmOnExit" = "off"
    "terminal.integrated.enablePersistentSessions" = $true
    "terminal.integrated.rightClickBehavior" = "paste"
    "terminal.integrated.shellIntegration.enabled" = $false
    "task.autoDetect" = "off"
    "task.runInBackground" = $true
    "task.problemMatchers.neverPrompt" = $true
    "extensions.ignoreRecommendations" = $true
    "extensions.autoUpdate" = $true
    "code-runner.runInTerminal" = $true
    "code-runner.ignoreSelection" = $true
    "window.openFoldersInNewWindow" = "off"
    "window.restoreWindows" = "all"
    "update.mode" = "auto"
    "security.workspace.trust.enabled" = $false
    "explorer.confirmDelete" = $false
    "explorer.confirmDragAndDrop" = $false
    "git.confirmSync" = $false
}

$settingsPath = Join-Path $vscodeDir "settings.json"
$settings | ConvertTo-Json -Depth 10 | Set-Content -Path $settingsPath -Force

Write-Host "✓ VS Code settings configured at: $settingsPath" -ForegroundColor Green

# Create tasks.json
$tasks = @{
    version = "2.0.0"
    tasks = @(
        @{
            label = "Dev Server"
            type = "shell"
            command = "npm run dev"
            isBackground = $true
            problemMatcher = @()
            presentation = @{
                echo = $false
                reveal = "always"
                focus = $false
                panel = "dedicated"
                showReuseMessage = $false
            }
        },
        @{
            label = "TypeScript Check"
            type = "shell"
            command = "npx tsc --noEmit"
            problemMatcher = "$tsc"
            presentation = @{
                echo = $false
                reveal = "always"
                focus = $false
                panel = "dedicated"
                showReuseMessage = $false
            }
        }
    )
}

$tasksPath = Join-Path $vscodeDir "tasks.json"
$tasks | ConvertTo-Json -Depth 10 | Set-Content -Path $tasksPath -Force

Write-Host "✓ VS Code tasks configured at: $tasksPath" -ForegroundColor Green

Write-Host "`nConfiguration complete! Please restart VS Code for changes to take effect." -ForegroundColor Cyan
Write-Host "`nAfter restart:" -ForegroundColor White
Write-Host "  • PowerShell will be the default terminal" -ForegroundColor Gray
Write-Host "  • Commands will run without prompts" -ForegroundColor Gray
Write-Host "  • Alt+Enter will execute directly" -ForegroundColor Gray
