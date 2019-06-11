import React from 'react';
import * as ReactRouter from 'react-router-dom';
import Enzyme from 'enzyme';
import Adapter from 'enzyme-adapter-react-16';
import { Nothing, Just } from 'frctl/dist/Maybe';
import * as Router from './Router';

Enzyme.configure({
    adapter: new Adapter()
});

describe('areSearchFiltersEqual', () => {
    test('True when links to the objects are equal', () => {
        const filter = {
            name: Nothing,
            brewedAfter: Nothing
        };

        expect(Router.areSearchFiltersEqual(filter, filter)).toBe(true);
    });

    test('True when everything is Nothing', () => {
        expect(
            Router.areSearchFiltersEqual({
                name: Nothing,
                brewedAfter: Nothing
            }, {
                name: Nothing,
                brewedAfter: Nothing
            })
        ).toBe(true);
    });

    test('False with different combinations of fields', () => {
        expect(
            Router.areSearchFiltersEqual({
                name: Just('name'),
                brewedAfter: Nothing
            }, {
                name: Nothing,
                brewedAfter: Nothing
            })
        ).toBe(false);

        expect(
            Router.areSearchFiltersEqual({
                name: Nothing,
                brewedAfter: Just(new Date(2017))
            }, {
                name: Nothing,
                brewedAfter: Nothing
            })
        ).toBe(false);

        expect(
            Router.areSearchFiltersEqual({
                name: Nothing,
                brewedAfter: Nothing
            }, {
                name: Just('name'),
                brewedAfter: Nothing
            })
        ).toBe(false);

        expect(
            Router.areSearchFiltersEqual({
                name: Nothing,
                brewedAfter: Nothing
            }, {
                name: Nothing,
                brewedAfter: Just(new Date(2017))
            })
        ).toBe(false);
    });

    test('False with different name', () => {
        expect(
            Router.areSearchFiltersEqual({
                name: Just('name1'),
                brewedAfter: Just(new Date(2017))
            }, {
                name: Just('name2'),
                brewedAfter: Just(new Date(2017))
            })
        ).toBe(false);
    });

    test('False with different brewedAfter', () => {
        expect(
            Router.areSearchFiltersEqual({
                name: Just('name'),
                brewedAfter: Just(new Date(2017))
            }, {
                name: Just('name'),
                brewedAfter: Just(new Date(2018))
            })
        ).toBe(false);
    });

    test('True when everything is the same', () => {
        expect(
            Router.areSearchFiltersEqual({
                name: Just('name'),
                brewedAfter: Just(new Date(2017))
            }, {
                name: Just('name'),
                brewedAfter: Just(new Date(2017))
            })
        ).toBe(true);
    });
});

describe('ToHome', () => {
    test('toPath', () => {
        expect(Router.ToHome.toPath()).toBe('/');
    });

    test('cata', () => {
        expect(Router.ToHome.cata({
            ToHome: () => 0,
            _: () => 1
        })).toBe(0);

        expect(Router.ToHome.cata({
            ToBeer: () => 0,
            _: () => 1
        })).toBe(1);
    });

    test('isEqual', () => {
        expect(Router.ToHome.isEqual(Router.ToRandomBeer)).toBe(false);
        expect(Router.ToHome.isEqual(Router.ToHome)).toBe(true);
    });
});

describe('ToBeer', () => {
    test('toPath', () => {
        expect(Router.ToBeer(1).toPath()).toBe('/beer/1');
        expect(Router.ToBeer(2).toPath()).toBe('/beer/2');
    });

    test('cata', () => {
        expect(Router.ToBeer(2).cata({
            ToBeer: id => id,
            _: () => 0
        })).toBe(2);

        expect(Router.ToBeer(2).cata({
            ToHome: () => 1,
            _: () => 0
        })).toBe(0);
    });

    test('isEqual', () => {
        expect(Router.ToBeer(1).isEqual(Router.ToHome)).toBe(false);
        expect(Router.ToBeer(1).isEqual(Router.ToBeer(2))).toBe(false);
        expect(Router.ToBeer(1).isEqual(Router.ToBeer(1))).toBe(true);
    });
});

describe('ToRandomBeer', () => {
    test('toPath', () => {
        expect(Router.ToRandomBeer.toPath()).toBe('/random');
    });

    test('cata', () => {
        expect(Router.ToRandomBeer.cata({
            ToRandomBeer: () => 0,
            _: () => 1
        })).toBe(0);

        expect(Router.ToRandomBeer.cata({
            ToHome: () => 0,
            _: () => 1
        })).toBe(1);
    });

    test('isEqual', () => {
        expect(Router.ToRandomBeer.isEqual(Router.ToHome)).toBe(false);
        expect(Router.ToRandomBeer.isEqual(Router.ToRandomBeer)).toBe(true);
    });
});

