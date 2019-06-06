import React from 'react';
import {
    InputGroup,
    FormControl,
    Button,
    FormControlProps
} from 'react-bootstrap';
import * as Router from './Router';
import { Cmd } from 'Cmd';
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
        month: isNaN(monthIndex) ? Nothing : MonthPicker.Month.fromIndex(monthIndex),
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

export abstract class Action extends Utils.Action<[ State ], [ State, Cmd<Action> ]> {}

class ChangeName extends Action {
    public constructor(private readonly name: string) {
        super();
    }

    public update(state: State): [ State, Cmd<Action> ] {
        return [
            { ...state, name: this.name },
            Cmd.none
        ];
    }
}

class ChangeBrewedAfter extends Action {
    public constructor(private readonly brewedAfter: string) {
        super();
    }

    public update(state: State): [ State, Cmd<Action> ] {
        return [
            { ...state, brewedAfter: this.brewedAfter },
            Cmd.none
        ];
    }
}

class Search extends Action {
    public update(state: State): [ State, Cmd<Action> ] {
        return [
            state,
            Router.push(Router.ToBeerSearch(
                Just(state.name),
                selectedMonthFromString(state.brewedAfter).map(
                    (selected: MonthPicker.Selected): Date => selected.month.toDate(selected.year)
                )
            ))
        ];
    }
}

class ActionMonthPicker extends Action {
    public constructor(private readonly action: MonthPicker.Action) {
        super();
    }

    public update(state: State): [ State, Cmd<Action> ] {
        return [
            this.action.update(state.monthPicker).cata({
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
            }),
            Cmd.none
        ];
    }
}

export const update = (action: Action, state: State): [ State, Cmd<Action> ] => action.update(state);

export const View: React.FC<{
    state: State;
    dispatch(action: Action): void;
}> = ({ state, dispatch }) => (
    <form
        noValidate
        onSubmit={(event: React.FormEvent) => {
            dispatch(new Search());

            event.preventDefault();
        }}
    >
        <InputGroup>
            <FormControl
                type="search"
                value={state.name}
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
                    disabled={!isValid(state)}
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
                onChange={(event: React.ChangeEvent<FormControlProps>) => {
                    dispatch(new ChangeBrewedAfter(event.currentTarget.value || ''));
                }}
                placeholder="mm/yyyy"
            />
        </InputGroup>

        <MonthPicker.View
            selected={selectedMonthFromString(state.brewedAfter)}
            state={state.monthPicker}
            dispatch={action => dispatch(new ActionMonthPicker(action))}
        />
        <Router.Link
            to={Router.ToBeerSearch(Nothing, Nothing)}
        >Explore all beer</Router.Link>
    </form>
);
