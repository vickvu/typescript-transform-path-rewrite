import { getValue as getValue1 } from '@LIB1/index';

import { func1 } from '@LIB2/func1';

export function func() {
    return func1();
}

export type MyConst = typeof import('@LIB2/constants');

console.log(
    JSON.stringify({
        value1: getValue1(),
        value2: func().name,
    }),
);
