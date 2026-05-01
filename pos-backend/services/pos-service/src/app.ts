import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import './types';
import cartRoutes from './routes/cart.routes';
import transactionRoutes from './routes/transaction.routes';
import shiftRoutes from './routes/shift.routes';
import refundRoutes from './routes/refund.routes';
import { config } from './config';

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: config.CORS_ORIGIN, credentials: true }));
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(morgan(config.NODE_ENV === 'development' ? 'dev' : 'combined'));

  app.get('/health', (_req, res) =>
    res.json({ success: true, data: { status: 'ok', service: config.SERVICE_NAME } })
  );

  // Routes
  app.use('/api/cart', cartRoutes);
  app.use('/api/transactions', transactionRoutes);
  app.use('/api/shifts', shiftRoutes);
  app.use('/api/refunds', refundRoutes);

  return app;
}
