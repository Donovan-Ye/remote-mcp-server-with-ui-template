// Vercel Serverless Function Entry Point
// Minimal wrapper that loads and exports the Express app

// Set VERCEL environment flag before importing anything
process.env.VERCEL = '1';

// Import the Express app (it will be initialized but not call listen())
const appModule = require('../packages/mcp-server/dist/cjs/index.cjs');

// The app is returned from the initializeOAuth() promise
// Vercel will handle this async initialization
module.exports = async (req, res) => {
  try {
    // Wait for the app to be initialized
    const app = await (appModule.default || appModule);

    // Handle the request with the Express app
    return app(req, res);
  } catch (error) {
    console.error('Error initializing app:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

