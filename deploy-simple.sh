#!/bin/bash

# Build the project with relative paths
echo "Building project..."
npm run build

# Create .nojekyll file to disable Jekyll processing
touch dist/.nojekyll

# Add empty 404.html which will redirect to index.html
cat > dist/404.html << EOL
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta http-equiv="refresh" content="0;url=./">
  <title>Redirecting...</title>
</head>
<body>
  <p>If you are not redirected automatically, <a href="./">click here</a>.</p>
</body>
</html>
EOL

# Deploy to GitHub Pages
echo "Deploying to GitHub Pages..."
npx gh-pages -d dist

echo "Deployment complete!" 