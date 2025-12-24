import { createRsbuild, loadConfig, logger } from '@rsbuild/core';
import express from 'express';
import { toNodeHandler } from 'srvx/node'

const serverRender = (serverAPI) => async (req, res, id) => {
  const indexModule = await serverAPI.environments.server.loadBundle('index');
  await toNodeHandler(req => indexModule.default.fetch(req, id))(req, res)
};

async function startDevServer() {
  const { content } = await loadConfig({});

  // Init Rsbuild
  const rsbuild = await createRsbuild({
    rsbuildConfig: content,
  });

  const app = express();

  // Create Rsbuild DevServer instance
  const rsbuildServer = await rsbuild.createDevServer();

  const serverRenderMiddleware = serverRender(rsbuildServer);

  app.get('/', async (req, res, next) => {
    if (req.headers['accept']?.includes('text/x-component')) {
        try {
            await serverRenderMiddleware(req, res);
        } catch (err) {
        logger.error('SSR render error, downgrade to CSR...');
        logger.error(err);
        next();
        }
    } else {
        next();
    }
  });

  app.post('/', async (req, res) => {
    await serverRenderMiddleware(req, res);
  });

  app.get('/todos/:id', async (req, res) => {
    try {
      await serverRenderMiddleware(req, res, Number(req.params.id));
    } catch (err) {
      logger.error('SSR render error, downgrade to CSR...');
      logger.error(err);
      next();
    }
  });

  app.post('/todos/:id', async (req, res) => {
    await serverRenderMiddleware(req, res, Number(req.params.id));
  });

  // Apply Rsbuild’s built-in middlewares
  app.use(rsbuildServer.middlewares);

  const httpServer = app.listen(rsbuildServer.port, () => {
    // Notify Rsbuild that the custom server has started
    rsbuildServer.afterListen();
  });

  rsbuildServer.connectWebSocket({ server: httpServer });

  return {
    close: async () => {
      await rsbuildServer.close();
      httpServer.close();
    },
  };
}

startDevServer();
