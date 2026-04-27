#!/bin/bash
set -euo pipefail

echo "Setting up OmniSocial development environment..."

# Check for npm
if ! command -v npm &> /dev/null; then
    echo "Error: npm is not installed."
    exit 1
fi

# Install dependencies
echo "Installing dependencies..."
npm install

# Create .env from .env.example if it doesn't exist
if [ ! -f .env ]; then
    echo "Creating .env from .env.example..."
    cp .env.example .env
    echo "Please update your .env file with your GEMINI_API_KEY."
fi

echo "Setup complete! Run 'npm run dev' to start the development server."
