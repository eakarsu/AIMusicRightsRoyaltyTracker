#!/bin/bash

# ============================================================
# AI Music Rights & Royalty Tracker - Start Script
# ============================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${PURPLE}"
echo "╔══════════════════════════════════════════════════════╗"
echo "║     🎶 AI Music Rights & Royalty Tracker 🎶         ║"
echo "║        Starting Application...                       ║"
echo "╚══════════════════════════════════════════════════════╝"
echo -e "${NC}"

# ============================================================
# Step 1: Clean up used ports
# ============================================================
echo -e "${YELLOW}[1/6] Cleaning up ports 3000 and 3001...${NC}"

cleanup_port() {
  local port=$1
  local pids=$(lsof -ti :$port 2>/dev/null || true)
  if [ -n "$pids" ]; then
    echo -e "  ${RED}Killing processes on port $port: $pids${NC}"
    echo "$pids" | xargs kill -9 2>/dev/null || true
    sleep 1
  else
    echo -e "  ${GREEN}Port $port is free${NC}"
  fi
}

cleanup_port 3000
cleanup_port 3001

# ============================================================
# Step 2: Check PostgreSQL
# ============================================================
echo -e "\n${YELLOW}[2/6] Checking PostgreSQL...${NC}"

if command -v pg_isready &> /dev/null; then
  if pg_isready -q 2>/dev/null; then
    echo -e "  ${GREEN}PostgreSQL is running${NC}"
  else
    echo -e "  ${YELLOW}Starting PostgreSQL...${NC}"
    if command -v brew &> /dev/null; then
      brew services start postgresql@14 2>/dev/null || brew services start postgresql 2>/dev/null || true
    fi
    sleep 2
  fi
else
  echo -e "  ${YELLOW}pg_isready not found, assuming PostgreSQL is running${NC}"
fi

# Create database if not exists
echo -e "  ${CYAN}Creating database if needed...${NC}"
createdb music_rights_tracker 2>/dev/null || echo -e "  ${GREEN}Database already exists${NC}"

# ============================================================
# Step 3: Install dependencies
# ============================================================
echo -e "\n${YELLOW}[3/6] Installing dependencies...${NC}"

echo -e "  ${CYAN}Installing server dependencies...${NC}"
cd "$SCRIPT_DIR/server"
npm install --silent 2>&1 | tail -1

echo -e "  ${CYAN}Installing client dependencies...${NC}"
cd "$SCRIPT_DIR/client"
npm install --silent 2>&1 | tail -1

cd "$SCRIPT_DIR"

# ============================================================
# Step 4: Seed database
# ============================================================
echo -e "\n${YELLOW}[4/6] Seeding database...${NC}"
cd "$SCRIPT_DIR/server"
node seeds/seed.js
cd "$SCRIPT_DIR"

# ============================================================
# Step 5: Start backend with hot reload (nodemon)
# ============================================================
echo -e "\n${YELLOW}[5/6] Starting backend server (port 3001) with hot reload...${NC}"
cd "$SCRIPT_DIR/server"
npx nodemon index.js &
SERVER_PID=$!
echo -e "  ${GREEN}Backend started (PID: $SERVER_PID)${NC}"
cd "$SCRIPT_DIR"

sleep 2

# ============================================================
# Step 6: Start frontend with hot reload (react-scripts)
# ============================================================
echo -e "\n${YELLOW}[6/6] Starting frontend (port 3000) with hot reload...${NC}"
cd "$SCRIPT_DIR/client"
BROWSER=none PORT=3000 npm start &
CLIENT_PID=$!
echo -e "  ${GREEN}Frontend started (PID: $CLIENT_PID)${NC}"
cd "$SCRIPT_DIR"

# ============================================================
# Ready
# ============================================================
echo -e "\n${GREEN}"
echo "╔══════════════════════════════════════════════════════╗"
echo "║              ✅ Application Started!                 ║"
echo "║                                                      ║"
echo "║  Frontend:  http://localhost:3000                    ║"
echo "║  Backend:   http://localhost:3001                    ║"
echo "║                                                      ║"
echo "║  Login:     admin@musicrights.com / password123      ║"
echo "║                                                      ║"
echo "║  Hot reload is enabled for both servers.             ║"
echo "║  Press Ctrl+C to stop all services.                  ║"
echo "╚══════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Trap to cleanup on exit
cleanup() {
  echo -e "\n${YELLOW}Shutting down...${NC}"
  kill $SERVER_PID 2>/dev/null || true
  kill $CLIENT_PID 2>/dev/null || true
  echo -e "${GREEN}All services stopped.${NC}"
  exit 0
}

trap cleanup SIGINT SIGTERM

# Wait for background processes
wait
