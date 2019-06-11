import React from 'react';
import { compose } from 'redux';
import { Maybe } from 'frctl/dist/Maybe';
import { Cmd } from './Cmd';
import * as Utils from './Utils';
import * as Router from './Router';
import * as Api from './Api';
import * as BeerList from './BeerList';

export interface State {
    beersPerPage: number;
    beerList: BeerList.State;
}

export const init = (
    filter: Router.SearchFilter,
    beersPerPage: number
): [ State, Cmd<Action> ] => {
    const [ initialBeerList, cmdOfBeerList ] = BeerList.init(
        () => Api.loadBeerList(filter, beersPerPage, 1)
    );

    return [
        {
            beersPerPage,
            beerList: initialBeerList
        },
        cmdOfBeerList.map(BeerListAction)
    ];
};

export const getBeer = (id: number, state: State): Maybe<Api.Beer> => {
    return BeerList.getBeer(id, state.beerList);
};

export const isEmpty = (state: State): boolean => BeerList.isEmpty(state.beerList);

export interface StagePattern<R> {
    Update(state: State, cmd: Cmd<Action>): R;
    SetFavorites(checked: boolean, beerId: number): R;
}

export abstract class Stage {
    public abstract cata<R>(patern: StagePattern<R>): R;
}

export const Update = Utils.cons<[ State, Cmd<Action> ], Stage>(class extends Stage {
    public constructor(
        private readonly state: State,
        private readonly cmd: Cmd<Action>
    ) {
        super();
    }

    public cata<R>(pattern: StagePattern<R>): R {
        return pattern.Update(this.state, this.cmd);
    }
});

export const SetFavorites = Utils.cons<[ boolean, number ], Stage>(class extends Stage {
    public constructor(
        private readonly checked: boolean,
        private readonly beerId: number
    ) {
        super();
    }

    public cata<R>(pattern: StagePattern<R>): R {
        return pattern.SetFavorites(this.checked, this.beerId);
    }
});

export abstract class Action extends Utils.Action<[ Router.SearchFilter, State ], Stage> {}

export const BeerListAction = Utils.cons<[ BeerList.Action ], Action>(class extends Action {
    public constructor(private readonly action: BeerList.Action) {
        super('BeerListAction');
    }

    public update(filter: Router.SearchFilter, state: State): Stage {
        return this.action.update(
            count => Api.loadBeerList(
                filter,
                state.beersPerPage,
                count / state.beersPerPage + 1
            ),
            state.beerList
        ).cata({
            Update: (nextBeerList, cmdOfBeerList) => Update(
                { ...state, beerList: nextBeerList },
                cmdOfBeerList.map(BeerListAction)
            ),

            SetFavorites
        });
    }
});

export const View: React.FC<{
    scroller: React.RefObject<HTMLElement>;
    favorites: Set<number>;
    state: State;
    dispatch(action: Action): void;
}> = ({ state, dispatch, ...beerListProps }) => (
    <BeerList.View
        skeletonCount={4}
        state={state.beerList}
        dispatch={compose(dispatch, BeerListAction)}
        {...beerListProps}
    />
);
