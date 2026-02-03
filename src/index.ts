import type { RsbuildConfig, RsbuildPlugin } from '@rsbuild/core';
import { logger, rspack } from '@rsbuild/core';
import type { PluginRSCOptions } from './types.js';

export const PLUGIN_RSC_NAME = 'rsbuild:rsc';

const rsc: typeof rspack.experiments.rsc = rspack.experiments.rsc;

export const Layers: typeof rsc.Layers = rsc.Layers;

export const pluginRSC = (
  pluginOptions: PluginRSCOptions = {},
): RsbuildPlugin => ({
  name: PLUGIN_RSC_NAME,

  setup(api) {
    const { server = 'server', client = 'client' } =
      pluginOptions.environments || {};

    api.modifyRsbuildConfig((config, { mergeRsbuildConfig }) => {
      const rscEnvironmentsConfig: RsbuildConfig = {
        tools: {
          swc: {
            rspackExperiments: {
              reactServerComponents: true,
            },
          },
        },
        environments: {
          [server]: {
            output: {
              target: 'node',
            },
          },
          [client]: {
            output: {
              target: 'web',
            },
          },
        },
      };
      return mergeRsbuildConfig(config, rscEnvironmentsConfig);
    });

    let rscPlugins: ReturnType<typeof rsc.createPlugins>;

    let sendServerComponentChanges: (() => void) | undefined;
    api.onBeforeStartDevServer(({ server }) => {
      sendServerComponentChanges = () =>
        server.sockWrite('custom', { event: 'rsc:update' });
    });

    api.modifyBundlerChain(async (chain, { environment }) => {
      // The RSC plugin is currently incompatible with lazyCompilation; this feature has been forcibly disabled.
      const lazyCompilation = chain.get('lazyCompilation');
      if (
        lazyCompilation === true ||
        (typeof lazyCompilation === 'object' && lazyCompilation !== null)
      ) {
        logger.warn(
          'The RSC plugin is currently incompatible with lazyCompilation. This feature will be forcibly disabled.',
        );
        chain.lazyCompilation(false);
      }

      if (!rscPlugins) {
        rscPlugins = rsc.createPlugins();
      }

      if (environment.name === server) {
        const { rsc, ssr } = pluginOptions.layers || {};

        if (ssr) {
          chain.module.rule('ssr-entry').test(ssr).layer(Layers.ssr);
        }
        if (rsc) {
          chain.module.rule('rsc-entry').test(rsc).layer(Layers.rsc);
        }

        let rule = chain.module.rule('rsc-resolve');
        if (ssr) {
          rule = rule.exclude.add(ssr).end();
        }
        rule
          .issuerLayer([Layers.rsc])
          .resolve.conditionNames.add('react-server')
          .add('...');

        chain.plugin('rsc-server').use(rscPlugins.ServerPlugin, [
          {
            onServerComponentChanges() {
              sendServerComponentChanges?.();
            },
          },
        ]);
      }
      if (environment.name === client) {
        chain.plugin('rsc-client').use(rscPlugins.ClientPlugin);
      }
    });
  },
});
