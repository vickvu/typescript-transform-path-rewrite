import { getValue as getValue1, type MyInterface2 } from '@LIB1/index';
import type { MyInterface } from '@LIB1/types';
import { type MyInterface3 } from '@LIB1/t-only';
import { func1 } from '@LIB2/func1';

export function func(): MyInterface {
    return func1();
}

export function func2(): MyInterface2 {
    return func1();
}

export type MyConst = typeof import('@LIB2/constants');

console.log(
    JSON.stringify({
        value1: getValue1(),
        value2: func().name,
    }),
);
