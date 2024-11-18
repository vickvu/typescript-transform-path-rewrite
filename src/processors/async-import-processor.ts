import typescript from 'typescript';
import { BaseParseResult, Processor } from './processor';

interface ParseResult extends BaseParseResult {
    node: typescript.CallExpression;
}

/**
 * Processor for `import('module').then()`
 */
export class AsyncImportProcessor extends Processor {
    parse(node: typescript.Node) {
        if (
            this.ts.isCallExpression(node) &&
            node.expression.kind === this.ts.SyntaxKind.ImportKeyword &&
            this.ts.isStringLiteral(node.arguments[0]) &&
            node.arguments.length === 1
        ) {
            return {
                node,
                moduleName: node.arguments[0].text,
            };
        }
        return undefined;
    }

    updateModuleName(moduleName: string, { node }: ParseResult) {
        return this.factory.updateCallExpression(node, node.expression, node.typeArguments, [this.factory.createStringLiteral(moduleName)]);
    }
}
