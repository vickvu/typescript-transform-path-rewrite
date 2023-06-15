import pathUtils from 'node:path';
import debug from 'debug';
import typescript from 'typescript';
import { PROJECT_NAME } from './constants';

/* eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call*/
const log: (msg: string) => void = debug(PROJECT_NAME);

type Matcher = (moduleName: string, sourceFileName: string) => string;

function isParentDir(dir: string, parentToTest: string): boolean {
    const diff = pathUtils.relative(parentToTest, dir);
    return diff.length === 0 || (!diff.startsWith('..') && !pathUtils.isAbsolute(diff));
}

export class Resolver {
    private matchers: Matcher[];
    private ts: typeof typescript;
    private compilerOptions: typescript.CompilerOptions;

    constructor(ts: typeof typescript, compilerOptions: typescript.CompilerOptions, alias?: Record<string, string>) {
        this.ts = ts;
        this.compilerOptions = compilerOptions;

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
        const resolvedFile = pathUtils.parse(resolvedModule.resolvedFileName);
        const resolvedFileBaseWithoutExt = resolvedFile.name;
        const resolvedFileExt = resolvedFile.ext;
        let resolvedFileDir = resolvedFile.dir;
        let sourceFileDir = pathUtils.dirname(sourceFilePath);
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
        if (this.isESM()) {
            if (resolvedFileExt === '.ts') {
                normalisedResolvedFileBase += '.js';
            } else if (resolvedFileExt === '.mts') {
                normalisedResolvedFileBase += '.mjs';
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

    isESM(): boolean {
        return (
            this.compilerOptions.module !== typescript.ModuleKind.None &&
            this.compilerOptions.module !== typescript.ModuleKind.CommonJS &&
            this.compilerOptions.module !== typescript.ModuleKind.AMD &&
            this.compilerOptions.module !== typescript.ModuleKind.UMD &&
            this.compilerOptions.module !== typescript.ModuleKind.System
        );
    }
}
