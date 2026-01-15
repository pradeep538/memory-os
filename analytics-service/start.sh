#!/bin/bash

# Memory OS Analytics Service - Startup Script

cd "$(dirname "$0")"

echo "🐍 Starting Memory OS Analytics Service..."
echo ""

# Check if venv exists
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
    echo "Installing dependencies..."
    ./venv/bin/pip install -r requirements.txt
fi

# Start the service
echo "Starting service on port 8001..."
./venv/bin/python main.py
