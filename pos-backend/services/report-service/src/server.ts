import { createApp } from './app';
import { config, assertConfig } from './config';
import { prisma } from './lib/prisma';

const PORT = parseInt(config.PORT, 10);

async function main() {
  assertConfig();

  const app = createApp();

  const server = app.listen(PORT, () => {
    console.log(`🚀 ${config.SERVICE_NAME} listening on port ${PORT}`);
  });

  const gracefulShutdown = async (signal: string) => {
    console.log(`⚠️  ${signal} received, shutting down gracefully...`);
    server.close(async () => {
      await prisma.$disconnect();
      console.log('✅ Server closed');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
}

main().catch((err) => {
  console.error('Fatal boot error', err);
  process.exit(1);
});
