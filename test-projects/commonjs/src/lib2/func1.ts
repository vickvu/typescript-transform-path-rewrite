import type { MyInterface } from '@LIB1/types';
import { MyClass } from './class';

export function func1(): MyInterface {
    return new MyClass();
}
