import { logger, closeRedis } from "@pos/shared";
import { createApp } from "./app";
import { config, assertConfig } from "./config";
import { prisma } from "./lib/prisma";

async function main() {
  assertConfig();

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
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("Fatal boot error", err);
  process.exit(1);
});
