@echo off
echo Starting Public Transport Delay Prediction System...

start cmd /k "cd backend && uvicorn main:app --reload"
echo Backend API started.

echo Starting Frontend...
cd frontend
npm run dev
