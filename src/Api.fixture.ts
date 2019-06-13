/* tslint:disable:max-line-length */

import * as Api from './Api';
import { Just, Nothing } from 'frctl/dist/Maybe';
import fixtures from 'Api.fixture.json';

export interface Beer {
    id: number;
    name: string;
    description: string;
    tagline: string;
    contributed_by: string;
    brewers_tips: string;
    food_pairing: Array<string>;
    image_url?: string;
    first_brewed: string;
    volume: {
        value: number;
        unit: string;
    };
    abv?: number;
    ibu?: number;
    target_fg?: number;
    target_og?: number;
    ebc?: number;
    srm?: number;
    ph?: number;
    attenuation_level?: number;
}

export const getFixtures = (): Array<Beer> => fixtures;

export const getFixtureByIndex = (index: number): Beer => fixtures[ index ];

export const beer1: Api.Beer = {
    id: 1,
    name: 'Buzz',
    tagline: 'A Real Bitter Experience.',
    firstBrewed: new Date(2007, 8),
    description: 'A light, crisp and bitter IPA brewed with English and American hops. A small batch brewed only once.',
    image: Just('https://images.punkapi.com/v2/keg.png'),
    abv: Just(4.5),
    ibu: Just(60),
    targetFg: Just(1010),
    targetOg: Just(1044),
    ebc: Just(20),
    srm: Just(10),
    ph: Just(4.4),
    attenuationLevel: Just(75),
    volume: {
        value: 20,
        unit: 'litres'
    },
    foodPairing: [
        'Spicy chicken tikka masala',
        'Grilled chicken quesadilla',
        'Caramel toffee cake'
    ],
    brewersTips: 'The earthy and floral aromas from the hops can be overpowering. Drop a little Cascade in at the end of the boil to lift the profile with a bit of citrus.',
    contributor: 'Sam Mason <samjbmason>'
};

export const beer2: Api.Beer = {
    id: 2,
    name: 'Trashy Blonde',
    tagline: 'You Know You Shouldn\'t',
    firstBrewed: new Date(2008, 3),
    description: 'A titillating, neurotic, peroxide punk of a Pale Ale. Combining attitude, style, substance, and a little bit of low self esteem for good measure; what would your mother say? The seductive lure of the sassy passion fruit hop proves too much to resist. All that is even before we get onto the fact that there are no additives, preservatives, pasteurization or strings attached. All wrapped up with the customary BrewDog bite and imaginative twist.',
    image: Just('https://images.punkapi.com/v2/2.png'),
    abv: Just(4.1),
    ibu: Just(41.5),
    targetFg: Just(1010),
    targetOg: Just(1041.7),
    ebc: Just(15),
    srm: Just(15),
    ph: Just(4.4),
    attenuationLevel: Just(76),
    volume: {
        value: 20,
        unit: 'litres'
    },
    foodPairing: [
        'Fresh crab with lemon',
        'Garlic butter dipping sauce',
        'Goats cheese salad',
        'Creamy lemon bar doused in powdered sugar'
    ],
    brewersTips: 'Be careful not to collect too much wort from the mash. Once the sugars are all washed out there are some very unpleasant grainy tasting compounds that can be extracted into the wort.',
    contributor: 'Sam Mason <samjbmason>'
};

export const beer3: Api.Beer = {
    id: 3,
    name: 'Berliner Weisse With Yuzu - B-Sides',
    tagline: 'Japanese Citrus Berliner Weisse.',
    firstBrewed: new Date(2015, 10),
    description: 'Japanese citrus fruit intensifies the sour nature of this German classic.',
    image: Just('https://images.punkapi.com/v2/keg.png'),
    abv: Just(4.2),
    ibu: Just(8),
    targetFg: Just(1007),
    targetOg: Just(1040),
    ebc: Just(8),
    srm: Just(4),
    ph: Just(3.2),
    attenuationLevel: Just(83),
    volume: {
        value: 20,
        unit: 'litres'
    },
    foodPairing: [
        'Smoked chicken wings',
        'Miso ramen',
        'Yuzu cheesecake'
    ],
    brewersTips: 'Clean everything twice. All you want is the clean sourness of lactobacillus.',
    contributor: 'Sam Mason <samjbmason>'
};

