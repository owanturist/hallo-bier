import { Maybe, Just, Nothing } from 'frctl/dist/src/Maybe';
import * as Decode from 'frctl/dist/src/Json/Decode';
import * as Encode from 'frctl/dist/src/Json/Encode';
import { Cmd } from 'Cmd';
import * as Http from 'Http';
import * as LocalStorage from 'LocalStorage';
import { SearchFilter } from 'Router';

const PUNK_ENDPOINT = 'https://api.punkapi.com/v2';

export interface Beer {
    id: number;
    name: string;
    description: string;
    tagline: string;
    contributor: string;
    brewersTips: string;
    foodPairing: Array<string>;
    image: Maybe<string>;
    firstBrewed: Date;
    volume: {
        value: number;
        unit: string;
    };
    abv: Maybe<number>;
    ibu: Maybe<number>;
    targetFg: Maybe<number>;
    targetOg: Maybe<number>;
    ebc: Maybe<number>;
    srm: Maybe<number>;
    ph: Maybe<number>;
    attenuationLevel: Maybe<number>;
}

const beerDecoder: Decode.Decoder<Beer> = Decode.props({
    id: Decode.field('id', Decode.number),
    name: Decode.field('name', Decode.string),
    description: Decode.field('description', Decode.string),
    tagline: Decode.field('tagline', Decode.string),
    contributor: Decode.field('contributed_by', Decode.string),
    brewersTips: Decode.field('brewers_tips', Decode.string),
    foodPairing: Decode.field('food_pairing', Decode.list(Decode.string)),
    image: Decode.field('image_url', Decode.nullable(Decode.string)),
    firstBrewed: Decode.field(
        'first_brewed',
        Decode.string.map((shortDate: string) => {
            const date = new Date(`01/${shortDate}`);

            if (isNaN(date.getTime())) {
                return new Date(shortDate);
            }

            return date;
        })
    ),
    volume: Decode.field(
        'volume',
        Decode.props({
            value: Decode.field('value', Decode.number),
            unit: Decode.field('unit', Decode.string)
        })
    ),
    abv: Decode.field('abv', Decode.nullable(Decode.number)),
    ibu: Decode.field('ibu', Decode.nullable(Decode.number)),
    targetFg: Decode.field('target_fg', Decode.nullable(Decode.number)),
    targetOg: Decode.field('target_og', Decode.nullable(Decode.number)),
    ebc: Decode.field('ebc', Decode.nullable(Decode.number)),
    srm: Decode.field('srm', Decode.nullable(Decode.number)),
    ph: Decode.field('ph', Decode.nullable(Decode.number)),
    attenuationLevel: Decode.field('attenuation_level', Decode.nullable(Decode.number))
});

const nameToQuery = (name: string): Maybe<string> => {
    const trimmed = name.trim();

    if (!trimmed.length) {
        return Nothing;
    }

    return Just(trimmed.replace(/\s+/g, '_'));
};

const dateToQuery = (date: Date): string => {
    return date.toLocaleDateString().slice(3).replace('/', '_');
};

const query = (key: string) => (value: string): [ string, string ] => [ key, value ];

const arraySingleton = <T>(el: T): Array<T> => [ el ];

export const loadBeerList = (
    filter: SearchFilter,
    beersPerPage: number,
    pageNumber: number
): Http.Request<[ boolean, Array<Beer> ]> => {
    return Http.get(`${PUNK_ENDPOINT}/beers`)
        .withQueryParam('page', pageNumber.toString())
        .withQueryParam('per_page', beersPerPage.toString())
        .withQueryParams(
            filter.name
                .chain(nameToQuery)
                .map(query('beer_name'))
                .map(arraySingleton)
                .getOrElse([])
        )
        .withQueryParams(
            filter.brewedAfter
                .map(dateToQuery)
                .map(query('brewed_after'))
                .map(arraySingleton)
                .getOrElse([])
        )
        .withExpect(Http.expectJson(
            Decode.list(beerDecoder).map((beers): [ boolean, Array<Beer> ] => [
                beers.length >= beersPerPage,
                beers
            ])
        ));
};

export const loadBeerListByIds = (
    filter: SearchFilter,
    ids: Array<number>,
    beersPerPage: number,
    pageNumber: number
): Http.Request<[ boolean, Array<Beer> ]> => {
    return loadBeerList(filter, beersPerPage, pageNumber)
        .withQueryParam('ids', ids.join('|'));
};

export const loadBeerById = (beerId: number): Http.Request<Beer> => {
    return Http.get(`${PUNK_ENDPOINT}/beers/${beerId}`)
        .withExpect(Http.expectJson(Decode.index(0, beerDecoder)));
};

export const loadRandomBeer = (): Http.Request<Beer> => {
    return Http.get(`${PUNK_ENDPOINT}/beers/random`)
        .withExpect(Http.expectJson(Decode.index(0, beerDecoder)));
};

export const getListOfFavorites = (): Cmd<Array<number>> => {
    return LocalStorage.getItem('favorites').map(
        mJSON => mJSON.chain(
            json => Decode.list(Decode.number).decodeJSON(json).toMaybe()
        ).getOrElse([])
    );
};

export const setListOfFavorites = (beerIds: Array<number>): Cmd<never> => {
    return LocalStorage.setItem(
        'favorites',
        Encode.listOf(Encode.number, beerIds).encode(0)
    );
};
