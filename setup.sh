#!/bin/bash

# Memory OS - Automated Setup Script
# This script will install all dependencies and set up the system

set -e  # Exit on error

echo "🧠 Memory OS - Automated Setup"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to print status
print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

# 1. Check and install Homebrew
echo "1️⃣  Checking Homebrew..."
if ! command -v brew &> /dev/null; then
    print_warning "Homebrew not found. Installing..."
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    print_status "Homebrew installed"
else
    print_status "Homebrew already installed"
fi

# 2. Install PostgreSQL
echo ""
echo "2️⃣  Checking PostgreSQL..."
if ! command -v psql &> /dev/null; then
    print_warning "PostgreSQL not found. Installing..."
    brew install postgresql@15
    print_status "PostgreSQL installed"
    
    # Start PostgreSQL
    brew services start postgresql@15
    print_status "PostgreSQL started"
    
    # Wait for PostgreSQL to be ready
    sleep 3
else
    print_status "PostgreSQL already installed"
    
    # Ensure it's running
    brew services start postgresql@15 2>/dev/null || true
fi

# 3. Create Database
echo ""
echo "3️⃣  Setting up database..."
if psql -lqt | cut -d \| -f 1 | grep -qw memory_os; then
    print_warning "Database 'memory_os' already exists. Dropping and recreating..."
    dropdb memory_os
fi

createdb memory_os
print_status "Database 'memory_os' created"

# Apply schema
psql memory_os < backend/src/db/schema.sql
print_status "Schema applied (8 tables created)"

# 4. Setup Backend Environment
echo ""
echo "4️⃣  Configuring backend..."
cd backend

# Check if .env exists
if [ -f ".env" ]; then
    print_warning ".env already exists. Backing up to .env.backup"
    cp .env .env.backup
fi

# Create .env from template
cp .env.example .env
print_status "Created .env file"

# Install Node dependencies
if [ ! -d "node_modules" ]; then
    print_warning "Installing Node.js dependencies..."
    npm install
    print_status "Node dependencies installed"
else
    print_status "Node dependencies already installed"
fi

cd ..

# 5. Setup Python Analytics Service
echo ""
echo "5️⃣  Setting up Python analytics service..."
cd analytics-service

# Create virtual environment
if [ ! -d "venv" ]; then
    print_warning "Creating Python virtual environment..."
    python3 -m venv venv
    print_status "Virtual environment created"
fi

# Activate and install dependencies
source venv/bin/activate
print_warning "Installing Python dependencies..."
pip install --quiet -r requirements.txt
print_status "Python dependencies installed"

cd ..

# 6. Configuration Instructions
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Setup Complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "⚠️  IMPORTANT: You need to configure your Gemini API key!"
echo ""
echo "1. Get your Gemini API key:"
echo "   → Visit: https://makersuite.google.com/app/apikey"
echo "   → Click 'Create API Key'"
echo "   → Copy the key (starts with 'AIza...')"
echo ""
echo "2. Add it to .env file:"
echo "   → Edit: backend/.env"
echo "   → Replace: GEMINI_API_KEY=your_gemini_api_key_here"
echo "   → With: GEMINI_API_KEY=AIza...your_actual_key"
echo ""
echo "3. Start the services:"
echo ""
echo "   Terminal 1 (Backend):"
echo "   $ cd backend"
echo "   $ npm run dev"
echo ""
echo "   Terminal 2 (Analytics):"
echo "   $ cd analytics-service"
echo "   $ source venv/bin/activate"
echo "   $ python main.py"
echo ""
echo "4. Run tests:"
echo "   $ ./run-tests.sh"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
