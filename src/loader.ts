import ts from 'typescript';
import { load as tsNodeLoad, resolve as tsNodeResolve } from 'ts-node/esm';
import tsNode from 'ts-node';
import type { PluginConfig } from 'ts-patch';
import { PROJECT_NAME } from './constants';
import { Resolver } from './resolver';

/**
 * Load context
 */
interface LoadContext {
    /**
     *  The format optionally supplied by the resolve hook chain
     */
    format?: string;
}

/**
 * The load hook provides a way to define a custom method of determining how a URL should be interpreted, retrieved, and parsed.
 * It is also in charge of validating the import assertion.
 * @see https://nodejs.org/docs/latest/api/esm.html#loadurl-context-nextload
 * @deprecated The loaders API is being redesigned. This hook may disappear or its signature may change. Do not rely on the API described below.
 * @param url The URL returned by the `resolve` chain
 * @param context Context
 * @param nextLoad The subsequent `load` hook in the chain, or the Node.js default `load` hook after the last user-supplied `load` hook
 */
export function load(url: string, context: LoadContext, nextLoad: unknown): unknown {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    return tsNodeLoad(url, context, nextLoad);
}

/**
 * Load context
 */
interface ResolveContext {
    /**
     * The module importing this one, or undefined if this is the Node.js entry point
     */
    parentURL?: string;
}

/**
 * The `resolve` hook chain is responsible for telling Node.js where to find and how to cache a given `import` statement or expression.
 * @see https://nodejs.org/docs/latest/api/esm.html#resolvespecifier-context-nextresolve
 * @deprecated The loaders API is being redesigned. This hook may disappear or its signature may change. Do not rely on the API described below.
 * @param specifier
 * @param context
 * @param nextResolve The subsequent `resolve` hook in the chain, or the Node.js default `resolve` hook after the last user-supplied resolve hook
 */
export function resolve(specifier: string, context: ResolveContext, nextResolve: unknown): Promise<unknown> {
    let resolvedSpecifier;
    if (context.parentURL) {
        resolvedSpecifier = getResolver().resolve(specifier, new URL(context.parentURL).pathname);
    }
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return
    return tsNodeResolve(resolvedSpecifier ?? specifier, context, nextResolve);
}

let resolver: Resolver;

function getResolver(): Resolver {
    if (!resolver) {
        // Check if ts-node is already loaded
        let tsNodeService = global.process[tsNode.REGISTER_INSTANCE];
        if (!tsNodeService) {
            // If not loaded, create a new instance
            tsNodeService = tsNode.register();
        }
        const alias: Record<string, string> = {};
        const pluginConfigs = tsNodeService.config.options.plugins as PluginConfig[];
        pluginConfigs?.forEach(function (pluginConfig) {
            // if after=true, the transformer won't be call before the module resolver
            // There is no reason for after to be true
            if (!pluginConfig.after && (pluginConfig.transform === process.env.TRANSFORM_PLUGIN_NAME || PROJECT_NAME)) {
                Object.assign(alias, pluginConfig.alias);
            }
        });
        resolver = new Resolver(ts, tsNodeService.config.options, alias);
    }
    return resolver;
}
