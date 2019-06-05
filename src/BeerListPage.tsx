import React from 'react';
import { Link } from 'react-router-dom';
import throttle from 'lodash.throttle';
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
            if (!state.hasMore || state.loading.isLoading()) {
                return [ state, Cmd.none ];
            }

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

const BeerListView: React.FC<{
    beerList: Array<Beer>;
}> = ({ beerList }) => (
    <ul>
        {beerList.map((beer: Beer) => (
            <li key={beer.id}><BeerView beer={beer}/></li>
        ))}
    </ul>
);

const ErrorView: React.FC<{
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

const LoadMoreView: React.FC<{
    busy?: boolean;
    dispatch(action: Action): void;
}> = ({ busy, dispatch }) => (
    <div>
        <button
            type="button"
            disabled={busy}
            onClick={() => dispatch(LoadMore)}
        >Load More Beer!</button>
    </div>
);

export class View extends React.Component<{
    state: State;
    dispatch(action: Action): void;
}> {
    private listener?: () => void;

    public componentDidMount() {
        this.listener = throttle(() => {
            const el = document.scrollingElement;
            const { state, dispatch } = this.props;

            if (state.hasMore && !state.loading.isLoading()
            && el && el.scrollHeight - el.scrollTop < window.innerHeight * 2
            ) {
                dispatch(LoadMore);
            }
        }, 300);

        window.addEventListener('scroll', this.listener);
    }

    public componentWillUnmount() {
        if (typeof this.listener === 'function') {
            window.removeEventListener('scroll', this.listener);
        }
    }

    public render() {
        const { state, dispatch } = this.props;

        return (
            <div>
                <h1>Beer List:</h1>

                {state.beerList.length > 0 && (
                    <BeerListView beerList={state.beerList} />
                )}

                {state.loading.cata({
                    Loading: () => <LoadMoreView busy dispatch={dispatch} />,

                    Failure: (error: Http.Error) => <ErrorView error={error} dispatch={dispatch} />,

                    _: () => {
                        if (state.hasMore) {
                            return (
                                <LoadMoreView dispatch={dispatch} />
                            );
                        }

                        if (state.beerList.length !== 0) {
                            return null;
                        }

                        return (
                            <div>There are no beer for the current filters</div>
                        );
                    }
                })}
            </div>
        );
    }
}
