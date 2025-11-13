import path from "path";
import { winstonLogger } from "../utils/logger";
import express from "express";
import fs from "fs";
import { TokenVerifier } from "../types";

const isDev = process.env.NODE_ENV === 'development';

const router = express.Router()

const uiDistPath = path.join(process.cwd(), '../../', 'dist', 'ui')  // Monorepo root: ../../../../dist/ui

const uiIndexPath = path.join(uiDistPath, 'index.html');

// Check if UI build exists
const uiExists = fs.existsSync(uiDistPath) && fs.existsSync(uiIndexPath);

if (isDev) {
  // In development, redirect all /ui/* requests to the Vite dev server running on port 3001
  router.get(/(.*)/, (req, res) => {
    const targetUrl = `http://localhost:3001${req.originalUrl}`;
    res.redirect(targetUrl);
  });
} else if (uiExists) {
  winstonLogger.info('React UI found, serving at /ui/', { uiDistPath });

  // Serve static assets first (JS, CSS, images, etc.)
  router.use('/', express.static(uiDistPath));

  // For all other routes (non-static files), serve the React app (React Router will handle client-side routing)
  router.get(/(.*)/, (req, res) => {
    console.log('req', req.url)
    res.sendFile(uiIndexPath);
  });
}

const whitelistPatterns = [
  /assets\/.*/,
  /\/vite\.svg/,
]

const uiAuthMiddleware = (tokenVerifier: TokenVerifier) => async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (whitelistPatterns.some(pattern => req.url.match(pattern))) {
    next();
    return;
  }

  const token = req.query.token as string;
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const tokenInfo = await tokenVerifier.verifyAccessToken(token);
    req.auth = tokenInfo;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

export const setupUiRouter = (app: express.Application, tokenVerifier: TokenVerifier) => {
  if (isDev) {
    app.use("/ui", router);
  } else {
    app.use("/ui", uiAuthMiddleware(tokenVerifier), router);
  }
}
