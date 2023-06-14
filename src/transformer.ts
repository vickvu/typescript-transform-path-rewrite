import typescript from 'typescript';
import type { PluginConfig, TransformerExtras } from 'ts-patch';
import type { Program, SourceFile, TransformationContext, Node } from 'typescript';

import { createProcessors, Processor } from './processors';
import { Resolver } from './resolver';

export default function (program: Program, pluginConfig: PluginConfig, extras: TransformerExtras) {
    const ts = extras?.ts ?? typescript;
    const compilerOptions = program.getCompilerOptions();
    const resolver = new Resolver(ts, compilerOptions, <Record<string, string>>pluginConfig.alias);
    return (ctx: TransformationContext) => {
        const processors: Processor[] = createProcessors(ts, ctx.factory);
        return (sourceFile: SourceFile) => {
            function visitor(node: Node): Node {
                let resultNode: Node;
                processors.forEach(function (processor) {
                    const parseResult = processor.parse(node);
                    if (parseResult) {
                        const moduleName = resolver.resolve(parseResult.moduleName, sourceFile.fileName);
                        if (moduleName != null) {
                            resultNode = processor.updateModuleName(moduleName, parseResult);
                        }
                    }
                });
                return resultNode ?? ts.visitEachChild(node, visitor, ctx);
            }
            return ts.visitEachChild(sourceFile, visitor, ctx);
        };
    };
}
