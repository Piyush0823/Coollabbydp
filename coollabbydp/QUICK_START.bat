@echo off
REM Quick Start Script for Collaborative Code Editor with Trinity AI

echo.
echo ===============================================
echo  Collaborative Code Editor + Trinity AI Setup
echo ===============================================
echo.

REM Install server dependencies
echo [1/4] Installing server dependencies...
cd server
call npm install
if errorlevel 1 (
    echo Error installing server dependencies!
    exit /b 1
)
cd ..

REM Install client dependencies
echo [2/4] Installing client dependencies...
cd client
call npm install
if errorlevel 1 (
    echo Error installing client dependencies!
    exit /b 1
)
cd ..

REM Create .env file from template
echo [3/4] Setting up environment variables...
if not exist "server\.env" (
    copy "server\.env.example" "server\.env"
    echo Created server\.env file
    echo.
    echo ⚠️  IMPORTANT: Edit server\.env and add your TRINITY_API_KEY
    echo Get it from: https://replicate.com/account/api-tokens
    echo.
) else (
    echo server\.env already exists
)

echo [4/4] Setup complete!
echo.
echo ===============================================
echo  Next Steps:
echo ===============================================
echo.
echo 1. Edit server\.env and add your TRINITY_API_KEY:
echo    Get free key: https://replicate.com/arcee-ai/trinity-large-preview
echo.
echo 2. Start the server:
echo    cd server
echo    node index.js
echo.
echo 3. In another terminal, start the client:
echo    cd client
echo    npm run dev
echo.
echo 4. Open browser and visit: http://localhost:5173
echo.
echo 5. Read TRINITY_SETUP.md for full documentation
echo.
echo ===============================================
