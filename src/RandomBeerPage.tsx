import React from 'react';
import { RemoteData, Loading } from 'frctl/dist/src/RemoteData';
import { Either } from 'frctl/dist/src/Either';
import * as Http from 'frctl/dist/src/Http';
import { Cmd } from 'Cmd';
import * as Utils from './Utils';
import * as Api from './Api';
import * as BeerInfo from './BeerInfo';

export interface State {
    beer: RemoteData<Http.Error, Api.Beer>;
}

export const init = (): [ State, Cmd<Action> ] => [
    {
        beer: Loading
    },
    Api.loadRandomBeer().send(LoadDone.cons)
];

export const isLoading = (state: State): boolean => state.beer.isLoading();

export abstract class Action extends Utils.Action<[ State ], [ State, Cmd<Action> ]> {}

class LoadDone extends Action {
    public static cons(response: Either<Http.Error, Api.Beer>): Action {
        return new LoadDone(response);
    }

    private constructor(private readonly response: Either<Http.Error, Api.Beer>) {
        super();
    }

    public update(state: State): [ State, Cmd<Action> ] {
        return [
            { ...state, beer: RemoteData.fromEither(this.response) },
            Cmd.none
        ];
    }
}

export const View: React.FC<{
    state: State;
}> = ({ state }) => state.beer.cata({
    Failure: error => (
        <BeerInfo.Error error={error} />
    ),

    Succeed: beer => (
        <BeerInfo.View beer={beer} />
    ),

    _: () => (
        <BeerInfo.Skeleton />
    )
});
