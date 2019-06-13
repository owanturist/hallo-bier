import { Nothing, Just } from 'frctl/dist/Maybe';
import { Either, Left, Right } from 'frctl/dist/Either';
import * as Decode from 'frctl/dist/Json/Decode';
import * as Api from '../src/Api';
import * as ApiFixture from './Api.fixture';
import * as Http from '../src/Http';
import * as LocalStorage from '../src/LocalStorage';
import { __execute__ } from '../src/Cmd';

const identity = <T>(a: T): T => a;

describe('nameToQuery', () => {
    it('empty string', () => {
        expect(Api.nameToQuery('')).toEqual(Nothing);
        expect(Api.nameToQuery('  ')).toEqual(Nothing);
    });

    it('single word', () => {
        expect(Api.nameToQuery('foo')).toEqual(Just('foo'));
        expect(Api.nameToQuery('  foo  ')).toEqual(Just('foo'));
        expect(Api.nameToQuery('foo_bar')).toEqual(Just('foo_bar'));
        expect(Api.nameToQuery('foo!bar')).toEqual(Just('foo!bar'));
    });

    it('replace spaces to underscores', () => {
        expect(Api.nameToQuery('foo bar')).toEqual(Just('foo_bar'));
        expect(Api.nameToQuery('foo  bar')).toEqual(Just('foo_bar'));
    });
});

it('dateToQuery', () => {
    expect(Api.dateToQuery(new Date(2017, 1))).toBe('2_2017');
});

