import React from 'react';
import {
    Container
} from 'react-bootstrap';
import { Cmd } from 'Cmd';
import { Nothing } from 'frctl/dist/src/Maybe';
import * as SearchBuilder from './SearchBuilder';
import { compose } from 'redux';

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
            const [ nextSearchBuilder, cmdOfSearchBuilder ] = SearchBuilder.update(action.action, state.searchBuilder);

            return [
                { ...state, searchBuilder: nextSearchBuilder },
                cmdOfSearchBuilder.map(ActionSearchBuilder)
            ];
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
