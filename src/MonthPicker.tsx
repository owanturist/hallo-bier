import React from 'react';

import { Maybe, Nothing, Just } from 'frctl/dist/src/Maybe';
import * as Utils from './Utils';

export class Month {
    public static fromIndex(index: number): Maybe<Month> {
        if (index % 1 !== 0 || index < 1 || index > 12) {
            return Nothing;
        }

        return Just(Month.YEAR[index - 1]);
    }

    public static year(): Array<Month> {
        return Month.YEAR;
    }

    protected static YEAR: Array<Month> = [
        new Month(1, 'Jan', 'January'),
        new Month(2, 'Feb', 'February'),
        new Month(3, 'Mar', 'March'),
        new Month(4, 'Apr', 'April'),
        new Month(5, 'May', 'May'),
        new Month(6, 'Jun', 'June'),
        new Month(7, 'Jul', 'July'),
        new Month(8, 'Aug', 'August'),
        new Month(9, 'Sep', 'September'),
        new Month(10, 'Oct', 'October'),
        new Month(11, 'Nov', 'November'),
        new Month(12, 'Dec', 'December')
    ];

    protected constructor(
        private readonly index: number,
        private readonly short: string,
        private readonly long: string
    ) {}

    public toIndex(): number {
        return this.index;
    }

    public toString(): string {
        return this.toShortName();
    }

    public toShortName(): string {
        return this.short;
    }

    public toLongName(): string {
        return this.long;
    }

    public toDate(year: number): Date {
        return new Date(`${this.index}/01/${year}`);
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
    Select(selected: Selected): R;
    Unselect(): R;
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
        return pattern.Select({
            month: this.month,
            year: this.year
        });
    }
}

class Unselect extends Stage {
    public cata<R>(pattern: StagePattern<R>): R {
        return pattern.Unselect();
    }
}

export abstract class Action extends Utils.Action<[ State ], Stage> {}

class ChangeYear extends Action {
    public static readonly PREV: Action = new ChangeYear(-1);
    public static readonly NEXT: Action = new ChangeYear(1);

    public constructor(private readonly delta: number) {
        super();
    }

    public update(state: State): Stage {
        return new Update({ ...state, year: state.year + this.delta });
    }
}

class SelectMonth extends Action {
    public constructor(private readonly month: Month) {
        super();
    }

    public update(state: State): Stage {
        return new Select(this.month, state.year);
    }
}

class UnselectMonth extends Action {
    public update(): Stage {
        return new Unselect();
    }
}

export const update = (action: Action, state: State): Stage => action.update(state);

export type Selected = Readonly<{
    month: Month;
    year: number;
}>;

const MonthView: React.FC<{
    selected: boolean;
    month: Month;
    dispatch(action: Action): void;
}> = ({ selected, month, dispatch }) => (
    <li
        onClick={() => dispatch(selected ? new UnselectMonth() : new SelectMonth(month))}
    >{selected ? (
        <b>{month.toShortName()}</b>
    ) : month.toShortName()}
    </li>
);

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
                <MonthView
                    key={month.toShortName()}
                    selected={selected.map(
                        (selected: Selected) => selected.year === state.year && selected.month.isEqual(month)
                    ).getOrElse(false)}
                    month={month}
                    dispatch={dispatch}
                />
            ))}
        </ul>
    </div>
);
