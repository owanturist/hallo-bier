// import React from 'react';
import {} from 'react-bootstrap';
import Enzyme from 'enzyme';
import Adapter from 'enzyme-adapter-react-16';
import { NotAsked, Loading, Failure } from 'frctl/dist/RemoteData';
import { Nothing, Just } from 'frctl/dist/Maybe';
import { Left, Right } from 'frctl/dist/Either';
import * as Api from './Api';
import * as ApiFixture from './Api.fixture';
import * as BeerList from './BeerList';
import * as Http from 'Http';
import Cmd, { __execute__ } from 'Cmd';

Enzyme.configure({
    adapter: new Adapter()
});

const PUNK_ENDPOINT = 'https://api.punkapi.com/v2';

describe('State', () => {
    const dispatch = jest.fn<void, [ BeerList.Action ]>();

    afterEach(() => {
        dispatch.mockClear();
    });

    it('init', () => {
        const request = jest.fn((_count: number ) => Api.loadBeerList({
            searchFilter: { name: Nothing, brewedAfter: Nothing },
            perPage: 10,
            page: 1
        }));

        const [ initialState, initialCmd ] = BeerList.init(request);

        expect(initialState).toEqual({
            hasMore: true,
            beerList: [],
            loading: Loading
        });

        expect(request).toBeCalledTimes(1);
        expect(request).toBeCalledWith(0);

        Http.Scope.cons(PUNK_ENDPOINT)
            .get('/beers')
            .withQueryParam('page', '1')
            .withQueryParam('per_page', '10')
            .reply(200, [ ApiFixture.getFixtureByIndex(0) ]);

        __execute__(initialCmd, dispatch);

        expect(dispatch).toBeCalledTimes(1);
        expect(dispatch).toBeCalledWith(
            BeerList.LoadDone(Right({
                hasMore: false,
                beers: [ ApiFixture.list[ 0 ] ]
            }))
        );
    });

    describe('getBeer', () => {
        it('requested beer does not exist', () => {
            expect(
                BeerList.getBeer(2, {
                    hasMore: false,
                    beerList: [ ApiFixture.beer1 ],
                    loading: NotAsked
                })
            ).toEqual(Nothing);
        });

        it('requested beer exists', () => {
            expect(
                BeerList.getBeer(2, {
                    hasMore: false,
                    beerList: [ ApiFixture.beer1, ApiFixture.beer2 ],
                    loading: NotAsked
                })
            ).toEqual(Just(ApiFixture.beer2));
        });
    });

    it('isEmpty', () => {
        expect(BeerList.isEmpty({
            hasMore: false,
            beerList: [],
            loading: Loading
        })).toBe(false);

        expect(BeerList.isEmpty({
            hasMore: false,
            beerList: [ ApiFixture.beer1 ],
            loading: NotAsked
        })).toBe(false);

        expect(BeerList.isEmpty({
            hasMore: false,
            beerList: [ ApiFixture.beer1 ],
            loading: Loading
        })).toBe(false);

        expect(BeerList.isEmpty({
            hasMore: false,
            beerList: [],
            loading: NotAsked
        })).toBe(true);
    });
});

describe('Stage', () => {
    const pattern: jest.Mocked<BeerList.StagePattern<string>> = {
        Update: jest.fn((_state: BeerList.State, _cmd: Cmd<BeerList.Action>) => 'Update'),
        SetFavorites: jest.fn((_checked: boolean, _beerId: number) => 'SetFavorites')
    };

    afterEach(() => {
        pattern.Update.mockClear();
        pattern.SetFavorites.mockClear();
    });

    it('Update', () => {
        const state = {
            hasMore: false,
            beerList: [],
            loading: Loading
        };
        const cmd = Cmd.batch([ Cmd.none, Cmd.none ]);

        expect(BeerList.Update(state, cmd).cata(pattern)).toBe('Update');

        expect(pattern.Update).toBeCalledTimes(1);
        expect(pattern.Update).toBeCalledWith(state, cmd);
        expect(pattern.SetFavorites).not.toBeCalled();
    });

    it('SetFavorites', () => {
        expect(BeerList.SetFavorites(false, 20).cata(pattern)).toBe('SetFavorites');

        expect(pattern.Update).not.toBeCalled();
        expect(pattern.SetFavorites).toBeCalledTimes(1);
        expect(pattern.SetFavorites).toBeCalledWith(false, 20);
    });
});

