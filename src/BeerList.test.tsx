// import React from 'react';
import {} from 'react-bootstrap';
import Enzyme from 'enzyme';
import Adapter from 'enzyme-adapter-react-16';
import { NotAsked, Loading } from 'frctl/dist/RemoteData';
import { Nothing, Just } from 'frctl/dist/Maybe';
import { Right } from 'frctl/dist/Either';
import * as Api from './Api';
import * as BeerList from './BeerList';
import * as Http from 'Http';
import { __execute__ } from 'Cmd';

Enzyme.configure({
    adapter: new Adapter()
});

const PUNK_ENDPOINT = 'https://api.punkapi.com/v2';

const beer1 = {
    id: 1,
    name: 'name1',
    description: 'desc',
    tagline: 'tagline',
    contributor: 'contributor',
    brewersTips: 'brewersTips',
    foodPairing: ['food1', 'food2'],
    image: Nothing,
    firstBrewed: new Date(2000, 10),
    volume: {
        value: 20,
        unit: 'liters'
    },
    abv: Nothing,
    ibu: Nothing,
    targetFg: Nothing,
    targetOg: Nothing,
    ebc: Nothing,
    srm: Nothing,
    ph: Nothing,
    attenuationLevel: Nothing
};

const beer2 = {
    ...beer1,
    id: 2,
    name: 'name2'
};

describe('State', () => {
    const dispatch = jest.fn<void, [ BeerList.Action ]>();

    afterEach(() => {
        dispatch.mockClear();
    });

    it('init', () => {
        const request = jest.fn((_count: number ) => Api.loadBeerList(
            { name: Nothing, brewedAfter: Nothing },
            10,
            1
        ));

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
            .reply(200, []);

        __execute__(initialCmd, dispatch);

        expect(dispatch).toBeCalledTimes(1);
        expect(dispatch).toBeCalledWith(
            BeerList.LoadDone(Right({
                hasMore: false,
                beers: []
            }))
        );
    });

    describe('getBeer', () => {
        it('requested beer does not exist', () => {
            expect(
                BeerList.getBeer(2, {
                    hasMore: false,
                    beerList: [ beer1 ],
                    loading: NotAsked
                })
            ).toEqual(Nothing);
        });

        it('requested beer exists', () => {
            expect(
                BeerList.getBeer(2, {
                    hasMore: false,
                    beerList: [ beer1, beer2 ],
                    loading: NotAsked
                })
            ).toEqual(Just(beer2));
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
            beerList: [ beer1 ],
            loading: NotAsked
        })).toBe(false);

        expect(BeerList.isEmpty({
            hasMore: false,
            beerList: [ beer1 ],
            loading: Loading
        })).toBe(false);

        expect(BeerList.isEmpty({
            hasMore: false,
            beerList: [],
            loading: NotAsked
        })).toBe(true);
    });
});
