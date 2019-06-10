import { Maybe, Nothing, Just } from 'frctl/dist/Maybe';

export abstract class Action<S extends Array<unknown>, R> {
    private readonly type: string = this.constructor.name;

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

export const parseFloat = (str: string): Maybe<number> => {
    // check if it is a hex, octal, or binary number
    if (str.length === 0 || /[\sxbo]/.test(str)) {
        return Nothing;
    }
    const float = +str;

    return isNaN(float) ? Just(float) : Nothing;
};

export const parseDate = (str: string): Maybe<Date> => {
    const fragments = str.split('/');
    const monthIndexOrYear = Maybe.fromNullable(fragments[ 0 ]).chain(parseInt);

    return Maybe.fromNullable(fragments[ 1 ]).chain(parseInt).cata({
        Nothing: () => monthIndexOrYear.map(year => new Date(year)),
        Just: year => monthIndexOrYear.map(month => new Date(year, month - 1))
    });
};
