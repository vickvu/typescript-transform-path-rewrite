import { getValue as getValue1 } from '@LIB1';
import { func1 } from '@LIB2/func1';
// node-fetch will be replaced by url-template in runtime
// per tsconfig.json setting
import('node-fetch').then((ret) => {
    console.log(
        JSON.stringify({
            // @ts-ignore
            parseTemplate: typeof ret.parseTemplate,
            value1: getValue1(),
            value2: func().name,
        }),
    );
});

export function func() {
    return func1();
}

export type MyConst = typeof import('@LIB2/constants');
export { func2 } from '@LIB2/func2';
