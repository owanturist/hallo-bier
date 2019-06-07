import React from 'react';
import Button from 'react-bootstrap/Button';
import InputGroup from 'react-bootstrap/InputGroup';
import FormControl, { FormControlProps } from 'react-bootstrap/FormControl';
import { Maybe } from 'frctl/dist/src/Maybe';
import * as Utils from './Utils';
import styles from './MonthPicker.module.css';

export class Month {
    public static fromIndex(index: number): Month {
        return Month.YEAR[ Math.max(0, index - 1) % 12 ];
    }

    public static fromDate(date: Date): Month {
        return Month.YEAR[ date.getMonth() ];
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

    public isEqual(another: Month): boolean {
        return this.index === another.index;
    }

    public isLess(another: Month): boolean {
        return this.index < another.index;
    }

    public isMore(another: Month): boolean {
        return this.index > another.index;
    }
}

export interface State {
    year: number;
}

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

class SetYear extends Action {
    public constructor(
        private readonly min: Maybe<number>,
        private readonly max: Maybe<number>,
        private readonly year: number
    ) {
        super();
    }

    public update(state: State): Stage {
        return new Update({
            ...state,
            year: isNaN(this.year)
                ? state.year
                : Math.max(
                    this.min.getOrElse(this.year),
                    Math.min(this.max.getOrElse(this.year), this.year)
                )
        });
    }
}

class ChangeYear extends Action {
    public static readonly PREV: Action = new ChangeYear(-1);
    public static readonly NEXT: Action = new ChangeYear(1);

    private constructor(private readonly delta: number) {
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

export interface Selected {
    month: Month;
    year: number;
}

const MonthView: React.FC<{
    disabled?: boolean;
    selected: boolean;
    month: Month;
    dispatch(action: Action): void;
}> = ({ disabled, selected, month, dispatch }) => (
    <Button
        block
        variant={selected ? 'outline-success' : 'outline-dark'}
        disabled={disabled}
        onClick={() => dispatch(selected ? new UnselectMonth() : new SelectMonth(month))}
    >
        {selected ? (
            <b>{month.toShortName()}</b>
        ) : month.toShortName()}
    </Button>
);

export const View: React.FC<{
    min?: [ Month, number ];
    max?: [ Month, number ];
    disabled?: boolean;
    selected: Maybe<Selected>;
    state: State;
    dispatch(action: Action): void;
}> = ({ min, max, disabled, selected, state, dispatch }) => (
    <div>
        <InputGroup>
            <InputGroup.Prepend>
                <Button
                    variant="outline-secondary"
                    disabled={disabled || state.year <= (min ? min[1] : 0)}
                    tabIndex={0}
                    onClick={() => dispatch(ChangeYear.PREV)}
                >&lt;</Button>
            </InputGroup.Prepend>

            <FormControl
                className="text-center"
                type="number"
                min={min ? min[1] : 0}
                max={max && max[1]}
                value={state.year.toString()}
                tabIndex={0}
                onChange={(event: React.FormEvent<FormControlProps>) => {
                    dispatch(new SetYear(
                        Maybe.fromNullable(min).map(([ _, year ]) => year),
                        Maybe.fromNullable(max).map(([ _, year ]) => year),
                        Number(event.currentTarget.value)
                    ));
                }}
            />

            <InputGroup.Append>
                <Button
                    variant="outline-secondary"
                    disabled={disabled || (max && state.year >= max[1])}
                    tabIndex={0}
                    onClick={() => dispatch(ChangeYear.NEXT)}
                >&gt;</Button>
            </InputGroup.Append>
        </InputGroup>

        <ul className={styles.monthList}>
            {Month.year().map((month: Month) => (
                <li key={month.toShortName()} className={styles.month}>
                    <MonthView
                        disabled={disabled || Maybe.fromNullable(max)
                                .map(([ m, y ]) => state.year >= y && month.isMore(m))
                                .getOrElse(false)
                        }
                        selected={selected.map(
                            (selected: Selected) => selected.year === state.year && selected.month.isEqual(month)
                        ).getOrElse(false)}
                        month={month}
                        dispatch={dispatch}
                    />
                </li>
            ))}
        </ul>
    </div>
);
