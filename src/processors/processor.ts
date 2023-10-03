import typescript from 'typescript';

export interface BaseParseResult {
    node: typescript.Node;
    moduleName: string;
}

export abstract class Processor {
    protected ts: typeof typescript;
    protected factory: typescript.NodeFactory;

    constructor(ts: typeof typescript, factory: typescript.NodeFactory) {
        this.ts = ts;
        this.factory = factory;
    }

    /* eslint-disable-next-line @typescript-eslint/no-unused-vars */
    parse(node: typescript.Node): BaseParseResult {
        return null;
    }

    abstract updateModuleName(newModuleName: string, parseResult: BaseParseResult): typescript.Node;
}
