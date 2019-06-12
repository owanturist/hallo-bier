import React from 'react';
import { Button, Navbar } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHeart } from '@fortawesome/free-solid-svg-icons';
import { faHeart as faRegularHeart } from '@fortawesome/free-regular-svg-icons';
import Enzyme from 'enzyme';
import Adapter from 'enzyme-adapter-react-16';
import { Nothing, Just } from 'frctl/dist/Maybe';
import * as Router from './Router';
import * as SearchBuilder from './SearchBuilder';
import * as Header from './Header';

Enzyme.configure({
    adapter: new Adapter()
});

class SearchBuilderAction implements SearchBuilder.Action {
    public static readonly update = jest.fn<SearchBuilder.Stage, [ SearchBuilder.State ]>();

    public update(state: SearchBuilder.State): SearchBuilder.Stage {
        return SearchBuilderAction.update(state);
    }
}

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

    describe('SearchBuilderAction', () => {
        afterEach(() => {
            SearchBuilderAction.update.mockClear();
        });

        it('SearchBuilder is hidden', () => {
            expect(Header.SearchBuilderAction(new SearchBuilderAction()).update({
                expanded: false,
                searchBuilder: Nothing
            })).toEqual(Header.Update({
                expanded: false,
                searchBuilder: Nothing
            }));

            expect(SearchBuilderAction.update).not.toBeCalled();
        });

        it('on SearchBuilder.Update', () => {
            const searchBuilderState = SearchBuilder.init({ name: Nothing, brewedAfter: Nothing });
            const searchBuilderNextState = SearchBuilder.init({ name: Just('q'), brewedAfter: Nothing });

            SearchBuilderAction.update.mockReturnValueOnce(
                SearchBuilder.Update(searchBuilderNextState)
            );

            expect(Header.SearchBuilderAction(new SearchBuilderAction()).update({
                expanded: false,
                searchBuilder: Just(searchBuilderState)
            })).toEqual(Header.Update({
                expanded: false,
                searchBuilder: Just(searchBuilderNextState)
            }));

            expect(SearchBuilderAction.update).toBeCalledTimes(1);
            expect(SearchBuilderAction.update).toBeCalledWith(searchBuilderState);
        });

        it('on SearchBuilder.Search', () => {
            const searchBuilderState = SearchBuilder.init({ name: Nothing, brewedAfter: Nothing });
            const filters = { name: Just('q'), brewedAfter: Nothing };

            SearchBuilderAction.update.mockReturnValueOnce(
                SearchBuilder.Search(filters)
            );

            expect(Header.SearchBuilderAction(new SearchBuilderAction()).update({
                expanded: false,
                searchBuilder: Just(searchBuilderState)
            })).toEqual(Header.SetFilters(filters));

            expect(SearchBuilderAction.update).toBeCalledTimes(1);
            expect(SearchBuilderAction.update).toBeCalledWith(searchBuilderState);
        });
    });
});

describe('Tool', () => {
    describe('Filter', () => {
        const filters = {
            name: Just('name'),
            brewedAfter: Just(new Date(2010, 2))
        };

        expect(
            Header.Filter(filters).cata({
                Filter: Just,
                _: () => Nothing
            })
        ).toEqual(
            Just(filters)
        );

        expect(
            Header.Filter(filters).cata({
                Roll: () => 0,
                _: () => 1
            })
        ).toEqual(1);
    });

    describe('Roll', () => {
        expect(
            Header.Roll(true).cata({
                Roll: Just,
                _: () => Nothing
            })
        ).toEqual(Just(true));

        expect(
            Header.Roll(true).cata({
                Filter: () => 0,
                _: () => 1
            })
        ).toEqual(1);
    });

    describe('Favorite', () => {
        expect(
            Header.Favorite(new Set([ 1 ]), Just(0)).cata({
                Favorite: (favorites, beerId) => Just([ favorites, beerId ]),
                _: () => Nothing
            })
        ).toEqual(Just([ new Set([ 1 ]), Just(0) ]));

        expect(
            Header.Favorite(new Set([ 1 ]), Just(0)).cata({
                Filter: () => 0,
                _: () => 1
            })
        ).toEqual(1);
    });
});

