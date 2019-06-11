import { Maybe, Nothing, Just } from 'frctl/dist/Maybe';

export const inst = <T>(Constructor: new () => T) => new Constructor();

export const cons = <A extends Array<unknown>, T>(
    Constructor: new (...args: A) => A extends [] ? never : T
) => (...args: A): T => new Constructor(...args);

export abstract class Action<S extends Array<unknown>, R> {
    protected readonly type = this.constructor.name;

    public constructor(type?: string) {
        if (typeof type !== 'undefined') {
            this.type = type;
        }
    }

    public abstract update(...args: S): R;

    protected toString() {
        return this.type;
    }
}

export const parseInt = (str: string): Maybe<number> => {
    let total = 0;
    const code0 = str.charCodeAt(0);
    const start = code0 === 0x2B /* + */ || code0 === 0x2D /* - */ ? 1 : 0;

    if (str.length === start) {
        return Nothing;
    }

    for (let i = start; i < str.length; ++i) {
        const code = str.charCodeAt(i);

        if (code < 0x30 || 0x39 < code) {
            return Nothing;
        }

        total = 10 * total + code - 0x30;
    }

    return Just(code0 === 0x2D ? -total : total);
};

export const parseDate = (str: string): Maybe<Date> => {
    const fragments = str.split('/');
    const monthIndexOrYear = Maybe.fromNullable(fragments[ 0 ]).chain(parseInt);

    return Maybe.fromNullable(fragments[ 1 ]).chain(parseInt).cata({
        Nothing: () => monthIndexOrYear.chain(
            year => year < 0 ? Nothing : Just(new Date(year))
        ),
        Just: year => monthIndexOrYear.chain(
            month => month < 1 || month > 12 ? Nothing : Just(new Date(year, month - 1))
        )
    });
};
