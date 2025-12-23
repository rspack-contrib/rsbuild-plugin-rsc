import type { Minify } from '@rsbuild/core';
import { defineConfig, type LibConfig } from '@rslib/core';
import { pluginAreTheTypesWrong } from 'rsbuild-plugin-arethetypeswrong';

const commonExternals: Array<string | RegExp> = [
  'webpack',
  /[\\/]compiled[\\/]/,
];

const nodeMinifyConfig: Minify = {
  js: true,
  css: false,
  jsOptions: {
    minimizerOptions: {
      // preserve variable name and disable minify for easier debugging
      mangle: false,
      minify: false,
      compress: {
        keep_fnames: true,
      },
    },
  },
};

const esmConfig: LibConfig = {
  format: 'esm',
  experiments: {
    advancedEsm: true,
  },
  syntax: 'es2022',
  dts: {
    build: true,
    // Only use tsgo in local dev for faster build, disable it in CI until it's more stable
    tsgo: !process.env.CI,
  },
  output: {
    minify: nodeMinifyConfig,
  },
};

const cjsConfig: LibConfig = {
  format: 'cjs',
  syntax: 'es2022',
  output: {
    minify: nodeMinifyConfig,
  },
};

export default defineConfig({
  lib: [esmConfig, cjsConfig],
  tools: {
    rspack: {
      externals: commonExternals,
    },
  },
  plugins: [
    pluginAreTheTypesWrong({
      enable: Boolean(process.env.CI),
      areTheTypesWrongOptions: {
        ignoreRules: [
          // The dual package always provide the ESM types.
          'false-esm',
        ],
      },
    }),
  ],
});