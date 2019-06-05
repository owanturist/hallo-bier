import React from 'react';
import { Link } from 'react-router-dom';
import {
    RemoteData,
    NotAsked,
    Loading,
    Failure
} from 'frctl/dist/src/RemoteData';
import {
    Maybe
} from 'frctl/dist/src/Maybe';
import {
    Either
} from 'frctl/dist/src/Either';
import * as Decode from 'frctl/dist/src/Json/Decode';
import * as Http from 'Http';
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

export type LoadFiltering = Readonly<{
    name: Maybe<string>;
    brewedAfter: Maybe<Date>;
}>;

const load = (filtering: LoadFiltering, beersPerPage: number, pageNumber: number): Http.Request<Array<Beer>> => {
    return Http.get(PUNK_ENDPOINT)
        .withQueryParam('page', pageNumber.toString())
        .withQueryParam('per_page', beersPerPage.toString())
        .withQueryParams(filtering.name.map((name: string): Array<[string, string]> => [
            ['beer_name', name]
        ]).getOrElse([]))
        .withQueryParams(filtering.brewedAfter.map((brewedAfter: Date): Array<[ string, string ]> => [
            [ 'brewed_after', brewedAfter.toLocaleDateString().slice(3) ]
        ]).getOrElse([]))
        .withExpect(Http.expectJson(Decode.list(beerDecoder)));
};

export type Action
    = Readonly<{ type: 'RELOAD' }>
    | Readonly<{ type: 'LOAD_MORE' }>
    | Readonly<{ type: 'LOAD_DONE'; response: Either<Http.Error, Array<Beer>> }>
    ;

const Reload: Action = { type: 'RELOAD' };
const LoadMore: Action = { type: 'LOAD_MORE' };
const LoadDone = (response: Either<Http.Error, Array<Beer>>): Action => ({ type: 'LOAD_DONE', response });

export type State = Readonly<{
    hasMore: boolean;
    beersPerPage: number;
    filtering: LoadFiltering;
    beerList: Array<Beer>;
    loading: RemoteData<Http.Error, never>;
}>;

export const init = (beersPerPage: number, filtering: LoadFiltering): [ State, Cmd<Action> ] => [
    {
        beersPerPage,
        filtering,
        hasMore: true,
        beerList: [],
        loading: Loading
    },
    load(filtering, beersPerPage, 1).send(LoadDone)
];

export const update = (action: Action, state: State): [ State, Cmd<Action> ] => {
    switch (action.type) {
        case 'RELOAD': {
            return [
                { ...state, loading: Loading },
                load(
                    state.filtering,
                    state.beersPerPage,
                    state.beerList.length / state.beersPerPage
                ).send(LoadDone)
            ];
        }

        case 'LOAD_MORE': {
            return [
                state,
                load(
                    state.filtering,
                    state.beersPerPage,
                    state.beerList.length / state.beersPerPage + 1
                ).send(LoadDone)
            ];
        }

        case 'LOAD_DONE': {
            return [
                action.response.cata({
                    Left: (error: Http.Error): State => ({
                        ...state,
                        loading: Failure(error)
                    }),

                    Right: (beerList: Array<Beer>): State => ({
                        ...state,
                        hasMore: beerList.length === state.beersPerPage,
                        loading: NotAsked,
                        beerList: state.beerList.concat(beerList)
                    })
                }),
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
    hasMore: boolean;
    beerList: Array<Beer>;
    dispatch(action: Action): void;
}> = ({ hasMore, beerList, dispatch }) => (
    <div>
        <ul>
            {beerList.map((beer: Beer) => (
                <li key={beer.id}><BeerView beer={beer}/></li>
            ))}
        </ul>
        {hasMore ? (
            <div>
                <button
                    type="button"
                    onClick={() => dispatch(LoadMore)}
                >Load More Beer!</button>
            </div>
        ) : (
            <div>There aren't more beer.</div>
        )}
    </div>
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
                    <button onClick={() => dispatch(Reload)}>Try again</button>
                </div>
            ),

            BadBody: (error: Decode.Error) => (
                <div>
                    <p>Client app error:</p>
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
}> = ({ state, dispatch }) => (
    <div>
        <h1>Beer List:</h1>

        {state.beerList.length > 0 && (
            <PageSucceed
                hasMore={state.hasMore}
                beerList={state.beerList}
                dispatch={dispatch}
            />
        )}

        {state.loading.cata({
            Loading: () => <PageLoading />,

            Failure: (error: Http.Error) => <PageFailure error={error} dispatch={dispatch} />,

            _: () => null
        })}
    </div>
);
