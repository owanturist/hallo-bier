import React from 'react';
import { compose } from 'redux';
import { Cmd } from 'Cmd';
import { Maybe, Nothing } from 'frctl/dist/Maybe';
import * as Utils from './Utils';
import * as Api from './Api';
import * as Router from './Router';
import * as MonthPicker from './MonthPicker';
import * as SearchBuilder from './SearchBuilder';
import * as BeerList from './BeerList';

export interface State {
    beersPerPage: number;
    searchBuilder: SearchBuilder.State;
    beerList: BeerList.State;
}

export const init = (beersPerPage: number): [ State, Cmd<Action> ] => {
    const [ initialBeerList, cmdOfBeerList ] = BeerList.init(
        () => Api.loadBeerList({ name: Nothing, brewedAfter: Nothing }, beersPerPage, 1)
    );

    return [
        {
            beersPerPage,
            searchBuilder: SearchBuilder.init({ name: Nothing, brewedAfter: Nothing }),
            beerList: initialBeerList
        },
        cmdOfBeerList.map(ActionBeerList)
    ];
};


export const getBeer = (id: number, state: State): Maybe<Api.Beer> => {
    return BeerList.getBeer(id, state.beerList);
};

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

export abstract class Action extends Utils.Action<[ State ], Stage> {}

export const ActionBeerList = Utils.cons<[ BeerList.Action ], Action>(class extends Action {
    public constructor(private readonly action: BeerList.Action) {
        super('ActionBeerList');
    }

    public update(state: State): Stage {
        return this.action.update(
            count => Api.loadBeerList(
                { name: Nothing, brewedAfter: Nothing },
                state.beersPerPage,
                count / state.beersPerPage + 1
            ),
            state.beerList
        ).cata({
            Update: (nextBeerList, cmdOfBeerList) => Update(
                { ...state, beerList: nextBeerList },
                cmdOfBeerList.map(ActionBeerList)
            ),

            SetFavorites
        });
    }
});

export const ActionSearchBuilder = Utils.cons<[ SearchBuilder.Action ], Action>(class extends Action {
    public constructor(private readonly action: SearchBuilder.Action) {
        super('ActionSearchBuilder');
    }

    public update(state: State): Stage {
        return this.action.update(state.searchBuilder).cata({
            Update: nextSearchBuilder => Update(
                { ...state, searchBuilder: nextSearchBuilder },
                Cmd.none
            ),

            Search: filter => Update(
                state,
                Router.ToBeerSearch(filter).push()
            )
        });
    }
});

export const View: React.FC<{
    minBrewedAfter?: MonthPicker.Selected;
    maxBrewedAfter?: MonthPicker.Selected;
    scroller: React.RefObject<HTMLElement>;
    favorites: Set<number>;
    state: State;
    dispatch(action: Action): void;
}> = ({ minBrewedAfter, maxBrewedAfter, state, dispatch, ...beerListProps }) => (
    <div>
        <SearchBuilder.View
            minBrewedAfter={minBrewedAfter}
            maxBrewedAfter={maxBrewedAfter}
            state={state.searchBuilder}
            dispatch={compose(dispatch, ActionSearchBuilder)}
        />

        <hr/>

        <BeerList.View
            skeletonCount={4}
            state={state.beerList}
            dispatch={compose(dispatch, ActionBeerList)}
            {...beerListProps}
        />
    </div>
);
