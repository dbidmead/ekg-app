#!/bin/bash

# Kill any running Vite processes
pkill -f vite

# Clear any cached files
rm -rf node_modules/.vite

# Start the dev server with the dev configuration
echo "Starting development server with clean configuration..."
npm run dev 