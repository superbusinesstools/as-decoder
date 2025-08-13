#!/bin/bash

echo "🗑️  Resetting database..."

# Stop any running servers
pkill -f "ts-node src/server.ts" 2>/dev/null || true
pkill -f "node dist/server.js" 2>/dev/null || true

# Remove database files
rm -f crawler.db*

echo "✅ Database reset complete!"
echo "📝 To test again:"
echo "   npm run dev    # Start server"
echo "   npm run seed   # Add test data"