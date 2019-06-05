import React from 'react';

import { Maybe } from 'frctl/dist/src/Maybe';

export class Month {
    public static fromIndex(index: number) {
        return Month.YEAR[index % 12];
    }

    public static year(): Array<Month> {
        return Month.YEAR;
    }

    protected static YEAR: Array<Month> = [
        new Month(0, 'Jan', 'January'),
        new Month(0, 'Feb', 'February'),
        new Month(0, 'Mar', 'March'),
        new Month(0, 'Apr', 'April'),
        new Month(0, 'May', 'May'),
        new Month(0, 'Jun', 'June'),
        new Month(0, 'Jul', 'July'),
        new Month(0, 'Aug', 'August'),
        new Month(0, 'Sep', 'September'),
        new Month(0, 'Oct', 'October'),
        new Month(0, 'Nov', 'November'),
        new Month(0, 'Dec', 'December')
    ];

    protected constructor(
        private readonly index: number,
        private readonly short: string,
        private readonly long: string
    ) {}

    public toIndex(): number {
        return this.index;
    }

    public toShortName(): string {
        return this.short;
    }

    public toLongName(): string {
        return this.long;
    }

    public toDate(year: number): Date {
        return new Date(`${this.index + 1}/01/${year}`);
    }

    public isEqual(another: Month) {
        return this.index === another.index;
    }
}

export type State = Readonly<{
    year: number;
}>;

export const init = (year: number): State => ({ year });

interface StagePattern<R> {
    Update(nextState: State): R;
    Select(month: Month, year: number): R;
}

export abstract class Stage {
    public abstract cata<R>(pattern: StagePattern<R>): R;
}

class Update extends Stage {
    public constructor(private readonly state: State) {
        super();
    }

    public cata<R>(pattern: StagePattern<R>): R {
        return pattern.Update(this.state);
    }
}

class Select extends Stage {
    public constructor(
        private readonly month: Month,
        private readonly year: number
    ) {
        super();
    }

    public cata<R>(pattern: StagePattern<R>): R {
        return pattern.Select(this.month, this.year);
    }
}

export abstract class Action {
    protected static update(action: Action, state: State): Stage {
        return action.update(state);
    }

    protected abstract update(state: State): Stage;
}

class ChangeYear extends Action {
    public static readonly PREV: Action = new ChangeYear(-1);
    public static readonly NEXT: Action = new ChangeYear(1);

    public constructor(private readonly delta: number) {
        super();
    }

    protected update(state: State): Stage {
        return new Update({ ...state, year: state.year + this.delta });
    }
}

class SelectMonth extends Action {
    public constructor(private readonly month: Month) {
        super();
    }

    protected update(state: State): Stage {
        return new Select(this.month, state.year);
    }
}

abstract class PhantomAction extends Action {
    public static update(action: Action, state: State): Stage {
        return super.update(action, state);
    }
}

export const update = PhantomAction.update;

export interface Selected {
    month: Month;
    year: number;
}

export const View: React.FC<{
    selected: Maybe<Selected>;
    state: State;
    dispatch(action: Action): void;
}> = ({ selected, state, dispatch }) => (
    <div>
        <header>
            <button
                type="button"
                onClick={() => dispatch(ChangeYear.PREV)}
            >prev</button>

            <span>{state.year}</span>

            <button
                type="button"
                onClick={() => dispatch(ChangeYear.NEXT)}
                >next</button>
        </header>
        <ul>
            {Month.year().map((month: Month) => (
                <li
                    key={month.toShortName()}
                    onClick={() => dispatch(new SelectMonth(month))}
                >{selected.cata({
                    Nothing: () => month.toShortName(),
                    Just: (val: Selected) => val.year === state.year && val.month.isEqual(month)
                        ? <b>{month.toShortName()}</b>
                        : month.toShortName()
                })}</li>
            ))}
        </ul>
    </div>
);
