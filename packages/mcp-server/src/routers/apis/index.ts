import express, { Router } from "express";
import aliRouter from "./ali";

const apiRouter = Router();
apiRouter.use("/ali", aliRouter);

export const setupApisRouter = (app: express.Application, middleware: express.RequestHandler) => {
  app.use("/api", middleware, apiRouter);
}
