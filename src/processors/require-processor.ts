import typescript from 'typescript';
import { BaseParseResult, Processor } from './processor';

interface ParseResult extends BaseParseResult {
    node: typescript.CallExpression;
}

/**
 * Processor for `require('module')`
 */
export class RequireProcessor extends Processor {
    parse(node: typescript.Node): ParseResult | undefined {
        if (
            this.ts.isCallExpression(node) &&
            this.ts.isIdentifier(node.expression) &&
            node.expression.text === 'require' &&
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
