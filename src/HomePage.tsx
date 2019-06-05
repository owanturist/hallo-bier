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
    = Readonly<{ type: 'CHANGE_QUERY'; q: string }>
    | Readonly<{ type: 'SEARCH' }>
    | Readonly<{ type: 'ACTION_MONTH_PICKER'; action: MonthPicker.Action }>
    ;

const Search: Action = { type: 'SEARCH' };
const ChangeQuery = (q: string): Action => ({ type: 'CHANGE_QUERY', q });
const ActionMonthPicker = (action: MonthPicker.Action): Action => ({ type: 'ACTION_MONTH_PICKER', action });

export type State = Readonly<{
    query: string;
    brewedAfter: Maybe<MonthPicker.Selected>;
    monthPicker: MonthPicker.State;
}>;

const selectedMonthToString = (selected: MonthPicker.Selected): string => {
    return `${selected.month.toIndex().toString().padStart(2, '0')}/${selected.year}`;
};

export const init = (): [ State, Cmd<Action> ] => [
    {
        query: '',
        brewedAfter: Nothing,
        monthPicker: MonthPicker.init(2019)
    },
    Cmd.none
];

export const update = (action: Action, state: State): [ State, Cmd<Action> ] => {
    switch (action.type) {
        case 'CHANGE_QUERY': {
            return [
                { ...state, query: action.q },
                Cmd.none
            ];
        }

        case 'SEARCH': {
            return [
                state,
                Router.push(Router.ToBeerSearch(
                    Just(state.query),
                    state.brewedAfter.map(
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
                        brewedAfter: Just(brewedAfter)
                    }),

                    Unselect: () => ({
                        ...state,
                        brewedAfter: Nothing
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
                    value={state.query}
                    tabIndex={0}
                    onChange={(event: React.ChangeEvent<FormControlProps>) => {
                        dispatch(ChangeQuery(event.currentTarget.value || ''));
                    }}
                    placeholder="Search for a beer"
                />
                <InputGroup.Append>
                    <Button
                        type="submit"
                        variant="outline-primary"
                        tabIndex={0}
                        disabled={state.query.trim().length === 0}
                    >
                        Search
                    </Button>
                </InputGroup.Append>
            </InputGroup>
            <InputGroup>
                <FormControl
                    type="text"
                    value={state.brewedAfter.map(selectedMonthToString).getOrElse('')}
                    tabIndex={0}
                    onChange={() => {
                        // tslint:disable-next-line:no-console
                        console.log('change');
                    }}
                    placeholder="mm/yyyy"
                />
            </InputGroup>
        </form>
        <MonthPicker.View
            selected={state.brewedAfter}
            state={state.monthPicker}
            dispatch={compose(dispatch, ActionMonthPicker)}
        />
    </Container>
);
