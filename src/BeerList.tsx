import React from 'react';
import { Link } from 'react-router-dom';
import {
    RemoteData,
    Loading,
} from 'frctl/dist/src/RemoteData';
import {
    Either
} from 'frctl/dist/src/Either';
import * as Decode from 'frctl/dist/src/Json/Decode';
import * as Http from 'Http_';
import { Cmd } from 'Cmd';

const PUNK_ENDPOINT = 'https://api.punkapi.com/v2/beers';

type Beer = Readonly<{
    id: number;
    name: string;
    description: string;
    tagline: string;
    image: string;
    firstBrewed: Date;
}>;

const beerDecoder: Decode.Decoder<Beer> = Decode.props({
    id: Decode.field('id', Decode.number),
    name: Decode.field('name', Decode.string),
    description: Decode.field('description', Decode.string),
    tagline: Decode.field('tagline', Decode.string),
    image: Decode.field('image_url', Decode.string),
    firstBrewed: Decode.field('first_brewed', Decode.string.map((shortDate: string) => new Date(`01/${shortDate}`)))
});

const load = (pageNumber: number): Http.Request<Array<Beer>> => {
    return Http.get(PUNK_ENDPOINT)
        .withQueryParam('page', pageNumber.toString())
        .withQueryParam('per_page', '10')
        .withExpect(Http.expectJson(Decode.list(beerDecoder)));
};

export type Action
    = Readonly<{ type: 'LOAD' }>
    | Readonly<{ type: 'LOAD_DONE'; response: Either<Http.Error, Array<Beer>> }>
    ;

const Load: Action = { type: 'LOAD' };
const LoadDone = (response: Either<Http.Error, Array<Beer>>): Action => ({ type: 'LOAD_DONE', response });

export type State = Readonly<{
    pageNumber: number;
    beerList: RemoteData<Http.Error, Array<Beer>>;
}>;

export const init = (pageNumber: number): [ State, Cmd<Action> ] => [
    {
        pageNumber,
        beerList: Loading
    },
    load(pageNumber).send(LoadDone)
];

export const update = (action: Action, state: State): [ State, Cmd<Action> ] => {
    switch (action.type) {
        case 'LOAD': {
            return [
                { ...state, beerList: Loading },
                load(state.pageNumber).send(LoadDone)
            ];
        }

        case 'LOAD_DONE': {
            return [
                { ...state, beerList: RemoteData.fromEither(action.response) },
                Cmd.none
            ];
        }
    }
};

const BeerView: React.FC<{
    beer: Beer;
}> = ({ beer }) => (
    <div>
        <img src={beer.image} alt={beer.name} />
        <h3>{beer.name}</h3>
        <small>{beer.tagline}</small>
        <p>{beer.description}</p>
        <Link to={`/beer/${beer.id}`}>See more</Link>
    </div>
);

const PageSucceed: React.FC<{
    beerList: Array<Beer>;
}> = ({ beerList }) => (
    <ul>
        {beerList.map((beer: Beer) => (
            <li key={beer.id}><BeerView beer={beer}/></li>
        ))}
    </ul>
);

const PageFailure: React.FC<{
    error: Http.Error;
    dispatch(action: Action): void;
}> = ({ error, dispatch }) => (
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
                <div>
                    <p>Server error: {response.statusCode}</p>
                    <button onClick={() => dispatch(Load)}>Try again</button>
                </div>
            ),

            BadBody: (error: Decode.Error) => (
                <div>
                    <p>Client app erro:</p>
                    <code>{error.stringify(4)}</code>
                </div>
            )
        })}
    </div>
);

const PageLoading: React.FC = () => (
    <div>Beer is loading...</div>
);

export const View: React.FC<{
    state: State;
    dispatch(action: Action): void;
}> = ({ state, dispatch }) => state.beerList.cata({
    NotAsked: () => <div>Never happens</div>,

    Loading: () => <PageLoading />,

    Failure: (error: Http.Error) => <PageFailure error={error} dispatch={dispatch} />,

    Succeed: (beerList: Array<Beer>) => <PageSucceed beerList={beerList} />
});
