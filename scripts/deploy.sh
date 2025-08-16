#!/bin/bash

# AS-Decoder Deployment Script
# This script pulls latest changes, builds the project, and restarts pm2

set -e  # Exit on any error

echo "🚀 Starting deployment..."

# Pull latest changes
echo "📥 Pulling latest changes from git..."
git pull origin master

# Install dependencies (only if package.json changed)
echo "📦 Installing dependencies..."
npm install

# Build the project
echo "🔨 Building TypeScript project..."
npm run build

# Restart pm2 process
echo "🔄 Restarting pm2 process..."
pm2 restart as-decoder

echo "✅ Deployment completed successfully!"
echo "📊 Process status:"
pm2 list