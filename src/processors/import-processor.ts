import typescript from 'typescript';
import { BaseParseResult, Processor } from './processor';

interface ParseResult extends BaseParseResult {
    node: typescript.ImportDeclaration;
}

/**
 * Processor for `import module from 'module'`
 */
export class ImportProcessor extends Processor {
    parse(node: typescript.Node): ParseResult {
        if (this.ts.isImportDeclaration(node) && this.ts.isStringLiteral(node.moduleSpecifier)) {
            return {
                node,
                moduleName: node.moduleSpecifier.text,
            };
        }
        return null;
    }

    updateModuleName(moduleName: string, { node }: ParseResult): typescript.Node {
        return this.factory.updateImportDeclaration(
            node,
            node.modifiers,
            node.importClause,
            this.factory.createStringLiteral(moduleName),
            node.assertClause,
        );
    }
}