describe('Action', () => {
    const send = jest.fn<Cmd<BeerList.Action>, [ BeerList.Action ]>(
        () => Cmd.none
    );
    const request = jest.fn<Http.Request<Api.Page<Api.Beer>>, [ number ]>(
        () => ({ send }) as any
    );

    afterEach(() => {
        send.mockClear();
        request.mockClear();
    });

    describe('LoadMore', () => {
        it('does not call load more when there is no more beer', () => {
            const state = {
                hasMore: false,
                beerList: [],
                loading: NotAsked
            };

            expect(
                BeerList.LoadMore.update(request, state)
            ).toEqual(
                BeerList.Update(state, Cmd.none)
            );

            expect(request).not.toBeCalled();
        });

        it('does not call load more when it is already loading', () => {
            const state = {
                hasMore: true,
                beerList: [],
                loading: Loading
            };

            expect(
                BeerList.LoadMore.update(request, state)
            ).toEqual(
                BeerList.Update(state, Cmd.none)
            );

            expect(request).not.toBeCalled();
        });

        it('does not call load more when error was occupied', () => {
            const state = {
                hasMore: true,
                beerList: [],
                loading: Failure(Http.Error.Timeout)
            };

            expect(
                BeerList.LoadMore.update(request, state)
            ).toEqual(
                BeerList.Update(state, Cmd.none)
            );

            expect(request).not.toBeCalled();
        });

        it('calls to load more', () => {
            expect(
                BeerList.LoadMore.update(request, {
                    hasMore: true,
                    beerList: [ ApiFixture.beer1, ApiFixture.beer2 ],
                    loading: NotAsked
                })
            ).toEqual(
                BeerList.Update({
                    hasMore: true,
                    beerList: [ ApiFixture.beer1, ApiFixture.beer2 ],
                    loading: Loading
                }, Cmd.none)
            );

            expect(request).toBeCalledTimes(1);
            expect(request).toBeCalledWith(2);
            expect(send).toBeCalledTimes(1);
            expect(send).toBeCalledWith(BeerList.LoadDone);
        });
    });

    describe('LoadDone', () => {
        it('sets error when request failed', () => {
            expect(
                BeerList.LoadDone(Left(Http.Error.Timeout)).update(
                    request,
                    {
                        hasMore: true,
                        beerList: [ ApiFixture.beer1, ApiFixture.beer3 ],
                        loading: Loading
                    }
                )
            ).toEqual(BeerList.Update({
                hasMore: true,
                beerList: [ ApiFixture.beer1, ApiFixture.beer3 ],
                loading: Failure(Http.Error.Timeout)
            }, Cmd.none));
        });

        it('apply response', () => {
            expect(
                BeerList.LoadDone(Right({
                    hasMore: false,
                    beers: [ ApiFixture.beer169 ]
                })).update(
                    request,
                    {
                        hasMore: true,
                        beerList: [ ApiFixture.beer1, ApiFixture.beer3 ],
                        loading: Loading
                    }
                )
            ).toEqual(BeerList.Update({
                hasMore: false,
                beerList: [ ApiFixture.beer1, ApiFixture.beer3, ApiFixture.beer169  ],
                loading: NotAsked
            }, Cmd.none));
        });
    });

    it('ToggleFavorite', () => {
        expect(
            BeerList.ToggleFavorite(true, 123).update(
                request,
                {
                    hasMore: true,
                    beerList: [ ApiFixture.beer1, ApiFixture.beer3 ],
                    loading: Loading
                }
            )
        ).toEqual(BeerList.SetFavorites(true, 123));
    });
});
