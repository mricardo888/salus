#!/bin/bash

# Function to kill child processes on exit
cleanup() {
    echo "Shutting down Salus..."
    kill $(jobs -p) 2>/dev/null
    exit
}

trap cleanup SIGINT SIGTERM

echo "🚀 Starting Salus Development Environment..."

# Check if Python venv exists
if [ ! -d "backend/venv" ]; then
    echo "📦 Creating Python virtual environment..."
    python3 -m venv backend/venv
    source backend/venv/bin/activate
    echo "⬇️ Installing backend dependencies..."
    pip install -r backend/requirements.txt
else
    source backend/venv/bin/activate
fi

# Start Backend in background
echo "🐍 Starting FastAPI Backend (Port 8000)..."
cd backend
uvicorn main:app --reload --port 8000 &
BACKEND_PID=$!
cd ..

# Start Frontend
echo "⚛️ Starting Next.js Frontend (Port 3000)..."
npm run dev &
FRONTEND_PID=$!

# Wait for processes
wait $BACKEND_PID $FRONTEND_PID
