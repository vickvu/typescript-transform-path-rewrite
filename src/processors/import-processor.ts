import typescript, { ImportSpecifier, NamedImportBindings, NamedImports } from 'typescript';
import { BaseParseResult, Processor } from './processor';

interface ParseResult extends BaseParseResult {
    node: typescript.ImportDeclaration;
    keepImport: boolean;
    typeOnly?: boolean;
    nonTypeNamedBindings?: ImportSpecifier[];
}

function isNamedImports(bindings: NamedImportBindings): bindings is NamedImports {
    return Array.isArray((<NamedImports>bindings).elements);
}

/**
 * Processor for `import module from 'module'`
 */
export class ImportProcessor extends Processor {
    parse(node: typescript.Node): ParseResult {
        if (this.ts.isImportDeclaration(node) && this.ts.isStringLiteral(node.moduleSpecifier)) {
            if (node.importClause == null || node.getSourceFile() == null) {
                return {
                    node,
                    moduleName: node.moduleSpecifier.text,
                    keepImport: true,
                };
            }
            let typeOnly = node.importClause.isTypeOnly;
            const nonTypeNamedBindings: ImportSpecifier[] = [];
            if (!typeOnly && node.importClause.namedBindings && isNamedImports(node.importClause.namedBindings)) {
                node.importClause.namedBindings.elements.forEach(function (importSpecifier) {
                    if (!importSpecifier.isTypeOnly) {
                        nonTypeNamedBindings.push(importSpecifier);
                    }
                });
                typeOnly = nonTypeNamedBindings.length === 0;
            }
            return {
                node,
                keepImport: false,
                moduleName: node.moduleSpecifier.text,
                typeOnly,
                nonTypeNamedBindings,
            };
        }
        return null;
    }

    updateModuleName(moduleName: string, { node, keepImport, typeOnly, nonTypeNamedBindings }: ParseResult): typescript.Node {
        if (keepImport) {
            // For .d.ts file and file without import caluse (for .e.g. import '../src'), preserve the import
            return this.factory.updateImportDeclaration(
                node,
                node.modifiers,
                node.importClause,
                this.factory.createStringLiteral(moduleName),
                node.assertClause,
            );
        }
        if (typeOnly) {
            // Do not emit import for type only
            return null;
        }
        return this.factory.updateImportDeclaration(
            node,
            node.modifiers,
            this.factory.updateImportClause(
                node.importClause,
                false,
                node.importClause.name,
                this.factory.updateNamedImports(<NamedImports>node.importClause.namedBindings, nonTypeNamedBindings),
            ),
            this.factory.createStringLiteral(moduleName),
            node.assertClause,
        );
    }
}
