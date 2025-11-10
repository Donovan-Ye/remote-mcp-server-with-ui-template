// Vercel Serverless Function Entry Point (ESM)
// Set VERCEL environment flag before importing anything
process.env.VERCEL = '1';

// Cache the initialized app to avoid re-initialization on each request
let appPromise = null;

async function getApp() {
  if (!appPromise) {
    console.log('Initializing Express app...');
    try {
      // Import the ESM module - it exports a Promise that resolves to the Express app
      const appModule = await import('../packages/mcp-server/dist/esm/index.js');
      
      // The module exports a Promise (from initializeOAuth().then(() => app))
      appPromise = Promise.resolve(appModule.default || appModule);
      
      const app = await appPromise;
      console.log('Express app initialized successfully');
      return app;
    } catch (error) {
      console.error('Failed to initialize app:', error);
      appPromise = null; // Reset so we can retry
      throw error;
    }
  }
  return appPromise;
}

export default async function handler(req, res) {
  try {
    const app = await getApp();
    
    // Pass the request to Express
    app(req, res);
  } catch (error) {
    console.error('Error handling request:', error);
    
    if (!res.headersSent) {
      res.status(500).json({ 
        error: 'Internal Server Error',
        message: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
}

