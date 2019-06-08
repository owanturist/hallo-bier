import React from 'react';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Table from 'react-bootstrap/Table';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faInfoCircle, faUtensils, faQuestionCircle } from '@fortawesome/free-solid-svg-icons';
import { RemoteData, Loading } from 'frctl/dist/src/RemoteData';
import { Either } from 'frctl/dist/src/Either';
import { Cmd } from 'Cmd';
import * as Http from 'Http';
import * as Utils from './Utils';
import * as Api from './Api';
import styles from './BeerPage.module.css';

export interface State {
    beer: RemoteData<Http.Error, Api.Beer>;
}

export const init = (beerId: number): [ State, Cmd<Action> ] => [
    {
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

const ViewLoading: React.FC = () => (
    <div>Beer is under loading...</div>
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

const ViewBeer: React.FC<{
    beer: Api.Beer;
}> = ({ beer }) => (
    <div className="pb-3">
        <h1>{beer.name}</h1>

        <div className="d-flex justify-content-between">
            <i className="text-muted">
                Brewing since <small>{beer.firstBrewed.toLocaleDateString()}</small>
            </i>

            <blockquote className="text-right">
                {beer.tagline}
                <footer className="blockquote-footer">{beer.contributor}</footer>
            </blockquote>
        </div>


        <Row>
            {beer.image.cata({
                Nothing: () => null,
                Just: (src: string) => (
                    <Col sm="4" className="card-img p-3">
                        <span
                            className={styles.preview}
                            style={{ backgroundImage: `url(${src})` }}
                        />
                    </Col>
                )
            })}

            <Col>
                <Table responsive>
                    <tbody>
                        {beer.abv.cata({
                            Nothing: () => null,
                            Just: abv => (
                                <tr>
                                    <td>ABV</td>
                                    <td>{abv}</td>
                                </tr>
                            )
                        })}

                        {beer.ibu.cata({
                            Nothing: () => null,
                            Just: ibu => (
                                <tr>
                                    <td>IBU</td>
                                    <td>{ibu}</td>
                                </tr>
                            )
                        })}

                        {beer.targetFg.cata({
                            Nothing: () => null,
                            Just: targetFg => (
                                <tr>
                                    <td>arget FG</td>
                                    <td>{targetFg}</td>
                                </tr>
                            )
                        })}

                        {beer.targetOg.cata({
                            Nothing: () => null,
                            Just: targetOg => (
                                <tr>
                                    <td>Target OG</td>
                                    <td>{targetOg}</td>
                                </tr>
                            )
                        })}

                        {beer.ebc.cata({
                            Nothing: () => null,
                            Just: ebc => (
                                <tr>
                                    <td>EBC</td>
                                    <td>{ebc}</td>
                                </tr>
                            )
                        })}

                        {beer.srm.cata({
                            Nothing: () => null,
                            Just: srm => (
                                <tr>
                                    <td>SRM</td>
                                    <td>{srm}</td>
                                </tr>
                            )
                        })}

                        {beer.ph.cata({
                            Nothing: () => null,
                            Just: ph => (
                                <tr>
                                    <td>PH</td>
                                    <td>{ph}</td>
                                </tr>
                            )
                        })}

                        {beer.attenuationLevel.cata({
                            Nothing: () => null,
                            Just: attenuationLevel => (
                                <tr>
                                    <td>Attenuation level</td>
                                    <td>{attenuationLevel}</td>
                                </tr>
                            )
                        })}
                    </tbody>
                </Table>
            </Col>
        </Row>

        <h3>
            <FontAwesomeIcon icon={faInfoCircle} className="mr-2" />
            Description
        </h3>
        <p>{beer.description}</p>

        {beer.foodPairing.length > 0 && (
            <div>
                <h3>
                    <FontAwesomeIcon icon={faUtensils} className="mr-2" />
                    Good with
                </h3>

                <ul>
                    {beer.foodPairing.map(food => (
                        <li key={food}>{food}</li>
                    ))}
                </ul>
            </div>
        )}

        <h3>
            <FontAwesomeIcon icon={faQuestionCircle} className="mr-2" />
            Tips
        </h3>
        <p className="mb-0">{beer.brewersTips}</p>
    </div>
);

export const View: React.FC<{
    state: State;
}> = ({ state }) => state.beer.cata({
    Failure: error => (
        <ViewError error={error} />
    ),

    Succeed: beer => (
        <ViewBeer beer={beer} />
    ),

    _: () => (
        <ViewLoading />
    )
});
