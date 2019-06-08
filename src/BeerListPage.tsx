import React from 'react';
import Card from 'react-bootstrap/Card';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Spinner from 'react-bootstrap/Spinner';
import throttle from 'lodash.throttle';
import { RemoteData, NotAsked, Loading, Failure } from 'frctl/dist/src/RemoteData';
import { Either } from 'frctl/dist/src/Either';
import * as Http from 'Http';
import { Cmd } from 'Cmd';
import * as Utils from './Utils';
import * as Router from './Router';
import * as Api from './Api';
import styles from './BeerListPage.module.css';

export interface State {
    hasMore: boolean;
    beersPerPage: number;
    beerList: Array<Api.Beer>;
    loading: RemoteData<Http.Error, never>;
}

export const init = (beersPerPage: number, filter: Router.SearchFilter): [ State, Cmd<Action> ] => [
    {
        beersPerPage,
        hasMore: true,
        beerList: [],
        loading: Loading
    },
    Api.loadBeerList(filter, beersPerPage, 1).send(LoadDone.cons)
];

export abstract class Action extends Utils.Action<[ Router.SearchFilter, State ], [ State, Cmd<Action> ]> {}

class LoadMore extends Action {
    public static inst: Action = new LoadMore();

    public update(filter: Router.SearchFilter, state: State): [ State, Cmd<Action> ] {
        if (!state.hasMore || state.loading.isLoading()) {
            return [ state, Cmd.none ];
        }

        return [
            { ...state, loading: Loading },
            Api.loadBeerList(
                filter,
                state.beersPerPage,
                state.beerList.length / state.beersPerPage + 1
            ).send(LoadDone.cons)
        ];
    }
}

class LoadDone extends Action {
    public static cons(response: Either<Http.Error, Array<Api.Beer>>): Action {
        return new LoadDone(response);
    }

    private constructor(
        private readonly response: Either<Http.Error, Array<Api.Beer>>
    ) {
        super();
    }

    public update(_filter: Router.SearchFilter, state: State): [ State, Cmd<Action> ] {
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
                    beerList: state.beerList.concat(beerList)
                })
            }),
            Cmd.none
        ];
    }
}

const ViewBeer: React.FC<{
    beer: Api.Beer;
}> = ({ beer }) => (
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
                    <Card.Title>{beer.name}</Card.Title>
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
    beerList: Array<Api.Beer>;
}> = ({ beerList }) => (
    <ul className="list-unstyled m-0">
        {beerList.map((beer: Api.Beer) => (
            <li key={beer.id} className="mb-2"><ViewBeer beer={beer}/></li>
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

interface ViewProps {
    scroller: React.RefObject<HTMLElement>;
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

            if (state.hasMore && !state.loading.isLoading()
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
        const { state } = this.props;

        return (
            <div>
                {state.beerList.length > 0 && (
                    <ViewBeerList beerList={state.beerList} />
                )}

                {state.loading.cata({
                    Loading: () => <ViewLoadMore />,

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
                            <div>There are no beer for the current filters</div>
                        );
                    }
                })}
            </div>
        );
    }
}
