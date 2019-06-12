import {} from 'react-bootstrap';
import Enzyme from 'enzyme';
import Adapter from 'enzyme-adapter-react-16';
import { Nothing, Just } from 'frctl/dist/Maybe';
import * as Router from './Router';
import * as SearchBuilder from './SearchBuilder';
import * as Header from './Header';

Enzyme.configure({
    adapter: new Adapter()
});

describe('State', () => {
    it('init', () => {
        expect(Header.init()).toEqual({
            expanded: false,
            searchBuilder: Nothing
        });
    });
});

describe('Stage', () => {
    const pattern: jest.Mocked<Header.StagePattern<string>> = {
        Update: jest.fn((_state: Header.State) => 'Update'),
        RollRandomBeer: jest.fn(() => 'RollRandomBeer'),
        SetFavorites: jest.fn((_checked: boolean, _beerId: number) => 'SetFavorites'),
        SetFilters: jest.fn((_filters: Router.SearchFilter) => 'SetFilters')
    };

    afterEach(() => {
        pattern.Update.mockClear();
        pattern.RollRandomBeer.mockClear();
        pattern.SetFavorites.mockClear();
        pattern.SetFilters.mockClear();
    });

    it('Update', () => {
        const state = {
            expanded: false,
            searchBuilder: Nothing
        };

        expect(Header.Update(state).cata(pattern)).toEqual('Update');
        expect(pattern.Update).toBeCalledTimes(1);
        expect(pattern.Update).toBeCalledWith(state);
        expect(pattern.RollRandomBeer).not.toBeCalled();
        expect(pattern.SetFavorites).not.toBeCalled();
        expect(pattern.SetFilters).not.toBeCalled();
    });

    it('RollRandomBeer', () => {
        expect(Header.RollRandomBeer.cata(pattern)).toEqual('RollRandomBeer');
        expect(pattern.Update).not.toBeCalled();
        expect(pattern.RollRandomBeer).toBeCalledTimes(1);
        expect(pattern.SetFavorites).not.toBeCalled();
        expect(pattern.SetFilters).not.toBeCalled();
    });

    it('SetFavorites', () => {
        expect(Header.SetFavorites(false, 1).cata(pattern)).toEqual('SetFavorites');
        expect(pattern.Update).not.toBeCalled();
        expect(pattern.RollRandomBeer).not.toBeCalled();
        expect(pattern.SetFavorites).toBeCalledTimes(1);
        expect(pattern.SetFavorites).toBeCalledWith(false, 1);
        expect(pattern.SetFilters).not.toBeCalled();
    });

    it('SetFilters', () => {
        const filters = {
            name: Just('name'),
            brewedAfter: Just(new Date(2010, 3))
        };

        expect(Header.SetFilters(filters).cata(pattern)).toEqual('SetFilters');
        expect(pattern.Update).not.toBeCalled();
        expect(pattern.RollRandomBeer).not.toBeCalled();
        expect(pattern.SetFavorites).not.toBeCalled();
        expect(pattern.SetFilters).toBeCalledTimes(1);
        expect(pattern.SetFilters).toBeCalledWith(filters);
    });
});

describe('Action', () => {
    it('RollBeer', () => {
        expect(Header.RollBeer.update({
            expanded: false,
            searchBuilder: Nothing
        })).toEqual(Header.RollRandomBeer);
    });

    describe('ShowSearchBuilder', () => {
        it('SearchBuilder is hidden', () => {
            const filters = {
                name: Just('name'),
                brewedAfter: Just(new Date(2010, 3))
            };

            expect(Header.ShowSearchBuilder(filters).update({
                expanded: false,
                searchBuilder: Nothing
            })).toEqual(Header.Update({
                expanded: false,
                searchBuilder: Just(SearchBuilder.init(filters))
            }));
        });

        it('SearchBuilder is visible', () => {
            const searchBuilderState = SearchBuilder.init({
                name: Just('bar'),
                brewedAfter: Just(new Date(2010, 3))
            });

            expect(Header.ShowSearchBuilder({
                name: Just('foo'),
                brewedAfter: Just(new Date(2000, 8))
            }).update({
                expanded: false,
                searchBuilder: Just(searchBuilderState)
            })).toEqual(Header.Update({
                expanded: false,
                searchBuilder: Just(searchBuilderState)
            }));
        });
    });

    it('HideSearchBuilder', () => {
        expect(Header.HideSearchBuilder.update({
            expanded: false,
            searchBuilder: Just(SearchBuilder.init({
                name: Just('bar'),
                brewedAfter: Just(new Date(2010, 3))
            }))
        })).toEqual(Header.Update({
            expanded: false,
            searchBuilder: Nothing
        }));
    });

    it('ToggleMenu', () => {
        expect(Header.ToggleMenu(true).update({
            expanded: false,
            searchBuilder: Nothing
        })).toEqual(Header.Update({
            expanded: true,
            searchBuilder: Nothing
        }));

        expect(Header.ToggleMenu(false).update({
            expanded: true,
            searchBuilder: Nothing
        })).toEqual(Header.Update({
            expanded: false,
            searchBuilder: Nothing
        }));
    });

    it('ToggleFavorite', () => {
        expect(Header.ToggleFavorite(true, 10).update({
            expanded: false,
            searchBuilder: Nothing
        })).toEqual(Header.SetFavorites(true, 10));
    });
});
