import typescript, { ImportSpecifier, NamedImportBindings, NamedImports, SyntaxKind, ImportClause, NodeFactory } from 'typescript';
import { BaseParseResult, Processor } from './processor';

interface ParseResult extends BaseParseResult {
    node: typescript.ImportDeclaration;
    keepImport: boolean;
    nonTypeNamedBindings: ImportSpecifier[];
}

function isTypeOnly(ic: ImportClause | undefined) {
    // Still using isTypeOnly in case ic.phaseModifier does not exist to be backward-compatibile
    return ic != null && ((ic.phaseModifier != null && ic.phaseModifier === SyntaxKind.TypeKeyword) || ic.isTypeOnly);
}

function updateImportClause(factory: NodeFactory, ic: ImportClause, namedBindings: NamedImportBindings | undefined) {
    if (ic.phaseModifier != null) {
        return factory.updateImportClause(ic, SyntaxKind.TypeKeyword, ic.name, namedBindings);
    }
    // Still using the deprecated functioin in case ic.phaseModifier does not exist to be backward-compatibile
    return factory.updateImportClause(ic, false, ic.name, namedBindings);
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
            if (node.importClause == null || node.getSourceFile() == null) {
                return {
                    node,
                    moduleName: node.moduleSpecifier.text,
                    keepImport: true,
                    nonTypeNamedBindings: [],
                };
            }
            const nonTypeNamedBindings: ImportSpecifier[] = [];
            if (!isTypeOnly(node.importClause) && node.importClause.namedBindings) {
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
        if (keepImport || isTypeOnly(node.importClause)) {
            // For synthetic files and file without import caluse (for .e.g. import '../src'),
            // and file with type only import, preserve the import
            // Since we can't detect whether we are in .js or .d.ts mode, we just simply rewrite the import anyway
            // and TypeScript will remove type only import automtically when producing js file
            // and keep type only import for .d.ts files
            return this.factory.updateImportDeclaration(
                node,
                node.modifiers,
                node.importClause,
                this.factory.createStringLiteral(moduleName),

                node.assertClause,
            );
        }
        if (!node.importClause) {
            // Should not happen since keepImport must be true
            throw new Error('Import clause cannot be null');
        }
        let namedImports: NamedImports | undefined; // = node.importClause.namedBindings;
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
            updateImportClause(this.factory, node.importClause, namedImports),
            this.factory.createStringLiteral(moduleName),
            node.assertClause,
        );
    }
}
