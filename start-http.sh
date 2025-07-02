#!/bin/bash

# Quick start script for MCP Web Browser HTTP Server

echo "🚀 Starting MCP Web Browser HTTP Server..."

# Check if .env file exists
if [ ! -f .env ]; then
    echo "📝 Creating .env file from template..."
    cp .env.example .env
    echo "⚠️  Please edit .env file with your API keys before running again"
    exit 1
fi

# Check if dist folder exists
if [ ! -d dist ]; then
    echo "🔨 Building TypeScript..."
    npm run build
fi

# Start the server
echo "🌐 Starting HTTP server on port 3000..."
npm run start:http

echo "✅ Server should be running at http://localhost:3000"
echo "📋 API endpoints:"
echo "   GET  /health - Health check"
echo "   GET  /info   - API documentation"
echo "   POST /api/search - Web search"
