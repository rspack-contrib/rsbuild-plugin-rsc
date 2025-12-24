import type { RsbuildConfig, RsbuildEntry, RsbuildPlugin, SourceConfig } from '@rsbuild/core';
import { rspack } from '@rsbuild/core';
import { SsrEntryPlugin } from './ssrEntryPlugin.js';
import type { PluginRSCOptions } from './types.js';

export const PLUGIN_RSC_NAME = 'rsbuild:rsc';

// TODO: Rsbuild does not currently use a version of Rspack with RSC support, so we use a type assertion here to access RSC_LAYERS_NAMES.
const { createRscPlugins, RSC_LAYERS_NAMES } = rspack.experiments as any;

const ENVIRONMENT_NAMES = {
  SERVER: 'server',
  CLIENT: 'client',
};

function normalizeServerEntry(entry: RsbuildEntry): RsbuildEntry {
  if (typeof entry === "string" || Array.isArray(entry)) {
    return {
      index: {
        import: entry,
        layer: RSC_LAYERS_NAMES.reactServerComponents,
      },
    };
  }
  return {
    ...entry,
    layer: RSC_LAYERS_NAMES.reactServerComponents,
  };
}

export const pluginRSC = (
  pluginOptions: PluginRSCOptions = {},
): RsbuildPlugin => ({
  name: PLUGIN_RSC_NAME,

  setup(api) {
    const entries = pluginOptions.entries || {};

    api.modifyRsbuildConfig((config, { mergeRsbuildConfig }) => {
      const serverSource: SourceConfig | undefined = entries.rsc
        ? {
            entry: normalizeServerEntry(entries.rsc),
          }
        : undefined;

      const clientSource: SourceConfig | undefined = entries.client
        ? {
            entry: entries.client,
          }
        : undefined;

      const rscEnvironmentsConfig: RsbuildConfig = {
        tools: {
          swc: {
            // TODO: Rsbuild does not currently use a version of Rspack with RSC support, so we use a type assertion here to access RSC_LAYERS_NAMES.
            rspackExperiments: {
              reactServerComponents: true,
            } as any,
          },
        },
        environments: {
          server: {
            source: serverSource,
            output: {
              target: 'node',
            },
          },
          client: {
            source: clientSource,
            output: {
              target: 'web',
            },
          },
        },
      };
      return mergeRsbuildConfig(config, rscEnvironmentsConfig);
    });

    let rscPlugins: ReturnType<typeof createRscPlugins>;

    api.modifyBundlerChain(async (chain, { environment }) => {
      // The RSC plugin is currently incompatible with lazyCompilation; this feature has been forcibly disabled.
      chain.lazyCompilation(false);

      if (!rscPlugins) {
        rscPlugins = createRscPlugins();
      }

      if (environment.name === ENVIRONMENT_NAMES.SERVER) {
        if (entries.ssr) {
          chain
            .plugin('rsc-ssr-entry')
            .use(SsrEntryPlugin, [entries.ssr]);
        } else {
          // If entries.ssr exists, SsrEntryPlugin will handle the addition, so no need to add it again.
          chain.module
            .rule('rsc-resolve')
            .issuerLayer(RSC_LAYERS_NAMES.reactServerComponents)
            .resolve.conditionNames.add('react-server')
            .add('...');
        }
        chain.plugin('rsc-server').use(rscPlugins.ServerPlugin);
      }
      if (environment.name === ENVIRONMENT_NAMES.CLIENT) {
        chain.plugin('rsc-client').use(rscPlugins.ClientPlugin);
      }
    });
  },
});