describe('loadBeerList', () => {
    const dispatch = jest.fn<void, [ Either<Http.Error, Api.Page<Api.Beer>> ]>();

    afterEach(() => {
        dispatch.mockClear();
    });

    it('fails with server error', () => {
        Http.Scope.cons(Api.PUNK_ENDPOINT)
            .get('/beers')
            .reply(500, 'custom error');

        __execute__(
            Api.loadBeerList({
                searchFilter: { name: Nothing, brewedAfter: Nothing },
                perPage: 10,
                page: 1
            }).send(identity),
            dispatch
        );

        expect(dispatch).toBeCalledTimes(1);
        expect(dispatch).toBeCalledWith(
            Left(Http.Error.BadStatus({
                url: `${Api.PUNK_ENDPOINT}/beers`,
                statusCode: 500,
                statusText: 'unknown',
                headers: {},
                body: 'custom error'
            }))
        );
    });

    it('fails with client error', () => {
        Http.Scope.cons(Api.PUNK_ENDPOINT)
            .get('/beers')
            .reply(200, [ null ]);

        __execute__(
            Api.loadBeerList({
                searchFilter: { name: Nothing, brewedAfter: Nothing },
                perPage: 10,
                page: 1
            }).send(identity),
            dispatch
        );

        expect(dispatch).toBeCalledTimes(1);
        expect(dispatch).toBeCalledWith(
            Left(Http.Error.BadBody(
                Decode.Error.Index(
                    0,
                    Decode.Error.Failure('Expecting an OBJECT with a field named \'id\'', null)
                ),
                {
                    url: `${Api.PUNK_ENDPOINT}/beers`,
                    statusCode: 200,
                    statusText: 'unknown',
                    headers: {},
                    body: JSON.stringify([ null ])
                }
            ))
        );
    });

    it('loads empty list', () => {
        Http.Scope.cons(Api.PUNK_ENDPOINT)
            .get('/beers')
            .reply(200, []);

        __execute__(
            Api.loadBeerList({
                searchFilter: { name: Nothing, brewedAfter: Nothing },
                perPage: 10,
                page: 1
            }).send(identity),
            dispatch
        );

        expect(dispatch).toBeCalledTimes(1);
        expect(dispatch).toBeCalledWith(
            Right({
                hasMore: false,
                beers: []
            })
        );
    });

    it('loads not empty list', () => {
        Http.Scope.cons(Api.PUNK_ENDPOINT)
            .get('/beers')
            .reply(200, [
                ApiFixture.getFixtureByIndex(0),
                ApiFixture.getFixtureByIndex(1),
                ApiFixture.getFixtureByIndex(2)
            ]);

        __execute__(
            Api.loadBeerList({
                searchFilter: { name: Nothing, brewedAfter: Nothing },
                perPage: 10,
                page: 1
            }).send(identity),
            dispatch
        );

        expect(dispatch).toBeCalledTimes(1);
        expect(dispatch).toBeCalledWith(
            Right({
                hasMore: false,
                beers: [
                    ApiFixture.list[ 0 ],
                    ApiFixture.list[ 1 ],
                    ApiFixture.list[ 2 ]
                ]
            })
        );
    });

    describe('calculate hasMore', () => {
        it('false when response lenght is less then perPage amount', () => {
            Http.Scope.cons(Api.PUNK_ENDPOINT)
                .get('/beers')
                .reply(200, [
                    ApiFixture.getFixtureByIndex(0),
                    ApiFixture.getFixtureByIndex(1)
                ]);

            __execute__(
                Api.loadBeerList({
                    searchFilter: { name: Nothing, brewedAfter: Nothing },
                    perPage: 3,
                    page: 1
                }).send(identity),
                dispatch
            );

            expect(dispatch).toBeCalledTimes(1);
            expect(dispatch).toBeCalledWith(
                Right({
                    hasMore: false,
                    beers: [
                        ApiFixture.list[ 0 ],
                        ApiFixture.list[ 1 ]
                    ]
                })
            );
        });

        it('true when response lenght is equal to perPage amount', () => {
            Http.Scope.cons(Api.PUNK_ENDPOINT)
                .get('/beers')
                .reply(200, [
                    ApiFixture.getFixtureByIndex(0),
                    ApiFixture.getFixtureByIndex(1),
                    ApiFixture.getFixtureByIndex(2)
                ]);

            __execute__(
                Api.loadBeerList({
                    searchFilter: { name: Nothing, brewedAfter: Nothing },
                    perPage: 3,
                    page: 1
                }).send(identity),
                dispatch
            );

            expect(dispatch).toBeCalledTimes(1);
            expect(dispatch).toBeCalledWith(
                Right({
                    hasMore: true,
                    beers: [
                        ApiFixture.list[ 0 ],
                        ApiFixture.list[ 1 ],
                        ApiFixture.list[ 2 ]
                    ]
                })
            );
        });

        it('true when response lenght is more then perPage amount', () => {
            Http.Scope.cons(Api.PUNK_ENDPOINT)
                .get('/beers')
                .reply(200, [
                    ApiFixture.getFixtureByIndex(0),
                    ApiFixture.getFixtureByIndex(1),
                    ApiFixture.getFixtureByIndex(2),
                    ApiFixture.getFixtureByIndex(3)
                ]);

            __execute__(
                Api.loadBeerList({
                    searchFilter: { name: Nothing, brewedAfter: Nothing },
                    perPage: 3,
                    page: 1
                }).send(identity),
                dispatch
            );

            expect(dispatch).toBeCalledTimes(1);
            expect(dispatch).toBeCalledWith(
                Right({
                    hasMore: true,
                    beers: [
                        ApiFixture.list[ 0 ],
                        ApiFixture.list[ 1 ],
                        ApiFixture.list[ 2 ],
                        ApiFixture.list[ 3 ]
                    ]
                })
            );
        });
    });

    it('passes page and per_page queries', () => {
        Http.Scope.cons(Api.PUNK_ENDPOINT)
            .get('/beers')
            .withQueryParam('page', '999')
            .withQueryParam('per_page', '100')
            .reply(200, []);

        __execute__(
            Api.loadBeerList({
                searchFilter: { name: Nothing, brewedAfter: Nothing },
                perPage: 100,
                page: 999
            }).send(identity),
            dispatch
        );

        expect(dispatch).toBeCalledTimes(1);
        expect(dispatch).toBeCalledWith(
            Right({
                hasMore: false,
                beers: []
            })
        );
    });

    it('passes beer_name query', () => {
        Http.Scope.cons(Api.PUNK_ENDPOINT)
            .get('/beers')
            .withQueryParam('beer_name', 'name')
            .reply(200, []);

        __execute__(
            Api.loadBeerList({
                searchFilter: { name: Just('name'), brewedAfter: Nothing },
                perPage: 10,
                page: 1
            }).send(identity),
            dispatch
        );

        expect(dispatch).toBeCalledTimes(1);
        expect(dispatch).toBeCalledWith(
            Right({
                hasMore: false,
                beers: []
            })
        );
    });

    it('passes brewed_after query', () => {
        Http.Scope.cons(Api.PUNK_ENDPOINT)
            .get('/beers')
            .withQueryParam('brewed_after', '5_2010')
            .reply(200, []);

        __execute__(
            Api.loadBeerList({
                searchFilter: { name: Nothing, brewedAfter: Just(new Date(2010, 4)) },
                perPage: 10,
                page: 1
            }).send(identity),
            dispatch
        );

        expect(dispatch).toBeCalledTimes(1);
        expect(dispatch).toBeCalledWith(
            Right({
                hasMore: false,
                beers: []
            })
        );
    });
});

