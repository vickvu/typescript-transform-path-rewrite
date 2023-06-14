import type TSNode from 'ts-node';
import ts from 'typescript';
import type { PluginConfig } from 'ts-patch';
import transformer from './transformer';
import { PROJECT_NAME } from './constants';

export function createTransformers(program: ts.Program, configs: PluginConfig[], oldTransfromers?: ts.CustomTransformers): ts.CustomTransformers {
    const { before: oldBefore, after: oldAfter, afterDeclarations: oldAfterDeclarations, ...theRest } = oldTransfromers ?? {};
    const before: typeof oldBefore = [];
    const after: typeof oldAfter = [];
    const afterDeclarations: typeof oldAfterDeclarations = [];
    configs.forEach(function (config) {
        if (config.afterDeclarations) {
            afterDeclarations.push(transformer(program, config, null));
        } else {
            before.push(transformer(program, config, null));
        }
    });
    if (oldBefore) {
        before.push(...oldBefore);
    }
    if (oldAfter) {
        after.push(...oldAfter);
    }
    if (oldAfterDeclarations) {
        afterDeclarations.push(...oldAfterDeclarations);
    }

    return {
        before,
        afterDeclarations,
        ...theRest,
    };
}

export function register(): TSNode.RegisterOptions {
    // Load ts-node library
    /* eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-var-requires */
    const tsNode: typeof TSNode = require('ts-node');

    // Check if ts-node is already loaded
    let tsNodeService = global.process[tsNode.REGISTER_INSTANCE];
    if (!tsNodeService) {
        // If not loaded, create a new instance
        tsNodeService = tsNode.register();
    }

    const transformerConfigs: PluginConfig[] = [];
    const pluginConfigs = <PluginConfig[]>tsNodeService.config.options.plugins;
    pluginConfigs?.forEach(function (pluginConfig) {
        // if after=true, the transformer won't be call before the module resolver
        // There is no reason for after to be true
        if (!pluginConfig.after && (pluginConfig.transform === process.env.TRANSFORM_PLUGIN_NAME || PROJECT_NAME)) {
            transformerConfigs.push(pluginConfig);
        }
    });

    // Shallow clone register options
    const registerOptions: TSNode.RegisterOptions = Object.assign({}, tsNodeService.options);
    if (registerOptions.transformers) {
        // Merge with current transformer
        if (typeof registerOptions.transformers === 'function') {
            const oldTransfomersFactory = registerOptions.transformers;
            // Redifine the transformers
            registerOptions.transformers = (program) => {
                const oldTransformers = oldTransfomersFactory(program);
                return createTransformers(program, transformerConfigs, oldTransformers);
            };
        } else {
            const oldTransformers = registerOptions.transformers;
            registerOptions.transformers = function (program: ts.Program) {
                return createTransformers(program, transformerConfigs, oldTransformers);
            };
        }
    } else {
        registerOptions.transformers = function (program: ts.Program) {
            return createTransformers(program, transformerConfigs);
        };
    }
    tsNode.register(registerOptions);
    return registerOptions;
}

register();
