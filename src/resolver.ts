import pathUtils from 'node:path/posix';
import debug from 'debug';
import typescript, { ModuleKind } from 'typescript';
import { PROJECT_NAME } from './constants';
import { existsSync, readFileSync } from 'node:fs';

/* eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call*/
const log: (msg: string) => void = debug(PROJECT_NAME);

type Matcher = (moduleName: string, sourceFileName: string) => string;

function isParentDir(dir: string, parentToTest: string): boolean {
    const diff = pathUtils.relative(parentToTest, dir);
    return diff.length === 0 || (!diff.startsWith('..') && !pathUtils.isAbsolute(diff));
}

interface PackageJson {
    found: boolean;
    type?: 'module' | 'commonjs';
}

export class Resolver {
    private matchers: Matcher[];
    private ts: typeof typescript;
    private compilerOptions: typescript.CompilerOptions;
    private cachedPackageJson: Record<string, PackageJson>;

    constructor(ts: typeof typescript, compilerOptions: typescript.CompilerOptions, alias?: Record<string, string>) {
        this.ts = ts;
        this.compilerOptions = compilerOptions;
        this.cachedPackageJson = {};

        // Build matchers from compiler options
        this.matchers = [
            (moduleName: string, sourceFileName: string): string => {
                const retVal = this.resolveModule(sourceFileName, moduleName);
                if (retVal) {
                    log(`${sourceFileName}: Rewrite module ${moduleName} to ${retVal}`);
                    return retVal;
                }
                return null;
            },
        ];
        if (alias) {
            // Build matchers from alias property of the plugin
            this.matchers.push(
                ...Object.entries(alias).map(([from, to]) => {
                    const fromRegex = new RegExp(from);
                    return function (moduleName: string, sourceFileName: string): string {
                        if (fromRegex.test(moduleName)) {
                            const retVal = moduleName.replace(fromRegex, to);
                            log(`${sourceFileName}: Rewrite module ${moduleName} to ${retVal} with regex /${from}/ => ${to}`);
                            return retVal;
                        }
                        return null;
                    };
                }),
            );
        }

        this.matchers.push();
    }

    resolve(moduleName: string, sourceFileName: string): string {
        let retVal: string = null;
        this.matchers.forEach(function (matcher) {
            const result = matcher(moduleName, sourceFileName);
            if (result != null) {
                retVal = result;
            }
        });
        return retVal;
    }

    private resolveModule(sourceFilePath: string, moduleName: string): string {
        const { resolvedModule } = this.ts.resolveModuleName(moduleName, sourceFilePath, this.compilerOptions, this.ts.sys);
        if (!resolvedModule || resolvedModule.packageId) {
            return null;
        }
        let resolvedFileDir = pathUtils.dirname(resolvedModule.resolvedFileName);
        const resolvedFileExt = resolvedModule.extension;
        const resolvedFileBaseWithoutExt = resolvedModule.resolvedFileName.substring(
            resolvedFileDir.length + 1,
            resolvedModule.resolvedFileName.length - resolvedFileExt.length,
        );
        const originalSourceFileDir = pathUtils.dirname(sourceFilePath);
        let sourceFileDir = originalSourceFileDir;
        if (this.compilerOptions.rootDirs) {
            let fileRootDir: string;
            let moduleRootDir: string;
            this.compilerOptions.rootDirs.forEach(function (rootDir) {
                if (isParentDir(resolvedFileDir, rootDir) && (!moduleRootDir || rootDir.length > moduleRootDir.length)) {
                    moduleRootDir = rootDir;
                }
                if (isParentDir(sourceFileDir, rootDir) && (!fileRootDir || rootDir.length > fileRootDir.length)) {
                    fileRootDir = rootDir;
                }
            });
            if (fileRootDir && moduleRootDir) {
                sourceFileDir = pathUtils.relative(fileRootDir, sourceFileDir);
                resolvedFileDir = pathUtils.relative(moduleRootDir, resolvedFileDir);
            }
        }
        const normalisedResolvedFileDir = pathUtils.relative(sourceFileDir, resolvedFileDir);
        let normalisedResolvedFileBase = resolvedFileBaseWithoutExt;
        if (this.isESM(originalSourceFileDir)) {
            if (resolvedFileExt === '.ts' || resolvedFileExt === '.d.ts') {
                normalisedResolvedFileBase += '.js';
            } else if (resolvedFileExt === '.mts') {
                normalisedResolvedFileBase += '.mjs';
            } else if (resolvedFileExt === '.cts') {
                normalisedResolvedFileBase += '.cjs';
            } else {
                normalisedResolvedFileBase += resolvedFileExt;
            }
        }
        let normalisedResolvedFilePath = pathUtils.join(normalisedResolvedFileDir, normalisedResolvedFileBase);
        if (!normalisedResolvedFilePath.startsWith('.')) {
            normalisedResolvedFilePath = `./${normalisedResolvedFilePath}`;
        }
        return normalisedResolvedFilePath;
    }

    isESM(sourceFileDir: string): boolean {
        if (this.compilerOptions.module === ModuleKind.Node16 || this.compilerOptions.module === ModuleKind.NodeNext) {
            const pkg = this.findNearestPackageJson(sourceFileDir);
            return pkg && pkg.found && pkg.type === 'module';
        }
        return (
            this.compilerOptions.module !== ModuleKind.None &&
            this.compilerOptions.module !== ModuleKind.CommonJS &&
            this.compilerOptions.module !== ModuleKind.AMD &&
            this.compilerOptions.module !== ModuleKind.UMD &&
            this.compilerOptions.module !== ModuleKind.System
        );
    }

    private findNearestPackageJson(srcDir: string): PackageJson {
        if (!this.cachedPackageJson[srcDir]) {
            let oldSrcDir = srcDir;
            let currenSrcDir = srcDir;
            while (!this.cachedPackageJson[srcDir]) {
                // Try to read the package.json
                const pkgJsonPath = pathUtils.resolve(currenSrcDir, 'package.json');
                try {
                    if (existsSync(pkgJsonPath)) {
                        const data = <PackageJson>JSON.parse(readFileSync(pkgJsonPath, 'utf-8'));
                        if (
                            typeof data === 'object' &&
                            (data.type == null || data.type.toLowerCase() === 'commonjs' || data.type.toLowerCase() === 'module')
                        ) {
                            this.cachedPackageJson[srcDir] = this.cachedPackageJson[currenSrcDir] = {
                                found: true,
                                type: data.type ? <'module' | 'commonjs'>data.type.toLowerCase() : 'commonjs',
                            };
                        }
                    }
                } catch (err) {
                    // Ignore error
                }
                if (!this.cachedPackageJson[srcDir]) {
                    // Go to parent directory
                    oldSrcDir = currenSrcDir;
                    currenSrcDir = pathUtils.resolve(currenSrcDir, '..');
                    if (this.cachedPackageJson[currenSrcDir]) {
                        // In the cache
                        this.cachedPackageJson[srcDir] = this.cachedPackageJson[currenSrcDir];
                        break;
                    }
                    if (currenSrcDir === oldSrcDir) {
                        // Cannot go any further
                        this.cachedPackageJson[srcDir] = this.cachedPackageJson[currenSrcDir] = {
                            found: false,
                        };
                        break;
                    }
                }
            }
        }
        return this.cachedPackageJson[srcDir];
    }
}
