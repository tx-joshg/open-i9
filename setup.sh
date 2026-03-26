#!/bin/bash
# Open I-9 — First-time setup
# Run this once after cloning: ./setup.sh

set -e

echo ""
echo "========================================="
echo "  Open I-9 — Setup"
echo "========================================="
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
  echo "Error: Node.js is required. Install it from https://nodejs.org"
  exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
  echo "Error: Node.js 18+ is required. You have $(node -v)."
  exit 1
fi

echo "Node.js $(node -v) detected."

# Check for Docker (needed for PostgreSQL)
if ! command -v docker &> /dev/null; then
  echo ""
  echo "Warning: Docker not found. You'll need PostgreSQL running somewhere."
  echo "  Install Docker: https://docs.docker.com/get-docker/"
  echo "  Or set DATABASE_URL in .env to an existing PostgreSQL instance."
fi

# Install dependencies
if [ ! -d "node_modules" ]; then
  echo ""
  echo "Installing dependencies..."
  npm install
else
  echo "Dependencies already installed."
fi

# Create .env if it doesn't exist
if [ ! -f ".env" ]; then
  echo ""
  echo "Creating .env file..."
  cp .env.example .env

  # Generate encryption key
  ENCRYPTION_KEY=$(openssl rand -hex 32)
  if [ "$(uname)" = "Darwin" ]; then
    sed -i '' "s/^DATA_ENCRYPTION_KEY=\"\"/DATA_ENCRYPTION_KEY=\"$ENCRYPTION_KEY\"/" .env
  else
    sed -i "s/^DATA_ENCRYPTION_KEY=\"\"/DATA_ENCRYPTION_KEY=\"$ENCRYPTION_KEY\"/" .env
  fi

  echo "Encryption key generated automatically."
else
  echo ".env already exists — skipping."
fi

# Start PostgreSQL via Docker if not already running
if command -v docker &> /dev/null; then
  if ! docker ps --format '{{.Names}}' | grep -q '^i9-postgres$'; then
    echo ""
    echo "Starting PostgreSQL via Docker..."
    docker run -d \
      --name i9-postgres \
      -e POSTGRES_PASSWORD=password \
      -e POSTGRES_DB=i9portal \
      -p 5432:5432 \
      postgres:16-alpine 2>/dev/null || echo "Port 5432 may be in use — using existing PostgreSQL."
    sleep 3
  else
    echo "PostgreSQL container already running."
  fi
fi

# Run database migrations
echo ""
echo "Setting up database..."
npx prisma migrate dev --name init --skip-generate 2>/dev/null || npx prisma migrate dev --skip-generate
npx prisma generate

echo ""
echo "========================================="
echo "  Setup complete!"
echo "========================================="
echo ""
echo "  Start the app:    npm run dev"
echo ""
echo "  Then open http://localhost:3000"
echo "  to create your admin account and"
echo "  configure your portal."
echo ""
