import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
// import { errorHandler, notFoundHandler } from '@pos/shared';
import productRoutes from "./routes/product.routes";
import categoryRoutes from "./routes/category.routes";
import stockRoutes from "./routes/stock.routes";
import { setupSwagger } from "./swagger";
import { config } from "./config";

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: config.CORS_ORIGIN, credentials: true }));
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: true }));
  app.use(morgan(config.NODE_ENV === "development" ? "dev" : "combined"));

  app.get("/health", (_req, res) =>
    res.json({
      success: true,
      data: { status: "ok", service: config.SERVICE_NAME },
    }),
  );

  setupSwagger(app);

  app.use("/api/products", productRoutes);
  app.use("/api/categories", categoryRoutes);
  app.use("/api/stock", stockRoutes);

  // TODO: Add error handlers when implemented in shared package
  // app.use(notFoundHandler);
  // app.use(errorHandler);

  return app;
}
