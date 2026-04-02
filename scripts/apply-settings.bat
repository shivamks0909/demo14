@echo off
REM VS Code Terminal Configuration Batch Script
REM This script applies the settings to make commands run automatically

echo Configuring VS Code for automatic command execution...

REM Create .vscode directory if it doesn't exist
if not exist ".vscode" mkdir .vscode

REM Copy settings.json
copy "scripts\vscode-settings.json" ".vscode\settings.json" >nul 2>&1
if exist ".vscode\settings.json" (
    echo Settings applied successfully.
) else (
    echo ERROR: Failed to copy settings.json
    pause
    exit /b 1
)

REM Copy tasks.json
copy "scripts\vscode-tasks.json" ".vscode\tasks.json" >nul 2>&1
if exist ".vscode\tasks.json" (
    echo Tasks configured successfully.
) else (
    echo ERROR: Failed to copy tasks.json
    pause
    exit /b 1
)

echo.
echo Configuration complete!
echo Please restart VS Code for changes to take effect.
echo.
pause
