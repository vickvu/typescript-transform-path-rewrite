import typescript, { ImportSpecifier, NamedImportBindings, NamedImports, NamespaceImport, SyntaxKind } from 'typescript';
import { BaseParseResult, Processor } from './processor';

interface ParseResult extends BaseParseResult {
    node: typescript.ImportDeclaration;
    keepImport: boolean;
    typeOnly?: boolean;
    nonTypeNamedBindings?: ImportSpecifier[];
    namespaceImport?: NamespaceImport;
}

function isNamedImports(bindings: NamedImportBindings): bindings is NamedImports {
    return bindings.kind === SyntaxKind.NamedImports && Array.isArray(bindings.elements);
}

function isNamespaceImport(bindings: NamedImportBindings): bindings is NamespaceImport {
    return bindings.kind === SyntaxKind.NamespaceImport;
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
            let namespaceImport: NamespaceImport;
            if (!typeOnly && node.importClause.namedBindings) {
                if (isNamedImports(node.importClause.namedBindings)) {
                    node.importClause.namedBindings.elements.forEach(function (importSpecifier) {
                        if (!importSpecifier.isTypeOnly) {
                            nonTypeNamedBindings.push(importSpecifier);
                        }
                    });
                    // In some case nonTypeNamedBindings is empty but this is not a typeOnly import
                    // For example
                    // import a, {type b} from '.'
                    typeOnly = node.importClause.name == null && nonTypeNamedBindings.length === 0;
                } else if (isNamespaceImport(node.importClause.namedBindings)) {
                    namespaceImport = node.importClause.namedBindings;
                }
            }
            return {
                node,
                keepImport: false,
                moduleName: node.moduleSpecifier.text,
                typeOnly,
                nonTypeNamedBindings,
                namespaceImport,
            };
        }
        return null;
    }

    updateModuleName(moduleName: string, { node, keepImport, typeOnly, nonTypeNamedBindings, namespaceImport }: ParseResult): typescript.Node {
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
                node.importClause.namedBindings != null && nonTypeNamedBindings.length > 0
                    ? this.factory.updateNamedImports(<NamedImports>node.importClause.namedBindings, nonTypeNamedBindings)
                    : namespaceImport,
            ),
            this.factory.createStringLiteral(moduleName),
            node.assertClause,
        );
    }
}
