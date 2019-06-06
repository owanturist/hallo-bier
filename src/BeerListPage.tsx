import React from 'react';
import throttle from 'lodash.throttle';
import {
    RemoteData,
    NotAsked,
    Loading,
    Failure
} from 'frctl/dist/src/RemoteData';
import { Either } from 'frctl/dist/src/Either';
import { Maybe, Nothing, Just } from 'frctl/dist/src/Maybe';
import * as Http from 'Http';
import { Cmd } from 'Cmd';
import * as Utils from './Utils';
import * as Router from './Router';
import * as Api from './Api';
import * as SearchBuilder from './SearchBuilder';
import { Month } from './MonthPicker';

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
    Api.loadBeerList(filtering, beersPerPage, 1).send(response => new LoadDone(response))
];

export abstract class Action extends Utils.Action<[ State ], [ State, Cmd<Action> ]> {}

class LoadMore extends Action {
    public update(state: State): [ State, Cmd<Action> ] {
        if (!state.hasMore || state.loading.isLoading()) {
            return [ state, Cmd.none ];
        }

        return [
            { ...state, loading: Loading },
            Api.loadBeerList(
                state.filtering,
                state.beersPerPage,
                state.beerList.length / state.beersPerPage + 1
            ).send(response => new LoadDone(response))
        ];
    }
}

class LoadDone extends Action {
    public constructor(
        private readonly response: Either<Http.Error, Array<Api.Beer>>
    ) {
        super();
    }

    public update(state: State): [ State, Cmd<Action> ] {
        return [
            this.response.cata({
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
}

class ActionSearchBuilder extends Action {
    public constructor(private readonly action: SearchBuilder.Action) {
        super();
    }

    public update(state: State): [ State, Cmd<Action> ] {
        return state.searchBuilder.cata({
            Nothing: (): [ State, Cmd<Action> ] => [ state, Cmd.none ],

            Just: searchBuilder => this.action.update(searchBuilder).cata({
                Update: (nextSearchBuilder): [ State, Cmd<Action> ] => [
                    { ...state, searchBuilder: Just(nextSearchBuilder) },
                    Cmd.none
                ],

                Search: (search): [ State, Cmd<Action> ] => [
                    state,
                    Router.ToBeerSearch(search.name, search.brewedAfter).push()
                ]
            })
        });
    }
}

const ViewBeer: React.FC<{
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
        <Router.Link to={Router.ToBeer(beer.id)}>See more</Router.Link>
    </div>
);

const ViewBeerList: React.FC<{
    beerList: Array<Api.Beer>;
}> = ({ beerList }) => (
    <ul>
        {beerList.map((beer: Api.Beer) => (
            <li key={beer.id}><ViewBeer beer={beer}/></li>
        ))}
    </ul>
);

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

const ViewLoadMore: React.FC<{
    busy?: boolean;
    dispatch(action: Action): void;
}> = ({ busy, dispatch }) => (
    <div>
        <button
            type="button"
            disabled={busy}
            onClick={() => dispatch(new LoadMore())}
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
                dispatch(new LoadMore());
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
                    <ViewBeerList beerList={state.beerList} />
                )}

                {state.loading.cata({
                    Loading: () => <ViewLoadMore busy dispatch={dispatch} />,

                    Failure: (error: Http.Error) => <ViewError error={error} />,

                    _: () => {
                        if (state.hasMore) {
                            return (
                                <ViewLoadMore dispatch={dispatch} />
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
                            dispatch={action => dispatch(new ActionSearchBuilder(action))}
                        />
                    )
                })}
            </div>
        );
    }
}
