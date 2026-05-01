import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { errorHandler, notFoundHandler } from '@pos/shared';
import authRoutes from './routes/auth.routes';
import { setupSwagger } from './swagger';
import { config } from './config';

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: config.corsOrigin, credentials: true }));
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(morgan(config.env === 'development' ? 'dev' : 'combined'));

  app.get('/health', (_req, res) =>
    res.json({ success: true, data: { status: 'ok', service: config.serviceName } })
  );

  setupSwagger(app);

  app.use('/api/auth', authRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
