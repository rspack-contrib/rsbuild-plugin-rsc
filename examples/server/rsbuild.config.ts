import { defineConfig } from '@rsbuild/core';
import { pluginRSC } from 'rsbuild-plugin-rsc';
import { pluginReact } from "@rsbuild/plugin-react";
import { toNodeHandler } from 'srvx/node';
import { IncomingMessage, ServerResponse } from 'node:http';

export default defineConfig({
  plugins: [
      pluginReact(),
      pluginRSC({
          entries: {
            rsc: './src/framework/entry.rsc.tsx',
            ssr: './src/framework/entry.ssr.tsx',
            client: './src/framework/entry.client.tsx',
          },
      })
  ],
  dev: {
    setupMiddlewares: (middlewares, serverAPI) => {
      // Custom middleware to handle RSC (React Server Components) requests
  
      async function fetch(req: IncomingMessage, res: ServerResponse<IncomingMessage>, id?: number) {
        const indexModule = await serverAPI.environments.server.loadBundle<any>('index');
        await toNodeHandler(req => indexModule.default.fetch(req, id))(req, res)
      }

      middlewares.unshift(async (req, res, next) => {
        // Handle GET requests to root path
        if (req.method === 'GET' && req.url === '/') {
          await fetch(req, res);
          return;
        }
        
        // Handle POST requests to root path
        if (req.method === 'POST' && req.url === '/') {
          await fetch(req, res);
          return;
        }
        
        // Handle GET requests to /todos/:id
        if (req.method === 'GET' && req.url?.startsWith('/todos/')) {
          const id = req.url.split('/')[2];
          if (id) {
            await fetch(req, res, Number(id));
            return;
          }
        }
        
        // Handle POST requests to /todos/:id
        if (req.method === 'POST' && req.url?.startsWith('/todos/')) {
          const id = req.url.split('/')[2];
          if (id) {
            await fetch(req, res, Number(id));
            return;
          }
        }

        next();
      });
    }
  }
});
