import { logger, closeRedis } from '@pos/shared';
import { createApp } from './app';
import { config, assertConfig } from './config';
import { prisma } from './lib/prisma';

async function seedDefaults() {
  const count = await prisma.plan.count();
  if (count > 0) return;
  logger.info('Seeding default plans');
  await prisma.plan.createMany({
    data: [
      { name: 'Free', max_outlets: 1, max_products: 50, max_users: 3, price_monthly: 0, price_yearly: 0 },
      { name: 'Pro', max_outlets: 3, max_products: 1000, max_users: 15, price_monthly: 299000, price_yearly: 2990000 },
      { name: 'Enterprise', max_outlets: 99, max_products: 100000, max_users: 100, price_monthly: 999000, price_yearly: 9990000 },
    ],
  });
}

async function main() {
  assertConfig();
  await seedDefaults().catch((err) => logger.error('Seed failed', { err: (err as Error).message }));
  const app = createApp();
  const server = app.listen(config.port, () => {
    logger.info(`${config.serviceName} listening on :${config.port}`);
  });

  const shutdown = async (signal: string) => {
    logger.info(`Received ${signal}, shutting down...`);
    server.close();
    await prisma.$disconnect();
    await closeRedis();
    process.exit(0);
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Fatal boot error', err);
  process.exit(1);
});
