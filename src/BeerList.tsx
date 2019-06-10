import React from 'react';
import Alert from 'react-bootstrap/Alert';
import Card from 'react-bootstrap/Card';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Button from 'react-bootstrap/Button';
import Spinner from 'react-bootstrap/Spinner';
import LoadingSkeleton from 'react-loading-skeleton';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHeart } from '@fortawesome/free-solid-svg-icons';
import { faHeart as faRegularHeart } from '@fortawesome/free-regular-svg-icons';
import throttle from 'lodash.throttle';
import { RemoteData, NotAsked, Loading, Failure } from 'frctl/dist/src/RemoteData';
import { Maybe, Nothing, Just } from 'frctl/dist/src/Maybe';
import { Either } from 'frctl/dist/src/Either';
import * as Http from 'Http';
import { Cmd } from 'Cmd';
import * as Utils from './Utils';
import * as Router from './Router';
import * as Api from './Api';
import styles from './BeerList.module.css';

export interface State {
    hasMore: boolean;
    beerList: Array<Api.Beer>;
    loading: RemoteData<Http.Error, never>;
}

export type Request = (count: number) => Http.Request<[ boolean, Array<Api.Beer> ]>;

export const init = (request: Request): [ State, Cmd<Action> ] => [
    {
        hasMore: true,
        beerList: [],
        loading: Loading
    },
    request(0).send(LoadDone.cons)
];

export const getBeer = (id: number, state: State): Maybe<Api.Beer> => {
    for (const beer of state.beerList) {
        if (beer.id === id) {
            return Just(beer);
        }
    }

    return Nothing;
};

export const isEmpty = (state: State): boolean => {
    return state.loading.isNotAsked() && state.beerList.length === 0;
};

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
    public constructor(
        private readonly checked: boolean,
        private readonly beerId: number
    ) {
        super();
    }

    public cata<R>(pattern: StagePattern<R>): R {
        return pattern.SetFavorites(this.checked, this.beerId);
    }
}

export abstract class Action extends Utils.Action<[ Request, State ], Stage> {}

class LoadMore extends Action {
    public static inst: Action = new LoadMore();

    public update(request: Request, state: State): Stage {
        if (!state.hasMore || !state.loading.isNotAsked()) {
            return new Update(state, Cmd.none);
        }

        return new Update(
            { ...state, loading: Loading },
            request(state.beerList.length).send(LoadDone.cons)
        );
    }
}

class LoadDone extends Action {
    public static cons(response: Either<Http.Error, [ boolean, Array<Api.Beer> ]>): Action {
        return new LoadDone(response);
    }

    private constructor(
        private readonly response: Either<Http.Error, [ boolean, Array<Api.Beer> ]>
    ) {
        super();
    }

    public update(_request: Request, state: State): Stage {
        return new Update(
            this.response.cata({
                Left: error => ({
                    ...state,
                    loading: Failure(error)
                }),

                Right: ([ hasMore, beerList ]) => ({
                    ...state,
                    hasMore,
                    loading: NotAsked,
                    beerList: state.beerList.concat(beerList)
                })
            }),
            Cmd.none
        );
    }
}

class ToggleFavorite extends Action {
    public constructor(
        private readonly checked: boolean,
        private readonly beerId: number
    ) {
        super();
    }

    public update(): Stage {
        return new SetFavorites(this.checked, this.beerId);
    }
}

const SkeletonBeer: React.FC = () => (
    <Card>
        <Row noGutters>
            <Col sm="4" className={styles.previewSkeletonCol}>
                <LoadingSkeleton height="270px" />
            </Col>
            <Col>
                <Card.Body>
                    <Card.Title className="d-flex justify-content-between">
                        <LoadingSkeleton width="200px" />
                        <LoadingSkeleton width="30px" height="30px" />
                    </Card.Title>

                    <Card.Text>
                        <LoadingSkeleton count={5} />
                    </Card.Text>

                    <small className="text-muted">
                        <LoadingSkeleton width="150px" />
                        <br/>
                        <LoadingSkeleton width="50px" />
                    </small>
                </Card.Body>
            </Col>
        </Row>
    </Card>
);

const SkeletonBeerList: React.FC<{
    count: number;
}> = ({ count }) => (
    <ul className="list-unstyled m-0 pb-2">
        {Array(count).fill(0).map((_el, i: number) => (
            <li key={i} className="pb-2">
                <SkeletonBeer />
            </li>
        ))}
    </ul>
);

