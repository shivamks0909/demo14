@echo off
REM ===================================================================
REM INSFORGE DATABASE SETUP SCRIPT (Windows)
REM ===================================================================
REM This script runs the full database migration and seeding on InsForge
REM
REM Usage:
REM   scripts\set-insforge-db.bat DATABASE_URL
REM
REM Example:
REM   scripts\set-insforge-db.bat postgresql://user:pass@host:5432/dbname
REM
REM Or set DATABASE_URL environment variable first:
REM   set DATABASE_URL=postgresql://user:pass@host:5432/dbname
REM   scripts\set-insforge-db.bat
REM ===================================================================

setlocal enabledelayedexpansion

REM Check if DATABASE_URL provided
if "%1"=="" (
    if "%DATABASE_URL%"=="" (
        echo ERROR: No database URL provided.
        echo Usage: %0 [DATABASE_URL]
        echo Or set DATABASE_URL environment variable.
        exit /b 1
    )
    set "DATABASE_URL=%DATABASE_URL%"
) else (
    set "DATABASE_URL=%1"
)

echo ========================================
echo INFORGE DATABASE SETUP
echo ========================================
echo.
echo Target Database: %DATABASE_URL%
echo.

REM Confirm with user
set /p confirm="This will DROP and RECREATE all tables. Continue? (yes/no): "
if /i "%confirm%" neq "yes" (
    echo Aborted.
    exit /b 0
)

echo.
echo Step 1/3: Running full schema migration...

REM Extract password from URL for psql
for /f "tokens=2 delims=://" %%a in ("%DATABASE_URL%") do (
    for /f "tokens=1 delims=@" %%b in ("%%a") do (
        set "USERPASS=%%b"
    )
)

for /f "tokens=2 delims=:" %%a in ("%USERPASS%") do (
    set "PASSWORD=%%a"
)

REM Run schema migration
set PGPASSWORD=%PASSWORD%
psql "%DATABASE_URL%" -f scripts\migrate-full-schema.sql

if errorlevel 1 (
    echo ERROR: Schema migration failed
    exit /b 1
)

echo.
echo Step 2/3: Seeding sample data...

psql "%DATABASE_URL%" -f scripts\seed-insforge.sql

if errorlevel 1 (
    echo ERROR: Data seeding failed
    exit /b 1
)

echo.
echo Step 3/3: Verifying installation...

psql "%DATABASE_URL%" -c "
SELECT 'Tables created:' as status
UNION ALL
SELECT '  ✓ ' || table_name FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    ORDER BY table_name;
"

echo.
echo ========================================
echo ^& DATABASE SETUP COMPLETE
echo ========================================
echo.
echo Next steps:
echo 1. Update your ^&env with:
echo    NEXT_PUBLIC_INSFORGE_URL=%DATABASE_URL%
echo.
echo 2. Test routing:
echo    curl -v http://localhost:3000/r/TEST_SINGLE/DYN01/UID123
echo.
echo 3. Check audit logs:
echo    SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 10;
echo.
pause