describe('ToBeerSearch', () => {
    test('toPath', () => {
        expect(Router.ToBeerSearch({
            name: Nothing,
            brewedAfter: Nothing
        }).toPath()).toBe('/search');

        expect(Router.ToBeerSearch({
            name: Just('n m'),
            brewedAfter: Nothing
        }).toPath()).toBe('/search?name=n%20m');

        expect(Router.ToBeerSearch({
            name: Nothing,
            brewedAfter: Just(new Date(2017, 3))
        }).toPath()).toBe('/search?bra=4%2F2017');

        expect(Router.ToBeerSearch({
            name: Just('f_q'),
            brewedAfter: Just(new Date(2017, 11))
        }).toPath()).toBe('/search?bra=12%2F2017&name=f_q');
    });

    test('cata', () => {
        const filter = {
            name: Just('name'),
            brewedAfter: Just(new Date(2017))
        };

        expect(Router.ToBeerSearch(filter).cata({
            ToBeerSearch: f => f,
            _: () => ({
                name: Nothing,
                brewedAfter: Nothing
            })
        })).toBe(filter);

        expect(Router.ToBeerSearch(filter).cata({
            ToHome: () => 0,
            _: () => 1
        })).toBe(1);
    });

    test('isEqual', () => {
        expect(Router.ToBeerSearch({
            name: Nothing,
            brewedAfter: Nothing
        }).isEqual(Router.ToHome)).toBe(false);

        expect(Router.ToBeerSearch({
            name: Just('name1'),
            brewedAfter: Nothing
        }).isEqual(Router.ToBeerSearch({
            name: Just('name2'),
            brewedAfter: Nothing
        }))).toBe(false);

        expect(Router.ToBeerSearch({
            name: Just('name'),
            brewedAfter: Just(new Date(2017))
        }).isEqual(Router.ToBeerSearch({
            name: Just('name'),
            brewedAfter: Just(new Date(2017))
        }))).toBe(true);
    });
});

describe('ToFavorites', () => {
    test('toPath', () => {
        expect(Router.ToFavorites({
            name: Nothing,
            brewedAfter: Nothing
        }).toPath()).toBe('/favorites');

        expect(Router.ToFavorites({
            name: Just('n m'),
            brewedAfter: Nothing
        }).toPath()).toBe('/favorites?name=n%20m');

        expect(Router.ToFavorites({
            name: Nothing,
            brewedAfter: Just(new Date(2017, 3))
        }).toPath()).toBe('/favorites?bra=4%2F2017');

        expect(Router.ToFavorites({
            name: Just('f_q'),
            brewedAfter: Just(new Date(2017, 11))
        }).toPath()).toBe('/favorites?bra=12%2F2017&name=f_q');
    });

    test('cata', () => {
        const filter = {
            name: Just('name'),
            brewedAfter: Just(new Date(2017))
        };

        expect(Router.ToFavorites(filter).cata({
            ToFavorites: f => f,
            _: () => ({
                name: Nothing,
                brewedAfter: Nothing
            })
        })).toBe(filter);

        expect(Router.ToFavorites(filter).cata({
            ToHome: () => 0,
            _: () => 1
        })).toBe(1);
    });

    test('isEqual', () => {
        expect(Router.ToFavorites({
            name: Nothing,
            brewedAfter: Nothing
        }).isEqual(Router.ToHome)).toBe(false);

        expect(Router.ToFavorites({
            name: Just('name1'),
            brewedAfter: Nothing
        }).isEqual(Router.ToFavorites({
            name: Just('name2'),
            brewedAfter: Nothing
        }))).toBe(false);

        expect(Router.ToFavorites({
            name: Just('name'),
            brewedAfter: Just(new Date(2017))
        }).isEqual(Router.ToFavorites({
            name: Just('name'),
            brewedAfter: Just(new Date(2017))
        }))).toBe(true);
    });
});

describe('Link', () => {
    it('represend ReactRouter.Link', () => {
        const wrapper = Enzyme.shallow(
            <Router.Link
                to={Router.ToRandomBeer}
                className="my-link"
                target="blank"
            >Link text</Router.Link>
        );

        const props = wrapper.find(ReactRouter.Link).props();

        expect(props.to).toBe(Router.ToRandomBeer.toPath());
        expect(props.className).toBe('my-link');
        expect(props.target).toBe('blank');
        expect(props.children).toBe('Link text');
    });
});
