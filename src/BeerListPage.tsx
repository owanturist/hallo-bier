import React from 'react';
import { Link } from 'react-router-dom';
import throttle from 'lodash.throttle';
import { compose } from 'redux';
import {
    RemoteData,
    NotAsked,
    Loading,
    Failure
} from 'frctl/dist/src/RemoteData';
import { Either } from 'frctl/dist/src/Either';
import { Maybe, Nothing, Just } from 'frctl/dist/src/Maybe';
import * as Decode from 'frctl/dist/src/Json/Decode';
import * as Http from 'Http';
import { Cmd } from 'Cmd';
import * as Router from './Router';
import * as Api from './Api';
import * as SearchBuilder from './SearchBuilder';
import { Month } from './MonthPicker';

export type Action
    = Readonly<{ type: 'RELOAD' }>
    | Readonly<{ type: 'LOAD_MORE' }>
    | Readonly<{ type: 'LOAD_DONE'; response: Either<Http.Error, Array<Api.Beer>> }>
    | Readonly<{ type: 'ACTION_SEARCH_BUILDER'; action: SearchBuilder.Action }>
    ;

const Reload: Action = { type: 'RELOAD' };
const LoadMore: Action = { type: 'LOAD_MORE' };
const LoadDone = (response: Either<Http.Error, Array<Api.Beer>>): Action => ({ type: 'LOAD_DONE', response });
const ActionSearchBuilder = (action: SearchBuilder.Action): Action => ({ type: 'ACTION_SEARCH_BUILDER', action });

export type State = Readonly<{
    hasMore: boolean;
    beersPerPage: number;
    filtering: Api.LoadFilter;
    beerList: Array<Api.Beer>;
    loading: RemoteData<Http.Error, never>;
    searchBuilder: Maybe<SearchBuilder.State>;
}>;

export const init = (beersPerPage: number, filtering: Api.LoadFilter): [ State, Cmd<Action> ] => [
    {
        beersPerPage,
        filtering,
        hasMore: true,
        beerList: [],
        loading: Loading,
        searchBuilder: Nothing
    },
    Api.loadBeerList(filtering, beersPerPage, 1).send(LoadDone)
];

export const update = (action: Action, state: State): [ State, Cmd<Action> ] => {
    switch (action.type) {
        case 'RELOAD': {
            return [
                { ...state, loading: Loading },
                Api.loadBeerList(
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
                { ...state, loading: Loading },
                Api.loadBeerList(
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

                    Right: (beerList: Array<Api.Beer>): State => ({
                        ...state,
                        hasMore: beerList.length === state.beersPerPage,
                        loading: NotAsked,
                        beerList: state.beerList.concat(beerList),
                        searchBuilder: beerList.length === 0 && state.beerList.length === 0
                            ? Just(SearchBuilder.init(
                                state.filtering.name.getOrElse(''),
                                state.filtering.brewedAfter.map(date => ({
                                    month: Month.fromDate(date),
                                    year: date.getFullYear()
                                }))
                            ))
                            : Nothing
                    })
                }),
                Cmd.none
            ];
        }

        case 'ACTION_SEARCH_BUILDER': {
            return state.searchBuilder.cata({
                Nothing: (): [ State, Cmd<Action> ] => [ state, Cmd.none ],

                Just: searchBuilder => action.action.update(searchBuilder).cata({
                    Update: (nextSearchBuilder): [ State, Cmd<Action> ] => [
                        { ...state, searchBuilder: Just(nextSearchBuilder) },
                        Cmd.none
                    ],

                    Search: (search): [ State, Cmd<Action> ] => [
                        state,
                        Router.push(Router.ToBeerSearch(search.name, search.brewedAfter))
                    ]
                })
            });
        }
    }
};

const BeerView: React.FC<{
    beer: Api.Beer;
}> = ({ beer }) => (
    <div>
        {beer.image.cata({
            Nothing: () => null,
            Just: (src: string) => (
                <img src={src} alt={beer.name} />
            )
        })}
        <h3>{beer.name}</h3>
        <small>{beer.tagline}</small>
        <p>{beer.description}</p>
        <Link to={`/beer/${beer.id}`}>See more</Link>
    </div>
);

const BeerListView: React.FC<{
    beerList: Array<Api.Beer>;
}> = ({ beerList }) => (
    <ul>
        {beerList.map((beer: Api.Beer) => (
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

                {state.searchBuilder.cata({
                    Nothing: () => null,
                    Just: searchBuilder => (
                        <SearchBuilder.View
                            disabled={state.loading.isLoading()}
                            state={searchBuilder}
                            dispatch={compose(dispatch, ActionSearchBuilder)}
                        />
                    )
                })}
            </div>
        );
    }
}
