@echo off
title AI Debate Judge Launcher
echo Starting AI Debate Judge Project...

echo [1/3] Starting Backend (Port 8005)...
start "Backend Server" cmd /k "backend\venv\Scripts\activate.bat && uvicorn backend.main:app --reload --port 8005"

echo [2/3] Starting Frontend (Port 5173)...
start "Frontend Server" cmd /k "cd frontend && npm run dev"

echo [3/3] Waiting for services to initialize...
timeout /t 4 /nobreak > NUL

echo Opening Browser...
start http://localhost:5173

echo All services are starting up! 
echo Keep the two new command prompt windows open to keep the servers running.
echo You can safely close this launcher window.
pause
