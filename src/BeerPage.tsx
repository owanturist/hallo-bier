import React from 'react';
import { RemoteData, Loading } from 'frctl/dist/src/RemoteData';
import { Either } from 'frctl/dist/src/Either';
import { Cmd } from 'Cmd';
import * as Http from 'Http';
import * as Utils from './Utils';
import * as Api from './Api';
import * as BeerInfo from './BeerInfo';

export interface State {
    show: boolean;
    beer: RemoteData<Http.Error, Api.Beer>;
}

export const init = (beerId: number): [ State, Cmd<Action> ] => [
    {
        show: false,
        beer: Loading
    },
    Api.loadBeer(beerId).send(response => new LoadDone(response))
];

export abstract class Action extends Utils.Action<[ State ], State> {}

class LoadDone extends Action {
    public constructor(private readonly response: Either<Http.Error, Api.Beer>) {
        super();
    }

    public update(state: State): State {
        return {
            ...state,
            beer: RemoteData.fromEither(this.response)
        };
    }
}

export const update = (action: Action, state: State): State => action.update(state);

const ViewError: React.FC<{
    error: Http.Error;
}> = ({ error }) => (
    <div>
        <h2>Error was occupied:</h2>

        {error.cata({
            BadUrl: () => (
                <p>Bad Url of the API endpoint</p>
            ),

            Timeout: () => (
                <p>Connection is too slow</p>
            ),

            NetworkError: () => (
                <p>Check your connection</p>
            ),

            BadStatus: (response: Http.Response<string>) => (
                <p>Server error: {response.statusCode}</p>
            ),

            BadBody: decodeError => (
                <div>
                    <p>Client app error:</p>
                    <code>{decodeError.stringify(4)}</code>
                </div>
            )
        })}
    </div>
);

export const View: React.FC<{
    state: State;
}> = ({ state }) => state.beer.cata({
    Failure: error => (
        <ViewError error={error} />
    ),

    Succeed: beer => (
        <BeerInfo.View beer={beer} />
    ),

    _: () => (
        <BeerInfo.Skeleton />
    )
});
