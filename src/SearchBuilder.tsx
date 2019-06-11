import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSearch } from '@fortawesome/free-solid-svg-icons';
import FormControl, { FormControlProps } from 'react-bootstrap/FormControl';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import Col from 'react-bootstrap/Col';
import Dropdown from 'react-bootstrap/Dropdown';
import { compose } from 'redux';
import * as Router from './Router';
import { Maybe, Nothing, Just } from 'frctl/dist/Maybe';
import * as MonthPicker from './MonthPicker';
import * as Utils from './Utils';
import styles from './SearchBuilder.module.css';

export const selectedToString = (selected: MonthPicker.Selected): string => {
    return `${selected.month.toIndex().toString().padStart(2, '0')}/${selected.year}`;
};

export const selectedFromString = (str: string): Maybe<MonthPicker.Selected> => {
    const fragments = str.trim().split(/\s*\/\s*|\s*-\s*|_|\s+/);

    return Maybe.props({
        month: Maybe.fromNullable(fragments[ 0 ]).chain(Utils.parseInt).chain(MonthPicker.Month.fromIndex),
        year: Maybe.fromNullable(fragments[ 1 ]).chain(Utils.parseInt)
    });
};

export interface State {
    name: string;
    brewedAfter: string;
    monthPicker: Maybe<MonthPicker.State>;
}

export const init = (filter: Router.SearchFilter): State => ({
    name: filter.name.getOrElse(''),
    brewedAfter: filter.brewedAfter.map(brewedAfter => ({
        month: MonthPicker.Month.fromDate(brewedAfter),
        year: brewedAfter.getFullYear()
    })).map(selectedToString).getOrElse(''),
    monthPicker: Nothing
});

export const isValid = (state: State): boolean => {
    return state.name.trim().length > 0 || selectedFromString(state.brewedAfter).isJust();
};

export interface StagePattern<R> {
    Update(nextSearchBuilder: State): R;
    Search(config: Router.SearchFilter): R;
}

export abstract class Stage {
    public abstract cata<R>(pattern: StagePattern<R>): R;
}

export class Update extends Stage {
    public constructor(private readonly state: State) {
        super();
    }

    public cata<R>(pattern: StagePattern<R>): R {
        return pattern.Update(this.state);
    }
}

export class Search extends Stage {
    public constructor(private readonly filter: Router.SearchFilter) {
        super();
    }

    public cata<R>(pattern: StagePattern<R>): R {
        return pattern.Search(this.filter);
    }
}

export abstract class Action extends Utils.Action<[ State ], Stage> {}

export class ChangeName extends Action {
    public constructor(private readonly name: string) {
        super();
    }

    public update(state: State): Stage {
        return new Update({ ...state, name: this.name });
    }
}

export class ChangeBrewedAfter extends Action {
    public constructor(
        private readonly min: Maybe<MonthPicker.Selected>,
        private readonly max: Maybe<MonthPicker.Selected>,
        private readonly brewedAfter: string
    ) {
        super();
    }

    public update(state: State): Stage {
        return selectedFromString(this.brewedAfter)
            .map(selected => this.limit(selected))
            .cata({
                Nothing: () => new Update({
                    ...state,
                    brewedAfter: this.brewedAfter
                }),

                Just: selected => new Update({
                    ...state,
                    brewedAfter: selectedToString(selected),
                    monthPicker: state.monthPicker.map(mp => MonthPicker.setYear(selected.year, mp))
                })
            });
    }

    private limit(selected: MonthPicker.Selected): MonthPicker.Selected {
        const bottomBordered = this.min.map(({ month, year }) => {
            if (selected.year < year) {
                return { month, year };
            }

            if (selected.year > year) {
                return selected;
            }

            return {
                year,
                month: selected.month.isLess(month) ? month : selected.month
            };
        }).getOrElse(selected);

        return this.max.map(({ month, year }) => {
            if (bottomBordered.year < year) {
                return bottomBordered;
            }

            if (bottomBordered.year > year) {
                return { month, year };
            }

            return {
                year,
                month: bottomBordered.month.isMore(month) ? month : bottomBordered.month
            };
        }).getOrElse(bottomBordered);
    }
}

export class SearchBeer extends Action {
    public update(state: State): Stage {
        const trimmedName = state.name.trim();

        return new Search({
            name: trimmedName ? Just(trimmedName) : Nothing,
            brewedAfter: selectedFromString(state.brewedAfter).map(({ month, year }) => month.toDate(year))
        });
    }
}

export class ShowMonthPicker extends Action {
    public update(state: State): Stage {
        if (state.monthPicker.isJust()) {
            return new Update(state);
        }

        const initialYear = selectedFromString(state.brewedAfter)
            .map(selected => selected.year)
            .getOrElse(2010);

        return new Update({
            ...state,
            monthPicker: Just(MonthPicker.init(initialYear))
        });
    }
}

export class HideMonthPicker extends Action {
    public update(state: State): Stage {
        return new Update({
            ...state,
            monthPicker: Nothing
        });
    }
}