describe('ViewTool', () => {
    const dispatch: jest.Mock<void, [ Header.Action ]> = jest.fn();

    afterEach(() => {
        dispatch.mockClear();
    });

    describe('Filter', () => {
        const filters = {
            name: Just('name'),
            brewedAfter: Just(new Date(2010, 2))
        };

        it('tool is inactive when SearchBilder is hidden', () => {
            const wrapperButton = Enzyme.shallow(
                <Header.ViewTool
                    tool={Header.Filter(filters)}
                    state={{
                        expanded: false,
                        searchBuilder: Nothing
                    }}
                    dispatch={dispatch}
                />
            ).find(Button);

            expect(
                wrapperButton.prop<boolean>('active')
            ).toBe(false);

            wrapperButton.simulate('click');

            expect(dispatch).toBeCalledTimes(1);
            expect(dispatch).toBeCalledWith(Header.ShowSearchBuilder(filters));
        });

        it('tool is active when SearchBilder is visible', () => {
            const wrapperButton = Enzyme.shallow(
                <Header.ViewTool
                    tool={Header.Filter(filters)}
                    state={{
                        expanded: false,
                        searchBuilder: Just(SearchBuilder.init({ name: Nothing, brewedAfter: Nothing }))
                    }}
                    dispatch={dispatch}
                />
            ).find(Button);

            expect(
                wrapperButton.prop<boolean>('active')
            ).toBe(true);

            wrapperButton.simulate('click');

            expect(dispatch).toBeCalledTimes(1);
            expect(dispatch).toBeCalledWith(Header.HideSearchBuilder);
        });
    });

    describe('Roll', () => {
        it('tool is disabled when busy', () => {
            expect(
                Enzyme.shallow(
                    <Header.ViewTool
                        tool={Header.Roll(true)}
                        state={{
                            expanded: false,
                            searchBuilder: Nothing
                        }}
                        dispatch={dispatch}
                    />
                ).find(Button).prop<boolean>('disabled')
            ).toBe(true);
        });

        it('tool is enabled when not busy', () => {
            expect(
                Enzyme.shallow(
                    <Header.ViewTool
                        tool={Header.Roll(false)}
                        state={{
                            expanded: false,
                            searchBuilder: Nothing
                        }}
                        dispatch={dispatch}
                    />
                ).find(Button).prop<boolean>('disabled')
            ).toBe(false);
        });

        it('emits RollBeer when clicked', () => {
            Enzyme.shallow(
                <Header.ViewTool
                    tool={Header.Roll(false)}
                    state={{
                        expanded: false,
                        searchBuilder: Nothing
                    }}
                    dispatch={dispatch}
                />
            ).find(Button).simulate('click');

            expect(dispatch).toBeCalledTimes(1);
            expect(dispatch).toBeCalledWith(Header.RollBeer);
        });
    });

    describe('Favorite', () => {
        const favorites = new Set([ 1, 2, 4 ]);

        it('tool is disabled when beer id is Nothing', () => {
            expect(
                Enzyme.shallow(
                    <Header.ViewTool
                        tool={Header.Favorite(favorites, Nothing)}
                        state={{
                            expanded: false,
                            searchBuilder: Nothing
                        }}
                        dispatch={dispatch}
                    />
                ).find(Button).prop<boolean>('disabled')
            ).toBe(true);
        });

        it('unchecked when beer id does not exist in favorites', () => {
            const wrapperButton = Enzyme.shallow(
                <Header.ViewTool
                    tool={Header.Favorite(favorites, Just(3))}
                    state={{
                        expanded: false,
                        searchBuilder: Nothing
                    }}
                    dispatch={dispatch}
                />
            ).find(Button);

            expect(wrapperButton.find(FontAwesomeIcon).prop('icon')).toEqual(faRegularHeart);

            wrapperButton.simulate('click');

            expect(dispatch).toBeCalledTimes(1);
            expect(dispatch).toBeCalledWith(Header.ToggleFavorite(true, 3));
        });

        it('checked when beer id exists in favorites', () => {
            const wrapperButton = Enzyme.shallow(
                <Header.ViewTool
                    tool={Header.Favorite(favorites, Just(1))}
                    state={{
                        expanded: false,
                        searchBuilder: Nothing
                    }}
                    dispatch={dispatch}
                />
            ).find(Button);

            expect(wrapperButton.find(FontAwesomeIcon).prop('icon')).toEqual(faHeart);

            wrapperButton.simulate('click');

            expect(dispatch).toBeCalledTimes(1);
            expect(dispatch).toBeCalledWith(Header.ToggleFavorite(false, 1));
        });
    });
});

