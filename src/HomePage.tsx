import React from 'react';
import {
    Container
} from 'react-bootstrap';
import { Cmd } from 'Cmd';
import { Nothing } from 'frctl/dist/src/Maybe';
import * as Utils from './Utils';
import * as SearchBuilder from './SearchBuilder';
import * as Router from './Router';

export interface State {
    searchBuilder: SearchBuilder.State;
}

export const init = (): State => ({
    searchBuilder: SearchBuilder.init('', Nothing)
});

export abstract class Action extends Utils.Action<[ State ], [ State, Cmd<Action> ]> {}

class ActionSearchBuilder extends Action {
    public constructor(
        private readonly action: SearchBuilder.Action
    ) {
        super();
    }

    public update(state: State): [ State, Cmd<Action> ] {
        return this.action.update(state.searchBuilder).cata({
            Update: (nextSearchBuilder): [ State, Cmd<Action> ] => [
                { ...state, searchBuilder: nextSearchBuilder },
                Cmd.none
            ],

            Search: (search): [ State, Cmd<Action> ] => [
                state,
                Router.ToBeerSearch(search.name, search.brewedAfter).push()
            ]
        });
    }
}

export const View: React.FC<{
    state: State;
    dispatch(action: Action): void;
}> = ({ state, dispatch }) => (
    <Container>
        <SearchBuilder.View
            state={state.searchBuilder}
            dispatch={action => dispatch(new ActionSearchBuilder(action))}
        />
    </Container>
);
