// This is a TypeScript file that serves as a fallback for GitHub Pages
console.log('This file is a fallback for GitHub Pages and should not be loaded directly');

// For development, provide a proper error message
if (window.location.hostname.includes('localhost') || window.location.hostname.includes('127.0.0.1')) {
  document.body.innerHTML = `
    <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px; background-color: #f9f9f9;">
      <h1 style="color: #d32f2f; margin-top: 0;">Development Error</h1>
      <p>You're seeing this message because your browser tried to load <code>src/main.tsx</code> directly.</p>
      <p>Please restart your Vite development server if you're experiencing issues.</p>
      <pre style="background-color: #f1f1f1; padding: 10px; border-radius: 4px; overflow: auto;">npm run dev</pre>
    </div>
  `;
} 