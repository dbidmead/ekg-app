#!/bin/bash

# Set NODE_ENV to production
export NODE_ENV=production

# Build the project
echo "Building project..."
npm run build

# Create a .nojekyll file in the dist directory
touch dist/.nojekyll

# Copy our production-specific index.html to dist
echo "Copying production index.html..."
cp public/index.production.html dist/index.html

# Make sure the 404.html file is in the dist directory
cp public/404.html dist/

# Deploy to GitHub Pages
echo "Deploying to GitHub Pages..."
npx gh-pages -d dist

echo "Deployment complete!" 