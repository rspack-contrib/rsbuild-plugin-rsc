import path from 'node:path';
import type { Rspack } from '@rsbuild/core';
import { rspack } from '@rsbuild/core';

const { RSC_LAYERS_NAMES } = rspack.experiments;

export class SsrEntryPlugin {
  #ssrEntries: string[];

  constructor(ssrEntries: string | string[]) {
    this.#ssrEntries = Array.isArray(ssrEntries) ? ssrEntries : [ssrEntries];
  }

  apply(compiler: Rspack.Compiler): void {
    const normalResolver = compiler.resolverFactory.get('normal');

    const exclude: string[] = [];
    for (const ssrEntry of this.#ssrEntries) {
      const resolvedSsrEntry = path.isAbsolute(ssrEntry)
        ? ssrEntry
        : normalResolver.resolveSync({}, compiler.context, ssrEntry);

      if (!resolvedSsrEntry) {
        throw new Error(
          `Can't resolve '${ssrEntry}' in '${compiler.context}'`,
        );
      }

      compiler.options.module.rules.push({
        resource: resolvedSsrEntry,
        layer: RSC_LAYERS_NAMES.REACT_SERVER_COMPONENTS,
      });
    }

    compiler.options.module.rules.push({
      issuerLayer: RSC_LAYERS_NAMES.REACT_SERVER_COMPONENTS,
      exclude,
      resolve: {
        conditionNames: ['react-server', '...'],
      },
    });
  }
}