describe('loadBeerListByIds', () => {
    const dispatch = jest.fn<void, [ Either<Http.Error, Api.Page<Api.Beer>> ]>();

    afterEach(() => {
        dispatch.mockClear();
    });

    it('passes ids query', () => {
        Http.Scope.cons(Api.PUNK_ENDPOINT)
            .get('/beers')
            .withQueryParam('ids', '0|1|3')
            .reply(200, []);

        __execute__(
            Api.loadBeerListByIds({
                ids: [ 0, 1, 3 ],
                searchFilter: { name: Nothing, brewedAfter: Nothing },
                perPage: 10,
                page: 1
            }).send(identity),
            dispatch
        );

        expect(dispatch).toBeCalledTimes(1);
        expect(dispatch).toBeCalledWith(
            Right({
                hasMore: false,
                beers: []
            })
        );
    });
});

describe('loadBeerById', () => {
    const dispatch = jest.fn<void, [ Either<Http.Error, Api.Beer> ]>();

    afterEach(() => {
        dispatch.mockClear();
    });

    it('fails with server error', () => {
        Http.Scope.cons(Api.PUNK_ENDPOINT)
            .get('/beers/1')
            .reply(500, 'custom error');

        __execute__(
            Api.loadBeerById(1).send(identity),
            dispatch
        );

        expect(dispatch).toBeCalledTimes(1);
        expect(dispatch).toBeCalledWith(
            Left(Http.Error.BadStatus({
                url: `${Api.PUNK_ENDPOINT}/beers/1`,
                statusCode: 500,
                statusText: 'unknown',
                headers: {},
                body: 'custom error'
            }))
        );
    });

    it('fails with client error', () => {
        Http.Scope.cons(Api.PUNK_ENDPOINT)
            .get('/beers/1')
            .reply(200, [ { id: 'not_int' } ]);

        __execute__(
            Api.loadBeerById(1).send(identity),
            dispatch
        );

        expect(dispatch).toBeCalledTimes(1);
        expect(dispatch).toBeCalledWith(
            Left(Http.Error.BadBody(
                Decode.Error.Index(
                    0,
                    Decode.Error.Field(
                        'id',
                        Decode.Error.Failure('Expecting a NUMBER', 'not_int')
                    )
                ),
                {
                    url: `${Api.PUNK_ENDPOINT}/beers/1`,
                    statusCode: 200,
                    statusText: 'unknown',
                    headers: {},
                    body: JSON.stringify([ { id: 'not_int' } ])
                }
            ))
        );
    });

    it('loads a beer', () => {
        Http.Scope.cons(Api.PUNK_ENDPOINT)
            .get('/beers/1')
            .reply(200, [ ApiFixture.getFixtureByIndex(0) ]);

        __execute__(
            Api.loadBeerById(1).send(identity),
            dispatch
        );

        expect(dispatch).toBeCalledTimes(1);
        expect(dispatch).toBeCalledWith(
            Right(ApiFixture.list[ 0 ])
        );
    });
});

