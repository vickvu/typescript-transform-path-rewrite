import { getValue as getValue1, type MyInterface2 } from '@LIB1';
import type { MyInterface } from '@LIB1/types';
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

export function func(): MyInterface {
    return func1();
}

export function func1a(): MyInterface2 {
    return func1();
}

export type MyConst = typeof import('@LIB2/constants');
export { func2 } from '@LIB2/func2';
