import React from 'react';
import {
    Container,
    InputGroup,
    FormControl,
    Button,
    FormControlProps
} from 'react-bootstrap';
import * as Router from './Router';
import { Cmd } from 'Cmd';
import { Maybe, Nothing, Just } from 'frctl/dist/src/Maybe';
import * as MonthPicker from './MonthPicker';
import { compose } from 'redux';

export type Action
    = Readonly<{ type: 'CHANGE_NAME'; name: string }>
    | Readonly<{ type: 'CHANGE_BREWED_AFTER'; brewedAfter: string }>
    | Readonly<{ type: 'SEARCH' }>
    | Readonly<{ type: 'ACTION_MONTH_PICKER'; action: MonthPicker.Action }>
    ;

const Search: Action = { type: 'SEARCH' };
const ChangeName = (name: string): Action => ({ type: 'CHANGE_NAME', name });
const ChangeBrewedAfter = (brewedAfter: string): Action => ({ type: 'CHANGE_BREWED_AFTER', brewedAfter });
const ActionMonthPicker = (action: MonthPicker.Action): Action => ({ type: 'ACTION_MONTH_PICKER', action });

export type State = Readonly<{
    name: string;
    brewedAfter: string;
    monthPicker: MonthPicker.State;
}>;

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

export const init = (): [ State, Cmd<Action> ] => [
    {
        name: '',
        brewedAfter: '',
        monthPicker: MonthPicker.init(2010)
    },
    Cmd.none
];

export const update = (action: Action, state: State): [ State, Cmd<Action> ] => {
    switch (action.type) {
        case 'CHANGE_NAME': {
            return [
                { ...state, name: action.name },
                Cmd.none
            ];
        }

        case 'CHANGE_BREWED_AFTER': {
            return [
                { ...state, brewedAfter: action.brewedAfter },
                Cmd.none
            ];
        }

        case 'SEARCH': {
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

        case 'ACTION_MONTH_PICKER': {
            return [
                MonthPicker.update(action.action, state.monthPicker).cata({
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
};

export const View: React.FC<{
    state: State;
    dispatch(action: Action): void;
}> = ({ state, dispatch }) => (
    <Container>
        <form
            noValidate
            onSubmit={(event: React.FormEvent) => {
                dispatch(Search);

                event.preventDefault();
            }}
        >
            <InputGroup>
                <FormControl
                    type="search"
                    value={state.name}
                    tabIndex={0}
                    onChange={(event: React.ChangeEvent<FormControlProps>) => {
                        dispatch(ChangeName(event.currentTarget.value || ''));
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
                        dispatch(ChangeBrewedAfter(event.currentTarget.value || ''));
                    }}
                    placeholder="mm/yyyy"
                />
            </InputGroup>
        </form>
        <MonthPicker.View
            selected={selectedMonthFromString(state.brewedAfter)}
            state={state.monthPicker}
            dispatch={compose(dispatch, ActionMonthPicker)}
        />
        <Router.Link
            to={Router.ToBeerSearch(Nothing, Nothing)}
        >Explore all beer</Router.Link>
    </Container>
);
