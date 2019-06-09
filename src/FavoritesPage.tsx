import React from 'react';
import { compose } from 'redux';
import { Maybe, Nothing, Just } from 'frctl/dist/src/Maybe';
import { Cmd } from './Cmd';
import * as Utils from './Utils';
import * as Router from './Router';
import * as Api from './Api';
import * as BeerList from './BeerList';

export type State = Maybe<{
    beersPerPage: number;
    favorites: Array<number>;
    beerList: BeerList.State;
}>;

export const init = (
    filter: Router.SearchFilter,
    favorites: Array<number>,
    beersPerPage: number
): [ State, Cmd<Action> ] => {
    if (favorites.length === 0) {
        return [
            Nothing,
            Cmd.none
        ];
    }

    const [ initialBeerList, cmdOfBeerList ] = BeerList.init(
        () => Api.loadBeerListByIds(filter, favorites, beersPerPage, 1)
    );

    return [
        Just({
            beersPerPage,
            favorites,
            beerList: initialBeerList
        }),
        cmdOfBeerList.map(ActionBeerList.cons)
    ];
};

export const isEmpty = (state: State): boolean => state.map(
    ({ beerList }) => BeerList.isEmpty(beerList)
).getOrElse(false);


export interface StagePattern<R> {
    Update(state: State, cmd: Cmd<Action>): R;
    SetFavorites(checked: boolean, beerId: number): R;
}

export abstract class Stage {
    public abstract cata<R>(patern: StagePattern<R>): R;
}

class Update extends Stage {
    public constructor(
        private readonly state: State,
        private readonly cmd: Cmd<Action>
    ) {
        super();
    }

    public cata<R>(pattern: StagePattern<R>): R {
        return pattern.Update(this.state, this.cmd);
    }
}

class SetFavorites extends Stage {
    public static cons(checked: boolean, beerId: number): Stage {
        return new SetFavorites(checked, beerId);
    }

    private constructor(
        private readonly checked: boolean,
        private readonly beerId: number
    ) {
        super();
    }

    public cata<R>(pattern: StagePattern<R>): R {
        return pattern.SetFavorites(this.checked, this.beerId);
    }
}

export abstract class Action extends Utils.Action<[ Router.SearchFilter, State ], Stage> {}

class ActionBeerList extends Action {
    public static cons(action: BeerList.Action): Action {
        return new ActionBeerList(action);
    }

    private constructor(private readonly action: BeerList.Action) {
        super();
    }

    public update(filter: Router.SearchFilter, mState: State): Stage {
        return mState.cata({
            Nothing: () => new Update(Nothing, Cmd.none),

            Just: state => this.action.update(
                count => Api.loadBeerListByIds(
                    filter,
                    state.favorites,
                    state.beersPerPage,
                    count / state.beersPerPage + 1
                ),
                state.beerList
            ).cata({
                Update: (nextBeerList, cmdOfBeerList) => new Update(
                    Just({ ...state, beerList: nextBeerList }),
                    cmdOfBeerList.map(ActionBeerList.cons)
                ),

                SetFavorites: SetFavorites.cons
            })
        });
    }
}

export const View: React.FC<{
    scroller: React.RefObject<HTMLElement>;
    favorites: Set<number>;
    state: State;
    dispatch(action: Action): void;
}> = ({ state, dispatch, ...props }) => state.cata({
    Nothing: () => (
        <div>Oops... your favorites is empty</div>
    ),

    Just: ({ beerList }) => (
        <BeerList.View
            state={beerList}
            dispatch={compose(dispatch, ActionBeerList.cons)}
            {...props}
        />
    )
});