describe('loadRandomBeer', () => {
    const dispatch = jest.fn<void, [ Either<Http.Error, Api.Beer> ]>();

    afterEach(() => {
        dispatch.mockClear();
    });

    it('fails with server error', () => {
        Http.Scope.cons(Api.PUNK_ENDPOINT)
            .get('/beers/random')
            .reply(500, 'custom error');

        __execute__(
            Api.loadRandomBeer().send(identity),
            dispatch
        );

        expect(dispatch).toBeCalledTimes(1);
        expect(dispatch).toBeCalledWith(
            Left(Http.Error.BadStatus({
                url: `${Api.PUNK_ENDPOINT}/beers/random`,
                statusCode: 500,
                statusText: 'unknown',
                headers: {},
                body: 'custom error'
            }))
        );
    });

    it('fails with client error', () => {
        Http.Scope.cons(Api.PUNK_ENDPOINT)
            .get('/beers/random')
            .reply(200, [ { id: 'not_int' } ]);

        __execute__(
            Api.loadRandomBeer().send(identity),
            dispatch
        );

        expect(dispatch).toBeCalledTimes(1);
        expect(dispatch).toBeCalledWith(
            Left(Http.Error.BadBody(
                Decode.Error.Index(
                    0,
                    Decode.Error.Field(
                        'id',
                        Decode.Error.Failure('Expecting a NUMBER', 'not_int')
                    )
                ),
                {
                    url: `${Api.PUNK_ENDPOINT}/beers/random`,
                    statusCode: 200,
                    statusText: 'unknown',
                    headers: {},
                    body: JSON.stringify([ { id: 'not_int' } ])
                }
            ))
        );
    });

    it('loads a beer', () => {
        Http.Scope.cons(Api.PUNK_ENDPOINT)
            .get('/beers/random')
            .reply(200, [ ApiFixture.getFixtureByIndex(0) ]);

        __execute__(
            Api.loadRandomBeer().send(identity),
            dispatch
        );

        expect(dispatch).toBeCalledTimes(1);
        expect(dispatch).toBeCalledWith(
            Right(ApiFixture.list[ 0 ])
        );
    });
});

describe('getListOfFavorites', () => {
    const dispatch = jest.fn<void, [ Array<number> ]>();

    afterEach(() => {
        dispatch.mockClear();
    });

    it('favorites does not exist in LocalStorage', () => {
        LocalStorage.Scope.cons()
            .getItem('favorites');

        __execute__(
            Api.getListOfFavorites(),
            dispatch
        );

        expect(dispatch).toBeCalledTimes(1);
        expect(dispatch).toBeCalledWith([]);
    });

    it('empty favorites exists in LocalStorage', () => {
        LocalStorage.Scope.cons()
            .getItem('favorites', JSON.stringify([]));

        __execute__(
            Api.getListOfFavorites(),
            dispatch
        );

        expect(dispatch).toBeCalledTimes(1);
        expect(dispatch).toBeCalledWith([]);
    });

    it('wrong favorites exists in LocalStorage', () => {
        LocalStorage.Scope.cons()
            .getItem('favorites', JSON.stringify([ false ]));

        __execute__(
            Api.getListOfFavorites(),
            dispatch
        );

        expect(dispatch).toBeCalledTimes(1);
        expect(dispatch).toBeCalledWith([]);
    });

    it('favorites exists in LocalStorage', () => {
        LocalStorage.Scope.cons()
            .getItem('favorites', JSON.stringify([ 1, 2, 4, 3 ]));

        __execute__(
            Api.getListOfFavorites(),
            dispatch
        );

        expect(dispatch).toBeCalledTimes(1);
        expect(dispatch).toBeCalledWith([ 1, 2, 4, 3 ]);
    });
});

describe('setListOfFavorites', () => {
    const dispatch = jest.fn<void, [ never ]>();

    afterEach(() => {
        dispatch.mockClear();
    });

    it('sets favorites', () => {
        LocalStorage.Scope.cons()
            .setItem('favorites', JSON.stringify([ 4, 1, 2, 9 ]));

        __execute__(
            Api.setListOfFavorites([ 4, 1, 2, 9 ]),
            dispatch
        );

        expect(dispatch).not.toBeCalled();
    });
});
