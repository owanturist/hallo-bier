import React from 'react';
import { Col, Card, Button } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHeart } from '@fortawesome/free-solid-svg-icons';
import { faHeart as faRegularHeart } from '@fortawesome/free-regular-svg-icons';
import Enzyme from 'enzyme';
import Adapter from 'enzyme-adapter-react-16';
import { NotAsked, Loading, Failure } from 'frctl/dist/RemoteData';
import { Nothing, Just } from 'frctl/dist/Maybe';
import { Left, Right } from 'frctl/dist/Either';
import * as Api from './Api';
import * as ApiFixture from './Api.fixture';
import * as BeerList from './BeerList';
import * as Http from 'Http';
import Cmd from 'Cmd';

Enzyme.configure({
    adapter: new Adapter()
});

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

describe('State', () => {
    it('init', () => {
        const [ initialState ] = BeerList.init(request);

        expect(initialState).toEqual({
            hasMore: true,
            beerList: [],
            loading: Loading
        });

        expect(request).toBeCalledTimes(1);
        expect(request).toBeCalledWith(0);
        expect(send).toBeCalledTimes(1);
        expect(send).toBeCalledWith(BeerList.LoadDone);
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

describe('ViewBeer', () => {
    const dispatch = jest.fn<void, [ BeerList.Action ]>();

    afterEach(() => {
        dispatch.mockClear();
    });

    it('does not render image column when the image dose not exist', () => {
        const wrapper = Enzyme.shallow(
            <BeerList.ViewBeer
                favorite={false}
                beer={ApiFixture.beer314}
                dispatch={dispatch}
            />
        );

        expect(wrapper.find(Col).length).toBe(1);
    });

    it('renders column when the image exists', () => {
        const wrapper = Enzyme.shallow(
            <BeerList.ViewBeer
                favorite={false}
                beer={ApiFixture.beer1}
                dispatch={dispatch}
            />
        );

        expect(wrapper.find(Col).length).toBe(2);
    });

    it('renders favorite heart and handle toggle when beer is not favorite', () => {
        const wrapper = Enzyme.shallow(
            <BeerList.ViewBeer
                favorite={false}
                beer={ApiFixture.beer169}
                dispatch={dispatch}
            />
        ).find(Card.Title).find(Button);

        expect(wrapper.find(FontAwesomeIcon).prop('icon')).toBe(faRegularHeart);

        wrapper.simulate('click');

        expect(dispatch).toBeCalledTimes(1);
        expect(dispatch).toBeCalledWith(BeerList.ToggleFavorite(true, 169));
    });

    it('renders favorite heart and handle toggle when beer is favorite', () => {
        const wrapper = Enzyme.shallow(
            <BeerList.ViewBeer
                favorite={true}
                beer={ApiFixture.beer169}
                dispatch={dispatch}
            />
        ).find(Card.Title).find(Button);

        expect(wrapper.find(FontAwesomeIcon).prop('icon')).toBe(faHeart);

        wrapper.simulate('click');

        expect(dispatch).toBeCalledTimes(1);
        expect(dispatch).toBeCalledWith(BeerList.ToggleFavorite(false, 169));
    });
});

describe('ViewBeerList', () => {
    const dispatch = jest.fn<void, [ BeerList.Action ]>();
    const favorites = new Set([ 1, 4, 3 ]);

    afterEach(() => {
        dispatch.mockClear();
    });

    it('mark ViewBeer as favorite if the beer id exists in favorites', () => {
        const wrapper = Enzyme.shallow(
            <BeerList.ViewBeerList
                favorites={favorites}
                beerList={[ ApiFixture.beer1, ApiFixture.beer2, ApiFixture.beer4 ]}
                dispatch={dispatch}
            />
        ).find(BeerList.ViewBeer);

        expect(wrapper.length).toBe(3);

        expect(wrapper.at(0).prop('beer')).toBe(ApiFixture.beer1);
        expect(wrapper.at(0).prop('favorite')).toBe(true);

        expect(wrapper.at(1).prop('beer')).toBe(ApiFixture.beer2);
        expect(wrapper.at(1).prop('favorite')).toBe(false);

        expect(wrapper.at(2).prop('beer')).toBe(ApiFixture.beer4);
        expect(wrapper.at(2).prop('favorite')).toBe(true);
    });
});

describe('View', () => {
    const dispatch = jest.fn<void, [ BeerList.Action ]>();
    const scroller = React.createRef<HTMLElement>();
    const favorites = new Set([ 1, 4, 3 ]);

    afterEach(() => {
        dispatch.mockClear();
    });

    it('renders SkeletonBeerList when beer list is empty and loading', () => {
        const wrapper = Enzyme.shallow(
            <BeerList.View
                scroller={scroller}
                favorites={favorites}
                skeletonCount={7}
                state={{
                    hasMore: true,
                    beerList: [],
                    loading: Loading
                }}
                dispatch={dispatch}
            />
        );

        expect(wrapper.find(BeerList.ViewBeerList).length).toBe(0);
        expect(wrapper.find(BeerList.SkeletonBeerList).length).toBe(1);
        expect(wrapper.find(BeerList.SkeletonBeerList).prop('count')).toBe(7);
        expect(wrapper.find(BeerList.ViewError).length).toBe(0);
        expect(wrapper.find(BeerList.ViewLoadMore).length).toBe(0);
        expect(wrapper.find(BeerList.ViewEmpty).length).toBe(0);
    });

    it('renders ViewEmpty when beer list is empty and not loading', () => {
        const wrapper = Enzyme.shallow(
            <BeerList.View
                scroller={scroller}
                favorites={favorites}
                skeletonCount={7}
                state={{
                    hasMore: false,
                    beerList: [],
                    loading: NotAsked
                }}
                dispatch={dispatch}
            />
        );

        expect(wrapper.find(BeerList.ViewBeerList).length).toBe(0);
        expect(wrapper.find(BeerList.SkeletonBeerList).length).toBe(0);
        expect(wrapper.find(BeerList.ViewError).length).toBe(0);
        expect(wrapper.find(BeerList.ViewLoadMore).length).toBe(0);
        expect(wrapper.find(BeerList.ViewEmpty).length).toBe(1);
    });

    it('renders both ViewError and BeerList when Failure with not empty beer list', () => {
        const wrapper = Enzyme.shallow(
            <BeerList.View
                scroller={scroller}
                favorites={favorites}
                skeletonCount={7}
                state={{
                    hasMore: false,
                    beerList: [ ApiFixture.beer1 ],
                    loading: Failure(Http.Error.Timeout)
                }}
                dispatch={dispatch}
            />
        );

        expect(wrapper.find(BeerList.ViewBeerList).length).toBe(1);
        expect(wrapper.find(BeerList.SkeletonBeerList).length).toBe(0);
        expect(wrapper.find(BeerList.ViewError).length).toBe(1);
        expect(wrapper.find(BeerList.ViewError).prop('error')).toEqual(Http.Error.Timeout);
        expect(wrapper.find(BeerList.ViewLoadMore).length).toBe(0);
        expect(wrapper.find(BeerList.ViewEmpty).length).toBe(0);
    });

    it('renders both ViewLoadMore and BeerList when Loading with not empty beer list', () => {
        const wrapper = Enzyme.shallow(
            <BeerList.View
                scroller={scroller}
                favorites={favorites}
                skeletonCount={7}
                state={{
                    hasMore: false,
                    beerList: [ ApiFixture.beer1 ],
                    loading: Loading
                }}
                dispatch={dispatch}
            />
        );

        expect(wrapper.find(BeerList.ViewBeerList).length).toBe(1);
        expect(wrapper.find(BeerList.SkeletonBeerList).length).toBe(0);
        expect(wrapper.find(BeerList.ViewError).length).toBe(0);
        expect(wrapper.find(BeerList.ViewLoadMore).length).toBe(1);
        expect(wrapper.find(BeerList.ViewEmpty).length).toBe(0);
    });

    it('renders both ViewLoadMore and BeerList when NotAsked but has more with not empty beer list', () => {
        const wrapper = Enzyme.shallow(
            <BeerList.View
                scroller={scroller}
                favorites={favorites}
                skeletonCount={7}
                state={{
                    hasMore: true,
                    beerList: [ ApiFixture.beer1 ],
                    loading: NotAsked
                }}
                dispatch={dispatch}
            />
        );

        expect(wrapper.find(BeerList.ViewBeerList).length).toBe(1);
        expect(wrapper.find(BeerList.SkeletonBeerList).length).toBe(0);
        expect(wrapper.find(BeerList.ViewError).length).toBe(0);
        expect(wrapper.find(BeerList.ViewLoadMore).length).toBe(1);
        expect(wrapper.find(BeerList.ViewEmpty).length).toBe(0);
    });

    it('renders only BeerList when NotAsked and has no more with not empty beer list', () => {
        const wrapper = Enzyme.shallow(
            <BeerList.View
                scroller={scroller}
                favorites={favorites}
                skeletonCount={7}
                state={{
                    hasMore: false,
                    beerList: [ ApiFixture.beer1 ],
                    loading: NotAsked
                }}
                dispatch={dispatch}
            />
        );

        expect(wrapper.find(BeerList.ViewBeerList).length).toBe(1);
        expect(wrapper.find(BeerList.SkeletonBeerList).length).toBe(0);
        expect(wrapper.find(BeerList.ViewError).length).toBe(0);
        expect(wrapper.find(BeerList.ViewLoadMore).length).toBe(0);
        expect(wrapper.find(BeerList.ViewEmpty).length).toBe(0);
    });
});
