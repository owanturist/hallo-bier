import { Maybe, Just, Nothing } from 'frctl/dist/src/Maybe';
import * as Decode from 'frctl/dist/src/Json/Decode';
import * as Http from './Http';
import { SearchFilter } from 'Router';

const PUNK_ENDPOINT = 'https://api.punkapi.com/v2';

export interface Beer {
    id: number;
    name: string;
    description: string;
    tagline: string;
    image: Maybe<string>;
    firstBrewed: Date;
}

const beerDecoder: Decode.Decoder<Beer> = Decode.props({
    id: Decode.field('id', Decode.number),
    name: Decode.field('name', Decode.string),
    description: Decode.field('description', Decode.string),
    tagline: Decode.field('tagline', Decode.string),
    image: Decode.field('image_url', Decode.nullable(Decode.string)),
    firstBrewed: Decode.field('first_brewed', Decode.string.map((shortDate: string) => new Date(`01/${shortDate}`)))
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
): Http.Request<Array<Beer>> => {
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
        .withExpect(Http.expectJson(Decode.list(beerDecoder)));
};

export const loadBeer = (beerId: number): Http.Request<Beer> => {
    return Http.get(`${PUNK_ENDPOINT}/beers/${beerId}`)
        .withExpect(Http.expectJson(Decode.index(0, beerDecoder)));
};
