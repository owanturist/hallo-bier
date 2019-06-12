import { Maybe } from 'frctl/dist/Maybe';
import Cmd, { Executor } from 'Cmd';

export const key = (index: number): Cmd<Maybe<string>> => Cmd.of(
    (done: Executor<Maybe<string>>): void => {
        done(Maybe.fromNullable(localStorage.key(index)));
    }
);

export const getItem = (key: string): Cmd<Maybe<string>> => Cmd.of(
    (done: Executor<Maybe<string>>): void => {
        done(Maybe.fromNullable(localStorage.getItem(key)));
    }
);

export const setItem = (key: string, value: string): Cmd<never> => Cmd.of(
    (): void => {
        localStorage.setItem(key, value);
    }
);

export const removeItem = (key: string): Cmd<never> => Cmd.of(
    (): void => {
        localStorage.removeItem(key);
    }
);

export const clear = (): Cmd<never> => Cmd.of(
    (): void => {
        localStorage.clear();
    }
);
