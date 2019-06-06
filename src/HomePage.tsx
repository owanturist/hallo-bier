import React from 'react';
import {
    Container
} from 'react-bootstrap';
import { compose } from 'redux';
import { Cmd } from 'Cmd';
import { Nothing } from 'frctl/dist/src/Maybe';
import * as SearchBuilder from './SearchBuilder';
import * as Router from './Router';

export type Action
    = Readonly<{ type: 'ACTION_SEARCH_BUILDER'; action: SearchBuilder.Action }>
    ;

const ActionSearchBuilder = (action: SearchBuilder.Action): Action => ({ type: 'ACTION_SEARCH_BUILDER', action });

export type State = Readonly<{
    searchBuilder: SearchBuilder.State;
}>;

export const init = (): State => ({
    searchBuilder: SearchBuilder.init('', Nothing)
});

export const update = (action: Action, state: State): [ State, Cmd<Action> ] => {
    switch (action.type) {
        case 'ACTION_SEARCH_BUILDER': {
            return action.action.update(state.searchBuilder).cata({
                Update: (nextSearchBuilder): [ State, Cmd<Action> ] => [
                    { ...state, searchBuilder: nextSearchBuilder },
                    Cmd.none
                ],

                Search: (search): [ State, Cmd<Action> ] => [
                    state,
                    Router.push(Router.ToBeerSearch(search.name, search.brewedAfter))
                ]
            });
        }
    }
};

export const View: React.FC<{
    state: State;
    dispatch(action: Action): void;
}> = ({ state, dispatch }) => (
    <Container>
        <SearchBuilder.View
            state={state.searchBuilder}
            dispatch={compose(dispatch, ActionSearchBuilder)}
        />
    </Container>
);
