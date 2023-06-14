import typescript from 'typescript';
import { BaseParseResult, Processor } from './processor';

interface ParseResult extends BaseParseResult {
    node: typescript.ExportDeclaration;
}

/**
 * Processor for `export module from 'module`
 */
export class ExportProcessor extends Processor {
    parse(node: typescript.Node): ParseResult {
        if (this.ts.isExportDeclaration(node) && node.moduleSpecifier && this.ts.isStringLiteral(node.moduleSpecifier)) {
            return {
                node,
                moduleName: node.moduleSpecifier.text,
            };
        }
        return null;
    }

    updateModuleName(moduleName: string, { node }: ParseResult): typescript.Node {
        return this.factory.updateExportDeclaration(
            node,
            node.modifiers,
            node.isTypeOnly,
            node.exportClause,
            this.factory.createStringLiteral(moduleName),
            node.assertClause,
        );
    }
}