describe('View', () => {
    const dispatch: jest.Mock<void, [ Header.Action ]> = jest.fn();

    afterEach(() => {
        dispatch.mockClear();
    });

    describe('renders tools acording prop', () => {
        it('tools are empty', () => {
            const wrapper = Enzyme.shallow(
                <Header.View
                    tools={[]}
                    state={{
                        expanded: false,
                        searchBuilder: Nothing
                    }}
                    dispatch={dispatch}
                />
            );

            expect(wrapper.find(Header.ViewTool).length).toBe(0);
        });

        it('some tools', () => {
            const wrapper = Enzyme.shallow(
                <Header.View
                    tools={[
                        Header.Filter({ name: Nothing, brewedAfter: Nothing }),
                        Header.Roll(true)
                    ]}
                    state={{
                        expanded: false,
                        searchBuilder: Nothing
                    }}
                    dispatch={dispatch}
                />
            );

            expect(wrapper.find(Header.ViewTool).length).toBe(2);

            expect(
                wrapper.find(Header.ViewTool).at(0).prop('tool')
            ).toEqual(
                Header.Filter({ name: Nothing, brewedAfter: Nothing })
            );
            expect(
                wrapper.find(Header.ViewTool).at(1).prop('tool')
            ).toEqual(
                Header.Roll(true)
            );
        });
    });

    describe('renders SearchBuilder according Filter tool and state', () => {
        it('Filter does not exist and state is Nothing', () => {
            const wrapper = Enzyme.shallow(
                <Header.View
                    tools={[]}
                    state={{
                        expanded: false,
                        searchBuilder: Nothing
                    }}
                    dispatch={dispatch}
                />
            );

            expect(wrapper.find(SearchBuilder.View).length).toBe(0);
        });

        it('Filter exists and state is Nothing', () => {
            const wrapper = Enzyme.shallow(
                <Header.View
                    tools={[
                        Header.Filter({ name: Nothing, brewedAfter: Nothing })
                    ]}
                    state={{
                        expanded: false,
                        searchBuilder: Nothing
                    }}
                    dispatch={dispatch}
                />
            );

            expect(wrapper.find(SearchBuilder.View).length).toBe(0);
        });

        it('Filter does not exist and state is Just', () => {
            const wrapper = Enzyme.shallow(
                <Header.View
                    tools={[]}
                    state={{
                        expanded: false,
                        searchBuilder: Just(SearchBuilder.init({ name: Nothing, brewedAfter: Nothing }))
                    }}
                    dispatch={dispatch}
                />
            );

            expect(wrapper.find(SearchBuilder.View).length).toBe(0);
        });

        it('Filter exist and state is Just', () => {
            const wrapper = Enzyme.shallow(
                <Header.View
                    tools={[
                        Header.Filter({ name: Nothing, brewedAfter: Nothing })
                    ]}
                    state={{
                        expanded: false,
                        searchBuilder: Just(SearchBuilder.init({ name: Nothing, brewedAfter: Nothing }))
                    }}
                    dispatch={dispatch}
                />
            );

            expect(wrapper.find(SearchBuilder.View).length).toBe(1);
        });
    });

    describe('renders Navbar.Toggle according state', () => {
        it('menu is not expanded', () => {
            const wrapper = Enzyme.shallow(
                <Header.View
                    tools={[]}
                    state={{
                        expanded: false,
                        searchBuilder: Nothing
                    }}
                    dispatch={dispatch}
                />
            );

            expect(wrapper.find(Navbar).prop('expanded')).toBe(false);
            expect(wrapper.find(Navbar.Toggle).prop('active')).toBe(false);
        });

        it('menu is expanded', () => {
            const wrapper = Enzyme.shallow(
                <Header.View
                    tools={[]}
                    state={{
                        expanded: true,
                        searchBuilder: Nothing
                    }}
                    dispatch={dispatch}
                />
            );

            expect(wrapper.find(Navbar).prop('expanded')).toBe(true);
            expect(wrapper.find(Navbar.Toggle).prop('active')).toBe(true);
        });
    });
});
