import React from 'react';
import { compose } from 'redux';
import { Cmd } from 'Cmd';
import * as Utils from './Utils';
import * as BeerList from './BeerList';
import * as Router from './Router';
import * as Api from './Api';

export interface State {
    beersPerPage: number;
    beerList: BeerList.State;
}

export const init = (beersPerPage: number, filter: Router.SearchFilter): [ State, Cmd<Action> ] => {
    const [ initialBeerList, cmdOfBeerList ] = BeerList.init(
        count => Api.loadBeerList(filter, beersPerPage, count / beersPerPage + 1)
    );

    return [
        {
            beersPerPage,
            beerList: initialBeerList
        },
        cmdOfBeerList.map(ActionBeerList.cons)
    ];
};

export const isEmpty = (state: State): boolean => BeerList.isEmpty(state.beerList);

export abstract class Action extends Utils.Action<[ Router.SearchFilter, State ], [ State, Cmd<Action> ]> {}

class ActionBeerList extends Action {
    public static cons(action: BeerList.Action): Action {
        return new ActionBeerList(action);
    }

    private constructor(private readonly action: BeerList.Action) {
        super();
    }

    public update(filter: Router.SearchFilter, state: State): [ State, Cmd<Action> ] {
        const [ nextBeerList, cmdOfBeerList ] = this.action.update(
            count => Api.loadBeerList(filter, state.beersPerPage, count / state.beersPerPage + 1),
            state.beerList
        );

        return [
            { ...state, beerList: nextBeerList },
            cmdOfBeerList.map(ActionBeerList.cons)
        ];
    }
}

export interface ViewProps {
    scroller: React.RefObject<HTMLElement>;
    state: State;
    dispatch(action: Action): void;
}

export const View: React.FC<ViewProps> = ({ scroller, state, dispatch}) => (
    <BeerList.View
        scroller={scroller}
        state={state.beerList}
        dispatch={compose(dispatch, ActionBeerList.cons)}
    />
);
