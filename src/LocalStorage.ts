import { Maybe, Nothing, Just } from 'frctl/dist/Maybe';
import Cmd, { Executor } from 'Cmd';

export const key = (index: number): Cmd<Maybe<string>> => Cmd.of(
    (done: Executor<Maybe<string>>): void => {
        if (process.env.NODE_ENV === 'test') {
            return Scope.popKey(index).cata({
                Nothing: () => {
                    throw new global.Error('LocalStorage.key not facked');
                },

                Just: done
            });
        }

        done(Maybe.fromNullable(localStorage.key(index)));
    }
);

export const getItem = (key: string): Cmd<Maybe<string>> => Cmd.of(
    (done: Executor<Maybe<string>>): void => {
        if (process.env.NODE_ENV === 'test') {
            return Scope.popGetItem(key).cata({
                Nothing: () => {
                    throw new global.Error('LocalStorage.getItem not facked');
                },

                Just: done
            });
        }

        done(Maybe.fromNullable(localStorage.getItem(key)));
    }
);

export const setItem = (key: string, value: string): Cmd<never> => Cmd.of(
    (): void => {
        if (process.env.NODE_ENV === 'test') {
            if (Scope.popSetItem(key, value)) {
                return;
            }

            throw new global.Error('LocalStorage.setItem not facked');
        }

        localStorage.setItem(key, value);
    }
);

export const removeItem = (key: string): Cmd<never> => Cmd.of(
    (): void => {
        if (process.env.NODE_ENV === 'test') {
            if (Scope.popRemoveItem(key)) {
                return;
            }

            throw new global.Error('LocalStorage.removeItem not facked');
        }

        localStorage.removeItem(key);
    }
);

export const clear = (): Cmd<never> => Cmd.of(
    (): void => {
        if (process.env.NODE_ENV === 'test') {
            if (Scope.popClear()) {
                return;
            }

            throw new global.Error('LocalStorage.clear not facked');
        }

        localStorage.clear();
    }
);

export class Scope {
    public static cons(): Scope {
        const scope = new Scope();

        Scope.scopes.push(scope);

        return scope;
    }

    public static popKey(index: number): Maybe<Maybe<string>> {
        for (const scope of Scope.scopes) {
            const result = scope.popKey(index);

            if (result.isJust()) {
                return result;
            }
        }

        return Nothing;
    }

    public static popGetItem(key: string): Maybe<Maybe<string>> {
        for (const scope of Scope.scopes) {
            const result = scope.popGetItem(key);

            if (result.isJust()) {
                return result;
            }
        }

        return Nothing;
    }

    public static popSetItem(key: string, value: string): boolean {
        for (const scope of Scope.scopes) {
            if (scope.popSetItem(key, value)) {
                return true;
            }
        }

        return false;
    }

    public static popRemoveItem(key: string): boolean {
        for (const scope of Scope.scopes) {
            if (scope.popRemoveItem(key)) {
                return true;
            }
        }

        return false;
    }

    public static popClear(): boolean {
        for (const scope of Scope.scopes) {
            if (scope.popClear()) {
                return true;
            }
        }

        return false;
    }

    private static scopes: Array<Scope> = [];

    private readonly config: {
        key: Array<[ number, Maybe<string> ]>;
        getItem: Array<[ string, Maybe<string> ]>;
        setItem: Array<[ string, Maybe<string> ]>;
        removeItem: Array<string>;
        clear: boolean;
    } = {
        key: [],
        getItem: [],
        setItem: [],
        removeItem: [],
        clear: false
    };

    private constructor() {}

    public key(index: number, key?: string): this {
        this.config.key.push([ index, Maybe.fromNullable(key) ]);

        return this;
    }

    public getItem(key: string, value?: string): this {
        this.config.getItem.push([ key, Maybe.fromNullable(value) ]);

        return this;
    }

    public setItem(key: string, value?: string): this {
        this.config.setItem.push([ key, Maybe.fromNullable(value) ]);

        return this;
    }

    public removeItem(key: string): this {
        this.config.removeItem.push(key);

        return this;
    }

    public clear(): this {
        this.config.clear = true;

        return this;
    }

    protected popKey(index: number): Maybe<Maybe<string>> {
        let result: Maybe<Maybe<string>> = Nothing;
        const acc: Array<[ number, Maybe<string> ]> = [];

        for (const [ i, key ] of this.config.key) {
            if (result.isNothing() && i === index) {
                result = Just(key);
            } else {
                acc.push([ i, key ]);
            }
        }

        this.config.key = acc;

        return result;
    }

    protected popGetItem(key: string): Maybe<Maybe<string>> {
        let result: Maybe<Maybe<string>> = Nothing;
        const acc: Array<[ string, Maybe<string> ]> = [];

        for (const [ k, response ] of this.config.getItem) {
            if (result.isNothing() && k === key) {
                result = Just(response);
            } else {
                acc.push([ k, response ]);
            }
        }

        this.config.getItem = acc;

        return result;
    }

    protected popSetItem(key: string, value: string): boolean {
        let result = false;
        const acc: Array<[ string, Maybe<string> ]> = [];

        for (const [ k, v ] of this.config.setItem) {
            if (!result && k === key) {
                result = v.cata({
                    Nothing: () => true,
                    Just: val => val === value
                });
            } else {
                acc.push([ k, v ]);
            }
        }

        this.config.setItem = acc;

        return result;
    }

    protected popRemoveItem(key: string): boolean {
        let result = false;
        const acc: Array<string> = [];

        for (const k of this.config.removeItem) {
            if (!result && k === key) {
                result = true;
            } else {
                acc.push(k);
            }
        }

        this.config.removeItem = acc;

        return result;
    }

    protected popClear(): boolean {
        const result = this.config.clear;

        this.config.clear = false;

        return result;
    }
}
