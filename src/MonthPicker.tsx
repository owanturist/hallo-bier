import React from 'react';
import Button from 'react-bootstrap/Button';
import InputGroup from 'react-bootstrap/InputGroup';
import FormControl, { FormControlProps } from 'react-bootstrap/FormControl';
import { Maybe } from 'frctl/dist/Maybe';
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
        return Maybe.fromNullable(Month.YEAR[ index - 1 ]);
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
        return new Date(year, this.index - 1);
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

export const setYear = (year: number, state: State): State => ({ ...state, year });

export interface StagePattern<R> {
    Update(nextState: State): R;
    Select(selected: Selected): R;
    Unselect(): R;
}

export interface Stage {
    cata<R>(pattern: StagePattern<R>): R;
}

export const Update = Utils.cons(
    class extends Utils.Cons<[ State ]> implements Stage {
        public cata<R>(pattern: StagePattern<R>): R {
            return pattern.Update(this._[ 0 ]);
        }
    }
);

export const Select = Utils.cons(
    class extends Utils.Cons<[ Month, number ]> implements Stage {
        public cata<R>(pattern: StagePattern<R>): R {
            return pattern.Select({
                month: this._[ 0 ],
                year: this._[ 1 ]
            });
        }
    }
);

export const Unselect = Utils.inst(
    class extends Utils.Cons implements Stage {
        public cata<R>(pattern: StagePattern<R>): R {
            return pattern.Unselect();
        }
    }
);

export interface Action extends Utils.Action<[ State ], Stage> {}

export const SetYear = Utils.cons(
    class extends Utils.Cons<[ Maybe<number>, Maybe<number>, number ]> implements Action {
        public update(state: State): Stage {
            return Update({
                ...state,
                year: this._[ 0 ].cata({
                    Nothing: () => Math.min(this._[ 1 ].getOrElse(this._[ 2 ]), this._[ 2 ]),

                    Just: min => Math.max(
                        min,
                        Math.min(this._[ 1 ].getOrElse(this._[ 2 ]), this._[ 2 ])
                    )
                })
            });
        }
    }
);

export const ChangeYear = Utils.cons(
    class extends Utils.Cons<[ number ]> implements Action {
        public update(state: State): Stage {
            return Update({ ...state, year: state.year + this._[ 0 ] });
        }
    }
);

export const SelectMonth = Utils.cons(
    class extends Utils.Cons<[ Month ]> implements Action {
        public update(state: State): Stage {
            return Select(this._[ 0 ], state.year);
        }
    }
);

export const UnselectMonth = Utils.inst(
    class extends Utils.Cons implements Action {
        public update(_state: State): Stage {
            return Unselect;
        }
    }
);

export const update = (action: Action, state: State): Stage => action.update(state);

export interface Selected {
    month: Month;
    year: number;
}

export const ViewMonth: React.FC<{
    disabled?: boolean;
    selected: boolean;
    month: Month;
    dispatch(action: Action): void;
}> = ({ disabled, selected, month, dispatch }) => (
    <Button
        block
        variant={'outline-dark'}
        active={selected}
        disabled={disabled}
        onClick={() => dispatch(selected ? UnselectMonth : SelectMonth(month))}
    >
        {selected ? (
            <b>{month.toShortName()}</b>
        ) : month.toShortName()}
    </Button>
);

export const View: React.FC<{
    min?: Selected;
    max?: Selected;
    disabled?: boolean;
    selected: Maybe<Selected>;
    state: State;
    dispatch(action: Action): void;
}> = ({ min, max, disabled, selected, state, dispatch }) => {
    const lo = Maybe.fromNullable(min);
    const hi = Maybe.fromNullable(max);

    return (
        <div>
            <InputGroup className="mb-1">
                <InputGroup.Prepend>
                    <Button
                        variant="outline-primary"
                        disabled={disabled || lo.map(({ year }) => state.year <= year).getOrElse(false)}
                        tabIndex={0}
                        onClick={() => dispatch(ChangeYear(-1))}
                    >&lt;</Button>
                </InputGroup.Prepend>

                <FormControl
                    className="text-center"
                    type="number"
                    min={lo.map(({ year }) => year).getOrElse(0)}
                    max={hi.map(({ year }) => year).getOrElse(Infinity)}
                    value={state.year.toString()}
                    tabIndex={0}
                    onChange={(event: React.FormEvent<FormControlProps>) => {
                        Utils.parseInt(event.currentTarget.value || '').cata({
                            Nothing: () => { /* noop */ },
                            Just: year => dispatch(SetYear(
                                lo.map(({ year }) => year),
                                hi.map(({ year }) => year),
                                year
                            ))
                        });
                    }}
                />

                <InputGroup.Append>
                    <Button
                        variant="outline-primary"
                        disabled={disabled || hi.map(({ year }) => state.year >= year).getOrElse(false)}
                        tabIndex={0}
                        onClick={() => dispatch(ChangeYear(1))}
                    >&gt;</Button>
                </InputGroup.Append>
            </InputGroup>

            <ul className={styles.monthList}>
                {Month.year().map((month: Month) => (
                    <li key={month.toShortName()} className={styles.month}>
                        <ViewMonth
                            disabled={disabled
                                || lo.map(limit =>
                                        state.year < limit.year
                                        || (state.year === limit.year && month.isLess(limit.month))
                                    ).getOrElse(false)
                                || hi.map(limit =>
                                        state.year > limit.year
                                        || (state.year === limit.year && month.isMore(limit.month))
                                    ).getOrElse(false)
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
};
