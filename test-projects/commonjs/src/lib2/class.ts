import { MyInterface2 } from '@LIB1';
import { MyInterface } from '@LIB1/types';

export class MyClass implements MyInterface, MyInterface2 {
    private _name: string;

    constructor() {
        this._name = 'MY_CLASS';
    }

    get name() {
        return this._name;
    }
}
