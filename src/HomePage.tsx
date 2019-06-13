import React from 'react';
import { compose } from 'redux';
import Cmd from 'Cmd';
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
        () => Api.loadBeerList({
            searchFilter: { name: Nothing, brewedAfter: Nothing },
            perPage: beersPerPage,
            page: 1
        })
    );

    return [
        {
            beersPerPage,
            searchBuilder: SearchBuilder.init({ name: Nothing, brewedAfter: Nothing }),
            beerList: initialBeerList
        },
        cmdOfBeerList.map(BeerListAction)
    ];
};


export const getBeer = (id: number, state: State): Maybe<Api.Beer> => {
    return BeerList.getBeer(id, state.beerList);
};

export interface StagePattern<R> {
    Update(state: State, cmd: Cmd<Action>): R;
    SetFavorites(checked: boolean, beerId: number): R;
}

export interface Stage {
    cata<R>(patern: StagePattern<R>): R;
}

export const Update = Utils.cons(class implements Stage {
    public constructor(
        private readonly state: State,
        private readonly cmd: Cmd<Action>
    ) {}

    public cata<R>(pattern: StagePattern<R>): R {
        return pattern.Update(this.state, this.cmd);
    }
});

export const SetFavorites = Utils.cons(class implements Stage {
    public constructor(
        private readonly checked: boolean,
        private readonly beerId: number
    ) {}

    public cata<R>(pattern: StagePattern<R>): R {
        return pattern.SetFavorites(this.checked, this.beerId);
    }
});

export interface Action extends Utils.Action<[ State ], Stage> {}

export const BeerListAction = Utils.cons(class implements Action {
    public constructor(private readonly action: BeerList.Action) {}

    public update(state: State): Stage {
        return this.action.update(
            count => Api.loadBeerList({
                searchFilter: { name: Nothing, brewedAfter: Nothing },
                perPage: state.beersPerPage,
                page: count / state.beersPerPage + 1
            }),
            state.beerList
        ).cata<Stage>({
            Update: (nextBeerList, cmdOfBeerList) => Update(
                { ...state, beerList: nextBeerList },
                cmdOfBeerList.map(BeerListAction)
            ),

            SetFavorites
        });
    }
});

export const SearchBuilderAction = Utils.cons(class implements Action {
    public constructor(private readonly action: SearchBuilder.Action) {}

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
            dispatch={compose(dispatch, SearchBuilderAction)}
        />

        <hr/>

        <BeerList.View
            skeletonCount={4}
            state={state.beerList}
            dispatch={compose(dispatch, BeerListAction)}
            {...beerListProps}
        />
    </div>
);
