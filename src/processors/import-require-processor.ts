import typescript from 'typescript';
import { BaseParseResult, Processor } from './processor';

interface ParseResult extends BaseParseResult {
    node: typescript.ExternalModuleReference;
}

/**
 * Processor for `import module = require('module')`
 */
export class ImportRequireProcessor extends Processor {
    parse(node: typescript.Node) {
        if (this.ts.isExternalModuleReference(node) && this.ts.isStringLiteral(node.expression)) {
            return {
                node,
                moduleName: node.expression.text,
            };
        }
        return undefined;
    }

    updateModuleName(moduleName: string, { node }: ParseResult) {
        return this.factory.updateExternalModuleReference(node, this.factory.createStringLiteral(moduleName));
    }
}
