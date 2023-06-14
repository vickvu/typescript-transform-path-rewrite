import typescript from 'typescript';
import { BaseParseResult, Processor } from './processor';

interface ParseResult extends BaseParseResult {
    node: typescript.ExternalModuleReference;
}

/**
 * Processor for `import module = require('module')`
 */
export class ImportRequireProcessor extends Processor {
    parse(node: typescript.Node): ParseResult {
        if (this.ts.isExternalModuleReference(node) && this.ts.isStringLiteral(node.expression)) {
            return {
                node,
                moduleName: node.expression.text,
            };
        }
        return null;
    }

    updateModuleName(moduleName: string, { node }: ParseResult): typescript.Node {
        return this.factory.updateExternalModuleReference(node, this.factory.createStringLiteral(moduleName));
    }
}
