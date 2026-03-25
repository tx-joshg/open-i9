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

  echo "Environment configured with SQLite (local dev database)."
  echo "Encryption key generated automatically."
else
  echo ".env already exists — skipping."
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
echo "  Then open http://localhost:3000/admin"
echo "  to create your admin account and"
echo "  configure your portal."
echo ""
