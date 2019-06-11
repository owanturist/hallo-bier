import React from 'react';
import { RemoteData, Loading, Succeed } from 'frctl/dist/RemoteData';
import { Either } from 'frctl/dist/Either';
import { Cmd } from 'Cmd';
import * as Http from 'Http';
import * as Utils from './Utils';
import * as Api from './Api';
import * as BeerInfo from './BeerInfo';

export interface State {
    beer: RemoteData<Http.Error, Api.Beer>;
}

export const init = (beerId: number): [ State, Cmd<Action> ] => [
    {
        beer: Loading
    },
    Api.loadBeerById(beerId).send(LoadDone)
];

export const initWithBeer = (beer: Api.Beer): State => ({ beer: Succeed(beer) });

export abstract class Action extends Utils.Action<[ State ], State> {}

export const LoadDone = Utils.cons<[ Either<Http.Error, Api.Beer> ], Action>(class extends Action {
    public constructor(private readonly response: Either<Http.Error, Api.Beer>) {
        super('LoadDone');
    }

    public update(state: State): State {
        return {
            ...state,
            beer: RemoteData.fromEither(this.response)
        };
    }
});

export const update = (action: Action, state: State): State => action.update(state);

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
