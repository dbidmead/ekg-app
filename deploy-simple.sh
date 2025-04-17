#!/bin/bash

# Build the project 
echo "Building project..."
npm run build

# Create .nojekyll file to disable Jekyll processing
touch dist/.nojekyll

# Deploy to GitHub Pages
echo "Deploying to GitHub Pages..."
npx gh-pages -d dist

echo "Deployment complete!" 