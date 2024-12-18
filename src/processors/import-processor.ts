import typescript, { ImportSpecifier, NamedImportBindings, NamedImports, SyntaxKind } from 'typescript';
import { BaseParseResult, Processor } from './processor';

interface ParseResult extends BaseParseResult {
    node: typescript.ImportDeclaration;
    keepImport: boolean;
    nonTypeNamedBindings: ImportSpecifier[];
}

function isNamedImports(bindings: NamedImportBindings): bindings is NamedImports {
    return bindings.kind === SyntaxKind.NamedImports && Array.isArray(bindings.elements);
}
/**
 * Processor for `import module from 'module'`
 */
export class ImportProcessor extends Processor {
    parse(node: typescript.Node) {
        if (this.ts.isImportDeclaration(node) && this.ts.isStringLiteral(node.moduleSpecifier)) {
            /* eslint-disable-next-line @typescript-eslint/no-unnecessary-condition */
            if (node.importClause == null || node.getSourceFile() == null) {
                return {
                    node,
                    moduleName: node.moduleSpecifier.text,
                    keepImport: true,
                    nonTypeNamedBindings: [],
                };
            }
            const nonTypeNamedBindings: ImportSpecifier[] = [];
            if (!node.importClause.isTypeOnly && node.importClause.namedBindings) {
                if (isNamedImports(node.importClause.namedBindings)) {
                    node.importClause.namedBindings.elements.forEach(function (importSpecifier) {
                        if (!importSpecifier.isTypeOnly) {
                            nonTypeNamedBindings.push(importSpecifier);
                        }
                    });
                }
            }
            return {
                node,
                keepImport: false,
                moduleName: node.moduleSpecifier.text,
                nonTypeNamedBindings,
            };
        }
        return undefined;
    }

    updateModuleName(moduleName: string, { node, keepImport, nonTypeNamedBindings }: ParseResult) {
        if (keepImport) {
            // For .d.ts file and file without import caluse (for .e.g. import '../src'), preserve the import
            return this.factory.updateImportDeclaration(
                node,
                node.modifiers,
                node.importClause,
                this.factory.createStringLiteral(moduleName),
                /* eslint-disable-next-line @typescript-eslint/no-deprecated */
                node.assertClause,
            );
        }
        if (!node.importClause) {
            // Should not happen since keepImport must be true
            throw new Error('Import clause cannot be null');
        }
        // Do not emit import for type only import i.e. `import type { A, B, C } from '...'`
        if (node.importClause.isTypeOnly) {
            return undefined;
        }
        let namedImports = node.importClause.namedBindings;
        if (nonTypeNamedBindings.length === 0) {
            if (node.importClause.name) {
                // If import has default name for e.g. `import abc, { type A, type B, type C } from '...'`
                // Remove the type completely, so it would become `import abc from '...'`
                namedImports = undefined;
            } else {
                if (this.compilerOpts.verbatimModuleSyntax) {
                    // If import does not have default name for e.g. `import { type A, type B, type C } from '...'`
                    // Since we have verbatimModuleSyntax=true, it would become `import {} from '...'`
                    namedImports = this.factory.updateNamedImports(<NamedImports>node.importClause.namedBindings, []);
                } else {
                    // If import does not have default name for e.g. `import { type A, type B, type C } from '...'`
                    // And we have verbatimModuleSyntax=false, we just don't emit this import
                    // TODO: check importsNotUsedAsValues and preserveValueImports (but they are deprecated anyway)
                    return undefined;
                }
            }
        } else {
            namedImports = this.factory.updateNamedImports(<NamedImports>node.importClause.namedBindings, nonTypeNamedBindings);
        }

        return this.factory.updateImportDeclaration(
            node,
            node.modifiers,
            this.factory.updateImportClause(node.importClause, false, node.importClause.name, namedImports),
            this.factory.createStringLiteral(moduleName),
            /* eslint-disable-next-line @typescript-eslint/no-deprecated */
            node.assertClause,
        );
    }
}