export const beer4: Api.Beer = {
    id: 4,
    name: 'Pilsen Lager',
    tagline: 'Unleash the Yeast Series.',
    firstBrewed: new Date(2013, 8),
    description: 'Our Unleash the Yeast series was an epic experiment into the differences in aroma and flavour provided by switching up your yeast. We brewed up a wort with a light caramel note and some toasty biscuit flavour, and hopped it with Amarillo and Centennial for a citrusy bitterness. Everything else is down to the yeast. Pilsner yeast ferments with no fruity esters or spicy phenols, although it can add a hint of butterscotch.',
    image: Just('https://images.punkapi.com/v2/4.png'),
    abv: Just(6.3),
    ibu: Just(55),
    targetFg: Just(1012),
    targetOg: Just(1060),
    ebc: Just(30),
    srm: Just(15),
    ph: Just(4.4),
    attenuationLevel: Just(80),
    volume: {
        value: 20,
        unit: 'litres'
    },
    foodPairing: [
        'Spicy crab cakes',
        'Spicy cucumber and carrot Thai salad',
        'Sweet filled dumplings'
    ],
    brewersTips: 'Play around with the fermentation temperature to get the best flavour profile from the individual yeasts.',
    contributor: 'Ali Skinner <AliSkinner>'
};

export const beer5: Api.Beer = {
    id: 5,
    name: 'Avery Brown Dredge',
    tagline: 'Bloggers\' Imperial Pilsner.',
    firstBrewed: new Date(2011, 1),
    description: 'An Imperial Pilsner in collaboration with beer writers. Tradition. Homage. Revolution. We wanted to showcase the awesome backbone of the Czech brewing tradition, the noble Saaz hop, and also tip our hats to the modern beers that rock our world, and the people who make them.',
    image: Just('https://images.punkapi.com/v2/5.png'),
    abv: Just(7.2),
    ibu: Just(59),
    targetFg: Just(1027),
    targetOg: Just(1069),
    ebc: Just(10),
    srm: Just(5),
    ph: Just(4.4),
    attenuationLevel: Just(67),
    volume: {
        value: 20,
        unit: 'litres'
    },
    foodPairing: [
        'Vietnamese squid salad',
        'Chargrilled corn on the cob with paprika butter',
        'Strawberry and rhubarb pie'
    ],
    brewersTips: 'Make sure you have a big enough yeast starter to ferment through the OG and lager successfully.',
    contributor: 'Sam Mason <samjbmason>'
};

export const beer6: Api.Beer = {
    id: 6,
    name: 'Electric India',
    tagline: 'Vibrant Hoppy Saison.',
    firstBrewed: new Date(2013, 4),
    description: 'Re-brewed as a spring seasonal, this beer – which appeared originally as an Equity Punk shareholder creation – retains its trademark spicy, fruity edge. A perfect blend of Belgian Saison and US IPA, crushed peppercorns and heather honey are also added to produce a genuinely unique beer.',
    image: Just('https://images.punkapi.com/v2/6.png'),
    abv: Just(5.2),
    ibu: Just(38),
    targetFg: Just(1005),
    targetOg: Just(1045),
    ebc: Just(15),
    srm: Just(7.5),
    ph: Just(4.4),
    attenuationLevel: Just(88.9),
    volume: {
        value: 20,
        unit: 'litres'
    },
    foodPairing: [
        'Mussels with a garlic and herb sauce',
        'Crab melt sandwich',
        'Shortbread cookies'
    ],
    brewersTips: 'Source some really good heather honey to get the right spicy esters in the beer.',
    contributor: 'Sam Mason <samjbmason>'
};

export const beer7: Api.Beer = {
    id: 7,
    name: 'AB:12',
    tagline: 'Imperial Black Belgian Ale.',
    firstBrewed: new Date(2017, 6),
    description: 'An Imperial Black Belgian Ale aged in old Invergordon Scotch whisky barrels with mountains of raspberries, tayberries and blackberries in each cask. Decadent but light and dry, this beer would make a fantastic base for ageing on pretty much any dark fruit - we used raspberries, tayberries and blackberries beause they were local.',
    image: Just('https://images.punkapi.com/v2/7.png'),
    abv: Just(11.2),
    ibu: Just(35),
    targetFg: Just(1017),
    targetOg: Just(1108),
    ebc: Just(80),
    srm: Just(40),
    ph: Just(5.3),
    attenuationLevel: Just(84),
    volume: {
        value: 20,
        unit: 'litres'
    },
    foodPairing: [
        'Tandoori lamb with pomegranate',
        'Beef Wellington with a red wine jus',
        'Raspberry chocolate torte'
    ],
    brewersTips: 'Don\'t worry too much about controlling the temperature with the Belgian yeast strain - just make sure it doesn\'t rise above 30°C!',
    contributor: 'Sam Mason <samjbmason>'
};

