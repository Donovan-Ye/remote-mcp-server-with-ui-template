import express, { Router } from "express";
import aliRouter from "./ali";

const apiRouter = Router();
apiRouter.use("/ali", aliRouter);
const isDev = process.env.NODE_ENV === 'development';

export const setupApisRouter = (app: express.Application, middleware: express.RequestHandler) => {
  if (isDev) {
    app.use("/api", apiRouter);
  } else {
    app.use("/api", middleware, apiRouter);
  }
}
