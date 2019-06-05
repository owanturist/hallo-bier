import { Maybe } from 'frctl/dist/src/Maybe';
import * as Decode from 'frctl/dist/src/Json/Decode';
import * as Http from './Http';

const PUNK_ENDPOINT = 'https://api.punkapi.com/v2/beers';

export type Beer = Readonly<{
    id: number;
    name: string;
    description: string;
    tagline: string;
    image: Maybe<string>;
    firstBrewed: Date;
}>;

const beerDecoder: Decode.Decoder<Beer> = Decode.props({
    id: Decode.field('id', Decode.number),
    name: Decode.field('name', Decode.string),
    description: Decode.field('description', Decode.string),
    tagline: Decode.field('tagline', Decode.string),
    image: Decode.field('image_url', Decode.nullable(Decode.string)),
    firstBrewed: Decode.field('first_brewed', Decode.string.map((shortDate: string) => new Date(`01/${shortDate}`)))
});

export type LoadFilter = Readonly<{
    name: Maybe<string>;
    brewedAfter: Maybe<Date>;
}>;

export const loadBeerList = (
    filter: LoadFilter,
    beersPerPage: number,
    pageNumber: number
): Http.Request<Array<Beer>> => {
    return Http.get(PUNK_ENDPOINT)
        .withQueryParam('page', pageNumber.toString())
        .withQueryParam('per_page', beersPerPage.toString())
        .withQueryParams(filter.name.map((name: string): Array<[string, string]> => [
            ['beer_name', name]
        ]).getOrElse([]))
        .withQueryParams(filter.brewedAfter.map((brewedAfter: Date): Array<[ string, string ]> => [
            [ 'brewed_after', brewedAfter.toLocaleDateString().slice(3) ]
        ]).getOrElse([]))
        .withExpect(Http.expectJson(Decode.list(beerDecoder)));
};

export const loadBeer = (beerId: number): Http.Request<Beer> => {
    return Http.get(`${PUNK_ENDPOINT}/beer/${beerId}`)
        .withExpect(Http.expectJson(beerDecoder));
};
