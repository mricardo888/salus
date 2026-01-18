@echo off
setlocal

echo 🚀 Starting Salus Development Environment...

REM Check if Python venv exists
if not exist "backend\venv" (
    echo 📦 Creating Python virtual environment...
    python -m venv backend\venv
    call backend\venv\Scripts\activate.bat
    echo ⬇️ Installing backend dependencies...
    pip install -r backend\requirements.txt
) else (
    call backend\venv\Scripts\activate.bat
)

REM Start Backend in new window
echo 🐍 Starting FastAPI Backend (Port 8000)...
start "Salus Backend" cmd /k "cd backend && ..\backend\venv\Scripts\python.exe -m uvicorn main:app --reload --port 8000"

REM Give backend a moment to start
timeout /t 3 /nobreak >nul

REM Start Frontend in new window
echo ⚛️ Starting Next.js Frontend (Port 3000)...
start "Salus Frontend" cmd /k "npm run dev"

echo.
echo ✅ Salus is running!
echo    Frontend: http://localhost:3000
echo    Backend:  http://localhost:8000
echo.
echo Close the terminal windows to stop the servers.

endlocal
