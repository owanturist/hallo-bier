import React from 'react';
import {
    InputGroup,
    FormControl,
    Button,
    FormControlProps
} from 'react-bootstrap';
import { compose } from 'redux';
import * as Router from './Router';
import { Maybe, Nothing, Just } from 'frctl/dist/src/Maybe';
import * as MonthPicker from './MonthPicker';
import * as Utils from './Utils';

export interface State {
    name: string;
    brewedAfter: string;
    monthPicker: MonthPicker.State;
}

const isValid = (state: State): boolean => {
    return state.name.trim().length > 0 || selectedMonthFromString(state.brewedAfter).isJust();
};

const selectedMonthToString = (selected: MonthPicker.Selected): string => {
    return `${selected.month.toIndex().toString().padStart(2, '0')}/${selected.year}`;
};

const selectedMonthFromString = (str: string): Maybe<MonthPicker.Selected> => {
    const fragments = str.trim().split(/\/|\s|-|_/g);

    if (fragments.length !== 2) {
        return Nothing;
    }

    const [ monthIndex, year ] = [ Number(fragments[0]), Number(fragments[1]) ];

    return Maybe.props({
        month: isNaN(monthIndex) && monthIndex > 0 && monthIndex < 13
            ? Nothing
            : Just(MonthPicker.Month.fromIndex(monthIndex)),
        year: isNaN(year) ? Nothing : Just(year)
    });
};

export const init = (
    initialName: string,
    initialBrewAfter: Maybe<MonthPicker.Selected>
): State => ({
    name: initialName,
    brewedAfter: initialBrewAfter.map(selectedMonthToString).getOrElse(''),
    monthPicker: MonthPicker.init(initialBrewAfter.map(selected => selected.year).getOrElse(2010))
});

interface SearchConfig {
    name: Maybe<string>;
    brewedAfter: Maybe<Date>;
}

interface StagePattern<R> {
    Update(nextSearchBuilder: State): R;
    Search(config: SearchConfig): R;
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

class Search extends Stage {
    private readonly name: Maybe<string>;
    private readonly brewedAfter: Maybe<Date>;

    public constructor({ name, brewedAfter }: State) {
        super();

        const trimmedName = name.trim();

        this.name = trimmedName ? Just(trimmedName) : Nothing;
        this.brewedAfter = selectedMonthFromString(brewedAfter).map(({ month, year }) => month.toDate(year));
    }

    public cata<R>(pattern: StagePattern<R>): R {
        return pattern.Search({
            name: this.name,
            brewedAfter: this.brewedAfter
        });
    }
}

export abstract class Action extends Utils.Action<[ State ], Stage> {}

class ChangeName extends Action {
    public constructor(private readonly name: string) {
        super();
    }

    public update(state: State): Stage {
        return new Update({ ...state, name: this.name });
    }
}

class ChangeBrewedAfter extends Action {
    public constructor(private readonly brewedAfter: string) {
        super();
    }

    public update(state: State): Stage {
        return new Update({ ...state, brewedAfter: this.brewedAfter });
    }
}

class SearchBeer extends Action {
    public update(state: State): Stage {
        return new Search(state);
    }
}

class ActionMonthPicker extends Action {
    public static cons(action: MonthPicker.Action): Action {
        return new ActionMonthPicker(action);
    }

    private constructor(private readonly action: MonthPicker.Action) {
        super();
    }

    public update(state: State): Stage {
        return new Update(this.action.update(state.monthPicker).cata({
            Update: (nextMonthPicker: MonthPicker.State) => ({
                ...state,
                monthPicker: nextMonthPicker
            }),

            Select: (brewedAfter: MonthPicker.Selected) => ({
                ...state,
                brewedAfter: selectedMonthToString(brewedAfter)
            }),

            Unselect: () => ({
                ...state,
                brewedAfter: ''
            })
        }));
    }
}

export const View: React.FC<{
    disabled?: boolean;
    state: State;
    dispatch(action: Action): void;
}> = ({ disabled, state, dispatch }) => (
    <form
        noValidate
        onSubmit={(event: React.FormEvent) => {
            dispatch(new SearchBeer());

            event.preventDefault();
        }}
    >
        <InputGroup>
            <FormControl
                type="search"
                value={state.name}
                disabled={disabled}
                tabIndex={0}
                onChange={(event: React.ChangeEvent<FormControlProps>) => {
                    dispatch(new ChangeName(event.currentTarget.value || ''));
                }}
                placeholder="Search for a beer"
            />
            <InputGroup.Append>
                <Button
                    type="submit"
                    variant="outline-primary"
                    tabIndex={0}
                    disabled={disabled || !isValid(state)}
                >
                    Search
                </Button>
            </InputGroup.Append>
        </InputGroup>
        <InputGroup>
            <FormControl
                type="text"
                value={state.brewedAfter}
                tabIndex={0}
                disabled={disabled}
                onChange={(event: React.ChangeEvent<FormControlProps>) => {
                    dispatch(new ChangeBrewedAfter(event.currentTarget.value || ''));
                }}
                placeholder="mm/yyyy"
            />
        </InputGroup>

        <MonthPicker.View
            min={[ MonthPicker.Month.fromIndex(1), 0 ]}
            max={[ MonthPicker.Month.fromIndex(6), 2019 ]}
            selected={selectedMonthFromString(state.brewedAfter)}
            disabled={disabled}
            state={state.monthPicker}
            dispatch={compose(dispatch, ActionMonthPicker.cons)}
        />
        <Router.Link
            to={Router.ToBeerSearch(Nothing, Nothing)}
        >Explore all beer</Router.Link>
    </form>
);
