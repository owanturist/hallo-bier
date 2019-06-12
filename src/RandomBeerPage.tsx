import React from 'react';
import { RemoteData, Loading } from 'frctl/dist/RemoteData';
import { Maybe } from 'frctl/dist/Maybe';
import { Either } from 'frctl/dist/Either';
import * as Http from 'Http';
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
    Api.loadRandomBeer().send(LoadDone)
];

export const getBeer = (state: State): Maybe<Api.Beer> => state.beer.toMaybe();

export const isLoading = (state: State): boolean => state.beer.isLoading();

export interface Action extends Utils.Action<[ State ], [ State, Cmd<Action> ]> {}

export const LoadDone = Utils.cons(class implements Action {
    public constructor(private readonly response: Either<Http.Error, Api.Beer>) {}

    public update(state: State): [ State, Cmd<Action> ] {
        return [
            { ...state, beer: RemoteData.fromEither(this.response) },
            Cmd.none
        ];
    }
});

export const View: React.FC<{
    state: State;
}> = ({ state }) => state.beer.cata({
    Failure: error => (
        <BeerInfo.Error error={error} />
    ),

    Succeed: beer => (
        <BeerInfo.View random beer={beer} />
    ),

    _: () => (
        <BeerInfo.Skeleton />
    )
});
