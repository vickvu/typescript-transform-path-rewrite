import typescript from 'typescript';

export interface BaseParseResult {
    node: typescript.Node;
    moduleName: string;
}

export abstract class Processor {
    protected ts: typeof typescript;
    protected factory: typescript.NodeFactory;
    protected compilerOpts: typescript.CompilerOptions;

    constructor(ts: typeof typescript, factory: typescript.NodeFactory, compilerOpts: typescript.CompilerOptions) {
        this.ts = ts;
        this.factory = factory;
        this.compilerOpts = compilerOpts;
    }

    /* eslint-disable-next-line @typescript-eslint/no-unused-vars */
    parse(node: typescript.Node): BaseParseResult | undefined {
        return undefined;
    }

    abstract updateModuleName(newModuleName: string, parseResult: BaseParseResult): typescript.Node | undefined;
}