export class ActionMonthPicker extends Action {
    public static cons(action: MonthPicker.Action): Action {
        return new ActionMonthPicker(action);
    }

    private constructor(private readonly action: MonthPicker.Action) {
        super();
    }

    public update(state: State): Stage {
        return state.monthPicker.cata({
            Nothing: () => new Update(state),

            Just: monthPicker => this.action.update(monthPicker).cata({
                Update: (nextMonthPicker: MonthPicker.State) => new Update({
                    ...state,
                    monthPicker: Just(nextMonthPicker)
                }),

                Select: (brewedAfter: MonthPicker.Selected) => new Update({
                    ...state,
                    brewedAfter: selectedToString(brewedAfter)
                }),

                Unselect: () => new Update({
                    ...state,
                    brewedAfter: ''
                })
            })
        });
    }
}

export class ViewMonthpicker extends React.PureComponent<{
    min?: MonthPicker.Selected;
    max?: MonthPicker.Selected;
    disabled?: boolean;
    brewedAfter: string;
    monthPicker: Maybe<MonthPicker.State>;
    dispatch(aciton: Action): void;
}> {
    private readonly root = React.createRef<Dropdown & Node>();

    public render(): React.ReactNode {
        const { min, max, disabled, brewedAfter, monthPicker, dispatch } = this.props;

        return (
            <Dropdown
                alignRight
                show={monthPicker.isJust()}
                ref={this.root as any}
            >
                <FormControl
                    type="text"
                    value={brewedAfter}
                    tabIndex={0}
                    disabled={disabled}
                    onChange={this.onInputChange}
                    onFocus={this.onInputFocus}
                    placeholder="mm/yyyy"
                />

                {monthPicker.cata({
                    Nothing: () => null,
                    Just: monthPicker => (
                        <Dropdown.Menu
                            className={`p-2 mt-1 ${styles.dropdown}`}
                            flip={false}
                        >
                            <MonthPicker.View
                                min={min}
                                max={max}
                                selected={selectedFromString(brewedAfter)}
                                disabled={disabled}
                                state={monthPicker}
                                dispatch={compose(dispatch, ActionMonthPicker.cons)}
                            />
                        </Dropdown.Menu>
                    )
                })}
            </Dropdown>
        );
    }

    private readonly onInputChange = (event: React.ChangeEvent<FormControlProps>) => {
        this.props.dispatch(new ChangeBrewedAfter(
            Maybe.fromNullable(this.props.min),
            Maybe.fromNullable(this.props.max),
            event.currentTarget.value || ''
        ));
    }

    private readonly onInputFocus = () => {
        if (this.props.monthPicker.isNothing()) {
            this.props.dispatch(new ShowMonthPicker());
            document.addEventListener('mousedown', this.closeDropdown, false);
        }
    }

    private readonly closeDropdown = (event: MouseEvent) => {
        if (this.props.monthPicker.isJust()
        && this.root.current
        && !this.root.current.contains(event.target as Node)
    ) {
            this.props.dispatch(new HideMonthPicker());
            document.removeEventListener('mousedown', this.closeDropdown, false);
        }
    }
}

export const View: React.FC<{
    minBrewedAfter?: MonthPicker.Selected;
    maxBrewedAfter?: MonthPicker.Selected;
    disabled?: boolean;
    compact?: boolean;
    state: State;
    dispatch(action: Action): void;
}> = ({ minBrewedAfter, maxBrewedAfter, disabled, compact, state, dispatch }) => (
    <Form
        noValidate
        onSubmit={(event: React.FormEvent) => {
            dispatch(new SearchBeer());

            event.preventDefault();
        }}
    >
        <Form.Row>
            <Form.Group as={Col} sm="7" className="mb-2 mb-sm-0">
                {!compact && (
                    <Form.Label>Beer name</Form.Label>
                )}

                <Form.Control
                    type="search"
                    value={state.name}
                    disabled={disabled}
                    autoFocus
                    tabIndex={0}
                    onChange={(event: React.ChangeEvent<FormControlProps>) => {
                        dispatch(new ChangeName(event.currentTarget.value || ''));
                    }}
                    placeholder="Search for a beer"
                />
            </Form.Group>

            <Form.Group as={Col} className="mb-0">
                {!compact && (
                    <Form.Label>Brewed after</Form.Label>
                )}

                <ViewMonthpicker
                    disabled={disabled}
                    min={minBrewedAfter}
                    max={maxBrewedAfter}
                    brewedAfter={state.brewedAfter}
                    monthPicker={state.monthPicker}
                    dispatch={dispatch}
                />
            </Form.Group>

            <Form.Group as={Col} sm="0" className="mb-0">
                {!compact && (
                    <Form.Label>&nbsp;</Form.Label>
                )}

                <Button
                    type="submit"
                    block
                    variant="outline-primary"
                    tabIndex={0}
                    disabled={disabled || !isValid(state)}
                >
                    <FontAwesomeIcon icon={faSearch} />
                </Button>
            </Form.Group>
        </Form.Row>
    </Form>
);