const ViewBeer: React.FC<{
    favorite: boolean;
    beer: Api.Beer;
    dispatch(action: Action): void;
}> = ({ favorite, beer, dispatch }) => (
    <Card>
        <Row noGutters>
            {beer.image.cata({
                Nothing: () => null,
                Just: (src: string) => (
                    <Col sm="4" className={`bg-light card-img p-3 ${styles.previewCol}`}>
                        <span
                            className={styles.preview}
                            style={{ backgroundImage: `url(${src})` }}
                        />
                    </Col>
                )
            })}

            <Col>
                <Card.Body>
                    <Card.Title className="d-flex justify-content-between">
                        {beer.name}

                        <Button
                            className="ml-2 align-self-start"
                            variant="light"
                            size="sm"
                            onClick={() => dispatch(new ToggleFavorite(!favorite, beer.id))}
                        >
                            {favorite
                                ? (
                                    <FontAwesomeIcon className="text-danger" icon={faHeart} />
                                )
                                : (
                                    <FontAwesomeIcon icon={faRegularHeart} />
                                )
                            }
                        </Button>
                    </Card.Title>

                    <Card.Text>{beer.description}</Card.Text>

                    <small className="text-muted">
                        First brewed at {beer.firstBrewed.toLocaleDateString()}
                        <br/>
                        <Router.Link to={Router.ToBeer(beer.id)}>See more</Router.Link>
                    </small>
                </Card.Body>
            </Col>
        </Row>
    </Card>
);

const ViewBeerList: React.FC<{
    favorites: Set<number>;
    beerList: Array<Api.Beer>;
    dispatch(action: Action): void;
}> = ({ favorites, beerList, dispatch }) => (
    <ul className="list-unstyled m-0 pb-2">
        {beerList.map((beer: Api.Beer) => (
            <li key={beer.id} className="pb-2">
                <ViewBeer
                    favorite={favorites.has(beer.id)}
                    beer={beer}
                    dispatch={dispatch}
                />
            </li>
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

const ViewLoadMore: React.FC = () => (
    <div className="text-center pt-2 pb-3">
        <Spinner animation="border" variant="warning" />
    </div>
);

const ViewEmpty: React.FC = () => (
    <Alert variant="warning" className="mb-0">
        <Alert.Heading>There is no beer!</Alert.Heading>
        <p className="mb-0">
            For the current filters. Please try to change them.
        </p>
    </Alert>
);

export interface ViewProps {
    scroller: React.RefObject<HTMLElement>;
    favorites: Set<number>;
    skeletonCount: number;
    state: State;
    dispatch(action: Action): void;
}

export class View extends React.Component<ViewProps> {
    protected readonly listener: () => void;

    public constructor(props: ViewProps, context: any) {
        super(props, context);

        this.listener = throttle(() => {
            const el = props.scroller.current;
            const { state, dispatch } = this.props;

            if (state.hasMore && state.loading.isNotAsked()
            && el && el.scrollHeight - el.scrollTop < window.innerHeight * 2
            ) {
                dispatch(LoadMore.inst);
            }
        }, 300);
    }

    public componentDidMount() {
        if (this.props.scroller.current) {
            this.props.scroller.current.addEventListener('scroll', this.listener);
        }
    }

    public componentWillUnmount() {
        if (this.props.scroller.current) {
            this.props.scroller.current.removeEventListener('scroll', this.listener);
        }
    }

    public render() {
        const { favorites, skeletonCount, state, dispatch } = this.props;

        return (
            <div>
                {state.beerList.length > 0 && (
                    <ViewBeerList
                        favorites={favorites}
                        beerList={state.beerList}
                        dispatch={dispatch}
                    />
                )}

                {state.loading.cata({
                    Loading: () => state.beerList.length === 0
                        ? (
                            <SkeletonBeerList count={skeletonCount} />
                        ) : (
                            <ViewLoadMore />
                        ),

                    Failure: (error: Http.Error) => <ViewError error={error} />,

                    _: () => {
                        if (state.hasMore) {
                            return (
                                <ViewLoadMore />
                            );
                        }

                        if (state.beerList.length !== 0) {
                            return null;
                        }

                        return (
                            <ViewEmpty />
                        );
                    }
                })}
            </div>
        );
    }
}
