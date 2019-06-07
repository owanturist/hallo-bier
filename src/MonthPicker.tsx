import React from 'react';
import Button from 'react-bootstrap/Button';
import InputGroup from 'react-bootstrap/InputGroup';
import FormControl, { FormControlProps } from 'react-bootstrap/FormControl';
import { Maybe, Nothing, Just } from 'frctl/dist/src/Maybe';
import * as Utils from './Utils';
import styles from './MonthPicker.module.css';

export class Month {
    public static Jan: Month = new Month(1, 'Jan', 'January');
    public static Feb: Month = new Month(2, 'Feb', 'February');
    public static Mar: Month = new Month(3, 'Mar', 'March');
    public static Apr: Month = new Month(4, 'Apr', 'April');
    public static May: Month = new Month(5, 'May', 'May');
    public static Jun: Month = new Month(6, 'Jun', 'June');
    public static Jul: Month = new Month(7, 'Jul', 'July');
    public static Aug: Month = new Month(8, 'Aug', 'August');
    public static Sep: Month = new Month(9, 'Sep', 'September');
    public static Oct: Month = new Month(10, 'Oct', 'October');
    public static Nov: Month = new Month(11, 'Nov', 'November');
    public static Dec: Month = new Month(12, 'Dec', 'December');

    public static fromIndex(index: number): Maybe<Month> {
        if (index % 1 !== 0 || index < 1 || index > 12) {
            return Nothing;
        }

        return Just(Month.YEAR[ index - 1 ]);
    }

    public static fromDate(date: Date): Month {
        return Month.YEAR[ date.getMonth() ];
    }

    public static year(): Array<Month> {
        return Month.YEAR;
    }

    protected static YEAR: Array<Month> = [
        Month.Jan, Month.Feb, Month.Mar,
        Month.Apr, Month.May, Month.Jun,
        Month.Jul, Month.Aug, Month.Sep,
        Month.Oct, Month.Nov, Month.Dec
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
        variant={selected ? 'dark' : 'outline-dark'}
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
                        disabled={disabled
                            || Maybe.fromNullable(min)
                                .map(([ m, y ]) => state.year <= y && month.isLess(m))
                                .getOrElse(false)
                            || Maybe.fromNullable(max)
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
