import typescript from 'typescript';
import { BaseParseResult, Processor } from './processor';

interface ParseResult extends BaseParseResult {
    node: typescript.ImportTypeNode;
}

/**
 * Processor for `typeof import('module')` or (in d.ts) `import ('module').Type`
 */
export class ImportTypeProcessor extends Processor {
    parse(node: typescript.Node): ParseResult {
        if (this.ts.isImportTypeNode(node)) {
            const argument = <typescript.LiteralTypeNode>node.argument;
            if (this.ts.isStringLiteral(argument.literal)) {
                const { text: moduleName } = argument.literal;
                return {
                    node,
                    moduleName,
                };
            }
        }
        return null;
    }

    updateModuleName(moduleName: string, { node }: ParseResult): typescript.Node {
        return this.factory.updateImportTypeNode(
            node,
            this.factory.updateLiteralTypeNode(<typescript.LiteralTypeNode>node.argument, this.factory.createStringLiteral(moduleName)),
            node.assertions,
            node.qualifier,
            node.typeArguments,
            node.isTypeOf,
        );
    }
}
