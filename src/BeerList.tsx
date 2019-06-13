import React from 'react';
import Jumbotron from 'react-bootstrap/Jumbotron';
import Container from 'react-bootstrap/Container';
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
import { RemoteData, NotAsked, Loading, Failure } from 'frctl/dist/RemoteData';
import { Maybe, Nothing, Just } from 'frctl/dist/Maybe';
import { Either } from 'frctl/dist/Either';
import * as Http from 'Http';
import Cmd from 'Cmd';
import * as Utils from './Utils';
import * as Router from './Router';
import * as Api from './Api';
import { Month } from './MonthPicker';
import styles from './BeerList.module.css';

export interface State {
    hasMore: boolean;
    beerList: Array<Api.Beer>;
    loading: RemoteData<Http.Error, never>;
}

export type Request = (count: number) => Http.Request<Api.Page<Api.Beer>>;

export const init = (request: Request): [ State, Cmd<Action> ] => [
    {
        hasMore: true,
        beerList: [],
        loading: Loading
    },
    request(0).send(LoadDone)
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

export interface Stage {
    cata<R>(patern: StagePattern<R>): R;
}

export const Update = Utils.cons(class implements Stage {
    public constructor(
        private readonly state: State,
        private readonly cmd: Cmd<Action>
    ) {}

    public cata<R>(pattern: StagePattern<R>): R {
        return pattern.Update(this.state, this.cmd);
    }
});

export const SetFavorites = Utils.cons(class implements Stage {
    public constructor(
        private readonly checked: boolean,
        private readonly beerId: number
    ) {}

    public cata<R>(pattern: StagePattern<R>): R {
        return pattern.SetFavorites(this.checked, this.beerId);
    }
});

export interface Action extends Utils.Action<[ Request, State ], Stage> {}

export const LoadMore = Utils.inst(class implements Action {
    public update(request: Request, state: State): Stage {
        if (!state.hasMore || !state.loading.isNotAsked()) {
            return Update(state, Cmd.none);
        }

        return Update(
            { ...state, loading: Loading },
            request(state.beerList.length).send(LoadDone)
        );
    }
});

export const LoadDone = Utils.cons(class implements Action {
    public constructor(
        private readonly response: Either<Http.Error, Api.Page<Api.Beer>>
    ) {}

    public update(_request: Request, state: State): Stage {
        return Update(
            this.response.cata({
                Left: error => ({
                    ...state,
                    loading: Failure(error)
                }),

                Right: page => ({
                    ...state,
                    hasMore: page.hasMore,
                    loading: NotAsked,
                    beerList: state.beerList.concat(page.beers)
                })
            }),
            Cmd.none
        );
    }
});

export const ToggleFavorite = Utils.cons(class implements Action {
    public constructor(
        private readonly checked: boolean,
        private readonly beerId: number
    ) {}

    public update(_request: Request, _state: State): Stage {
        return SetFavorites(this.checked, this.beerId);
    }
});

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

export const SkeletonBeerList: React.FC<{
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

export const ViewBeer: React.FC<{
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
                            onClick={() => dispatch(ToggleFavorite(!favorite, beer.id))}
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
                        First brewed at{' '}
                        {Month.fromDate(beer.firstBrewed).toLongName()}{' '}
                        {beer.firstBrewed.getFullYear()}
                        <br/>
                        <Router.Link to={Router.ToBeer(beer.id)}>See more</Router.Link>
                    </small>
                </Card.Body>
            </Col>
        </Row>
    </Card>
);

export const ViewBeerList: React.FC<{
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

export const ViewError: React.FC<{
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

export const ViewLoadMore: React.FC = () => (
    <div className="text-center pt-2 pb-3">
        <Spinner animation="border" variant="warning" />
    </div>
);

export const ViewEmpty: React.FC = () => (
    <Jumbotron fluid className="mb-0">
        <Container fluid>
            <h1>There is no beer!</h1>
            <p>For the current filters. Try to weak them a little bit.</p>
            <p>
                Or test your luck with{' '}
                <Router.Link to={Router.ToRandomBeer}>random beer</Router.Link>{' '}
                or just{' '}
                <Router.Link to={Router.ToBeerSearch({ name: Nothing, brewedAfter: Nothing })}>
                    explore all we have
                </Router.Link>
                !
            </p>
        </Container>
    </Jumbotron>
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
                dispatch(LoadMore);
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