export const beer8: Api.Beer = {
    id: 8,
    name: 'Fake Lager',
    tagline: 'Bohemian Pilsner.',
    firstBrewed: new Date(2013, 2),
    description: 'Fake is the new black. Fake is where it is at. Fake Art, fake brands, fake breasts, and fake lager. We want to play our part in the ugly fallout from the Lager Dream. Say hello to Fake Lager – a zesty, floral 21st century faux masterpiece with added BrewDog bitterness.',
    image: Just('https://images.punkapi.com/v2/8.png'),
    abv: Just(4.7),
    ibu: Just(40),
    targetFg: Just(1010),
    targetOg: Just(1046),
    ebc: Just(12),
    srm: Just(6),
    ph: Just(4.4),
    attenuationLevel: Just(78),
    volume: {
        value: 20,
        unit: 'litres'
    },
    foodPairing: [
        'Fried crab cakes with avocado salsa',
        'Spicy shredded pork roll with hot dipping sauce',
        'Key lime pie'
    ],
    brewersTips: 'Once the primary fermentation is complete get this beer as cold as you can and let it mature for as long as you\'ve got.',
    contributor: 'Sam Mason <samjbmason>'
};

export const beer9: Api.Beer = {
    id: 9,
    name: 'AB:07',
    tagline: 'Whisky Cask-Aged Scotch Ale.',
    firstBrewed: new Date(2013, 2),
    description: 'Whisky cask-aged imperial scotch ale. Beer perfect for when the rain is coming sideways. Liquorice, plum and raisin temper the warming alcohol, producing a beer capable of holding back the Scottish chill.',
    image: Just('https://images.punkapi.com/v2/9.png'),
    abv: Just(12.5),
    ibu: Just(30),
    targetFg: Just(1020),
    targetOg: Just(1106),
    ebc: Just(84),
    srm: Just(42),
    ph: Just(5.6),
    attenuationLevel: Just(83),
    volume: {
        value: 20,
        unit: 'litres'
    },
    foodPairing: [
        'Kedgeree',
        'Scotch broth with sourdough bread',
        'Clootie dumpling'
    ],
    brewersTips: 'Authentic heather honey adds a beautiful floral top note that is unachievable any other way.',
    contributor: 'Sam Mason <samjbmason>'
};

export const beer169: Api.Beer = {
    id: 169,
    name: 'AB:19',
    tagline: 'A Blend of Two Barrel-aged Imperial Saisons.',
    firstBrewed: new Date(2012, 5),
    description: 'One of the most complex beers we’ve ever attempted. A blend of two barrel-aged Imperial Saisons – one black, one red – which has in turn then been aged in rum barrels, it is an enormous, intricate beer. A baseline of warm, smoky raisin and plum, followed by punchy flavour elements coming to the fore – coconut, mint and blackcurrant. There’s a long undercurrent of treacle toffee, before the finish darkens to liquorice, star anise amidst a touch of honey sweetness.',
    image: Just('https://images.punkapi.com/v2/169.png'),
    abv: Just(13.1),
    ibu: Nothing,
    targetFg: Nothing,
    targetOg: Nothing,
    ebc: Nothing,
    srm: Nothing,
    ph: Nothing,
    attenuationLevel: Nothing,
    volume: {
        value: 20,
        unit: 'litres'
    },
    foodPairing: [
        'Game terrine',
        'Spiced fruit cake',
        'Chocolate, cherry and hazelnut mousse'
    ],
    brewersTips: 'It can be difficult to get the perfect balance between both beers. Set up several small blends of varying percentages to determine which you prefer.',
    contributor: 'Sam Mason <samjbmason>'
};

export const beer314: Api.Beer = {
    id: 314,
    name: 'Manic Mango',
    tagline: 'Mango IPA.',
    firstBrewed: new Date(2018),
    description: 'BrewDog v Brewski. One of a series of collaborations with European craft breweries, aimed at promoting engagement and market growth. Our Swedish collaboration with Brewski is a mango IPA.',
    image: Nothing,
    abv: Just(6),
    ibu: Just(20),
    targetFg: Just(1010),
    targetOg: Just(1057),
    ebc: Just(12),
    srm: Just(6),
    ph: Just(4.4),
    attenuationLevel: Just(82),
    volume: {
        value: 20,
        unit: 'litres'
    },
    foodPairing: [
        'Green Thai curry',
        'Salmon with mango salsa',
        'Pho soup with light rice noodles'
    ],
    brewersTips: 'Add the mango puree towards the end of primary fermentation, about 10 SG points above your FG. Allow it to reach FG and have a diacetyl rest before dry hopping it.',
    contributor: 'John Jenkman <johnjenkman>'
};

export const list = [ beer1, beer2, beer3, beer4, beer5, beer6, beer7, beer8, beer9, beer169, beer314 ];

export const map = new Map(list.map((beer): [ number, Api.Beer ] => [ beer.id, beer ]));
