import { defineConfig } from '@rsbuild/core';
import { pluginRSC } from 'rsbuild-plugin-rsc';
import { pluginReact } from "@rsbuild/plugin-react";

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
  ]
});
