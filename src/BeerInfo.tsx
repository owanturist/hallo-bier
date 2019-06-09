import React from 'react';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Table from 'react-bootstrap/Table';
import LoadingSkeleton from 'react-loading-skeleton';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faInfoCircle, faUtensils, faQuestionCircle, faLink } from '@fortawesome/free-solid-svg-icons';
import * as Http from 'frctl/dist/src/Http';
import * as Api from './Api';
import * as Router from './Router';
import { Month } from './MonthPicker';
import styles from './BeerInfo.module.css';

export const Skeleton: React.FC = () => (
    <div className="pb-3">
        <h1><LoadingSkeleton width="80%" /></h1>

        <div className="d-flex justify-content-between">
            <LoadingSkeleton width="150px" />

            <blockquote className="text-right">
                <LoadingSkeleton width="120px" />
                <br />
                <LoadingSkeleton width="70px" />
            </blockquote>
        </div>

        <Row>
            <Col sm="4">
                <LoadingSkeleton height="300px" />
            </Col>

            <Col>
                <Table responsive>
                    <tbody>
                        {'0123456'.split('').map(i => (
                            <tr key={i}>
                                <td><LoadingSkeleton width="50" /></td>
                                <td><LoadingSkeleton width="30" /></td>
                            </tr>
                        ))}
                    </tbody>
                </Table>
            </Col>
        </Row>

        <h3>
            <LoadingSkeleton circle width="27px" height="27px" />
            <span className="mr-2" />
            <LoadingSkeleton width="200px" />
        </h3>

        <p><LoadingSkeleton count={4} /></p>

        <h3>
            <LoadingSkeleton circle width="27px" height="27px" />
            <span className="mr-2" />
            <LoadingSkeleton width="150px" />
        </h3>

        <ul>
            <li><LoadingSkeleton width="30%" /></li>
            <li><LoadingSkeleton width="50%" /></li>
            <li><LoadingSkeleton width="50%" /></li>
        </ul>

        <h3>
            <LoadingSkeleton circle width="27px" height="27px" />
            <span className="mr-2" />
            <LoadingSkeleton width="100px" />
        </h3>

        <p className="mb-0"><LoadingSkeleton count={2} /></p>
    </div>
);

export const Error: React.FC<{
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
    random?: boolean;
    beer: Api.Beer;
}> = ({ random, beer }) => (
    <div className="pb-3">
        <h1>
            {random && (
                <Router.Link className="text-secondary mr-2" to={Router.ToBeer(beer.id)}>
                    <small><FontAwesomeIcon icon={faLink} /></small>
                </Router.Link>
            )}
            {beer.name}
        </h1>

        <div className="d-flex justify-content-between">
            <i className="text-muted">
                Brewing since{' '}
                {Month.fromDate(beer.firstBrewed).toLongName()}{' '}
                {beer.firstBrewed.getFullYear()}
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
