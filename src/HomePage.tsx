import React from 'react';
import { compose } from 'redux';
import { Cmd } from 'Cmd';
import { Nothing } from 'frctl/dist/src/Maybe';
import * as Utils from './Utils';
import * as SearchBuilder from './SearchBuilder';
import * as Router from './Router';
import { Month } from './MonthPicker';

export interface State {
    searchBuilder: SearchBuilder.State;
}

export const init = (): State => ({
    searchBuilder: SearchBuilder.init('', Nothing)
});

export abstract class Action extends Utils.Action<[ State ], [ State, Cmd<Action> ]> {}

class ActionSearchBuilder extends Action {
    public static cons(action: SearchBuilder.Action) {
        return new ActionSearchBuilder(action);
    }

    private constructor(private readonly action: SearchBuilder.Action) {
        super();
    }

    public update(state: State): [ State, Cmd<Action> ] {
        return this.action.update(state.searchBuilder).cata({
            Update: (nextSearchBuilder): [ State, Cmd<Action> ] => [
                { ...state, searchBuilder: nextSearchBuilder },
                Cmd.none
            ],

            Search: (filter): [ State, Cmd<Action> ] => [
                state,
                Router.ToBeerSearch(filter).push()
            ]
        });
    }
}

export const View: React.FC<{
    minBrewedAfter?: [ Month, number ];
    maxBrewedAfter?: [ Month, number ];
    state: State;
    dispatch(action: Action): void;
}> = ({ minBrewedAfter, maxBrewedAfter, state, dispatch }) => (
    <SearchBuilder.View
        minBrewedAfter={minBrewedAfter}
        maxBrewedAfter={maxBrewedAfter}
        state={state.searchBuilder}
        dispatch={compose(dispatch, ActionSearchBuilder.cons)}
    />
);
