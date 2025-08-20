#!/bin/bash

echo "🗑️  Resetting database..."

# Stop any running servers
pkill -f "ts-node src/server.ts" 2>/dev/null || true
pkill -f "node dist/server.js" 2>/dev/null || true

# Remove database files
rm -f crawler.db*

echo "✅ Database reset complete!"

# Check if PM2 process exists and reload it
if pm2 list | grep -q "as-decoder"; then
    echo "🔄 Reloading PM2 application..."
    pm2 reload as-decoder
    echo "✅ Application reloaded!"
else
    echo "📝 PM2 process not found. To start the app:"
    echo "   npm run dev    # Start in development"
    echo "   npm run start  # Start with PM2"
fi

echo "📝 To add test data: npm run seed"