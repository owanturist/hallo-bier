import React from 'react';
import { compose } from 'redux';
import Container from 'react-bootstrap/Container';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBeer, faHeart } from '@fortawesome/free-solid-svg-icons';
import { Cata } from 'frctl/dist/Basics';
import { Maybe, Nothing, Just } from 'frctl/dist/Maybe';
import Cmd from 'Cmd';
import * as Utils from './Utils';
import * as Router from './Router';
import * as Api from './Api';
import * as Header from './Header';
import * as HomePage from './HomePage';
import * as BeerPage from './BeerPage';
import * as RandomBeerPage from './RandomBeerPage';
import * as SearchBeerPage from './SearchBeerPage';
import * as FavoritesPage from './FavoritesPage';
import * as MonthPicker from './MonthPicker';
import styles from 'App.module.css';

const brewedAfterLimits: {
    minBrewedAfter: MonthPicker.Selected;
    maxBrewedAfter: MonthPicker.Selected;
} = {
    minBrewedAfter: { month: MonthPicker.Month.Sep, year: 0 },
    maxBrewedAfter: { month: MonthPicker.Month.Jul, year: 2019 }
};

const BEERS_PER_PAGE = 10;

type PagePattern<R> = Cata<{
    PageVoid(): R;
    PageHome(homePage: HomePage.State): R;
    PageBeer(beerId: number, beerPage: BeerPage.State): R;
    PageRandomBeer(randomBeerPage: RandomBeerPage.State): R;
    PageSearchBeer(filter: Router.SearchFilter, searchBeerPage: SearchBeerPage.State): R;
    PageFavoritesBeer(filter: Router.SearchFilter, favoritesPage: FavoritesPage.State): R;
}>;

export interface Page {
    cata<R>(pattern: PagePattern<R>): R;
}

export const PageVoid = Utils.inst(class implements Page {
    public cata<R>(pattern: PagePattern<R>): R {
        if (typeof pattern.PageVoid === 'function') {
            return pattern.PageVoid();
        }

        return (pattern._ as () => R)();
    }
});

export const PageHome = Utils.cons(class implements Page {
    public constructor(private readonly homePage: HomePage.State) {}

    public cata<R>(pattern: PagePattern<R>): R {
        if (typeof pattern.PageHome === 'function') {
            return pattern.PageHome(this.homePage);
        }

        return (pattern._ as () => R)();
    }
});

export const PageBeer = Utils.cons(class implements Page {
    public constructor(
        private readonly beerId: number,
        private readonly beerPage: BeerPage.State
    ) {}

    public cata<R>(pattern: PagePattern<R>): R {
        if (typeof pattern.PageBeer === 'function') {
            return pattern.PageBeer(this.beerId, this.beerPage);
        }

        return (pattern._ as () => R)();
    }
});

export const PageRandomBeer = Utils.cons(class implements Page {
    public constructor(private readonly randomBeerPage: RandomBeerPage.State) {}

    public cata<R>(pattern: PagePattern<R>): R {
        if (typeof pattern.PageRandomBeer === 'function') {
            return pattern.PageRandomBeer(this.randomBeerPage);
        }

        return (pattern._ as () => R)();
    }
});

export const PageSearchBeer = Utils.cons(class implements Page {
    public constructor(
        private readonly filter: Router.SearchFilter,
        private readonly searchBeerPage: SearchBeerPage.State
    ) {}

    public cata<R>(pattern: PagePattern<R>): R {
        if (typeof pattern.PageSearchBeer === 'function') {
            return pattern.PageSearchBeer(this.filter, this.searchBeerPage);
        }

        return (pattern._ as () => R)();
    }
});

export const PageFavoritesBeer = Utils.cons(class implements Page {
    public constructor(
        private readonly filter: Router.SearchFilter,
        private readonly favoritesPage: FavoritesPage.State
    ) {}

    public cata<R>(pattern: PagePattern<R>): R {
        if (typeof pattern.PageFavoritesBeer === 'function') {
            return pattern.PageFavoritesBeer(this.filter, this.favoritesPage);
        }

        return (pattern._ as () => R)();
    }
});

export interface State {
    route: Maybe<Router.Route>;
    favorites: Array<number>;
    header: Header.State;
    page: Page;
}

export const init = (): [ State, Cmd<Action> ] => [
    {
        route: Nothing,
        favorites: [],
        header: Header.init(),
        page: PageVoid
    },
    Api.getListOfFavorites().map(GetListOfFavorites)
];

const setFavorites = (checked: boolean, beerId: number, state: State): [ State, Cmd<Action> ] => {
    const nextFavorites = checked
        ? [ beerId, ...state.favorites ]
        : state.favorites.filter(id => beerId !== id);

    return [
        { ...state, favorites: nextFavorites },
        Api.setListOfFavorites(nextFavorites)
    ];
};

export interface Action extends Utils.Action<[ State ], [ State, Cmd<Action> ]> {}

export const RouteChanged = Utils.cons(class implements Action {
    public constructor(private readonly route: Router.Route) {}

    public update(state: State): [ State, Cmd<Action> ] {
        if (state.route.map(route => route.isEqual(this.route)).getOrElse(false)) {
            return [ state, Cmd.none ];
        }

        const nextState = { ...state, route: Just(this.route) };

        return this.route.cata<[ State, Cmd<Action> ]>({
            ToHome: () => {
                const [ initialHomePage, cmdOfHomePage ] = HomePage.init(BEERS_PER_PAGE);

                return [
                    {
                        ...nextState,
                        page: PageHome(initialHomePage)
                    },
                    cmdOfHomePage.map(HomePageAction)
                ];
            },

            ToBeer: beerId => {
                return nextState.page.cata({
                    PageRandomBeer: RandomBeerPage.getBeer,
                    PageHome: homePage => HomePage.getBeer(beerId, homePage),
                    PageSearchBeer: (_filter, searchBeerPage) => SearchBeerPage.getBeer(beerId, searchBeerPage),
                    PageFavoritesBeer: (_filter, favoritesPage) => FavoritesPage.getBeer(beerId, favoritesPage),
                    _: () => Nothing
                }).cata<[ State, Cmd<Action> ]>({
                    Nothing: () => {
                        const [ initialBeerPage, cmdOfBeerPage ] = BeerPage.init(beerId);

                        return [
                            {
                                ...nextState,
                                page: PageBeer(beerId, initialBeerPage)
                            },
                            cmdOfBeerPage.map(BeerPageAction)
                        ];
                    },

                    Just: beer => {
                        return [
                            {
                                ...nextState,
                                page: PageBeer(beer.id, BeerPage.initWithBeer(beer))
                            },
                            Cmd.none
                        ];
                    }
                });
            },

            ToRandomBeer: () => {
                const [ initialRandomBeerPage, cmdOfRandomBeerPage ] = RandomBeerPage.init();

                return [
                    {
                        ...nextState,
                        page: PageRandomBeer(initialRandomBeerPage)
                    },
                    cmdOfRandomBeerPage.map(RandomBeerPageAction)
                ];
            },

            ToBeerSearch: filter => {
                const [ initialSeachBeerPage, cmdOfSearchBeerPage ] = SearchBeerPage.init(filter, BEERS_PER_PAGE);

                return [
                    {
                        ...nextState,
                        page: PageSearchBeer(filter, initialSeachBeerPage)
                    },
                    cmdOfSearchBeerPage.map(SearchBeerPageAction)
                ];
            },

            ToFavorites: filter => {
                const [ initialFavoritesPage, cmdOfFavoritesPage ] = FavoritesPage.init(
                    filter,
                    nextState.favorites,
                    BEERS_PER_PAGE
                );

                return [
                    {
                        ...nextState,
                        page: PageFavoritesBeer(filter, initialFavoritesPage)
                    },
                    cmdOfFavoritesPage.map(FavoritesPageAction)
                ];
            }
        });
    }
});

export const GetListOfFavorites = Utils.cons(class implements Action {
    public constructor(private readonly favorites: Array<number>) {}

    public update(state: State): [ State, Cmd<Action> ] {
        return [
            { ...state, favorites: this.favorites },
            Cmd.none
        ];
    }
});

export const HeaderAction = Utils.cons(class implements Action {
    public constructor(private readonly action: Header.Action) {}

    public update(state: State): [ State, Cmd<Action> ] {
        return  this.action.update(state.header).cata<[ State, Cmd<Action> ]>({
            Update: nextHeader => [
                { ...state, header: nextHeader },
                Cmd.none
            ],

            RollRandomBeer: () => {
                const [ initialRandomBeerPage, cmdOfRandomBeerPage ] = RandomBeerPage.init();

                return [
                    {
                        ...state,
                        page: PageRandomBeer(initialRandomBeerPage)
                    },
                    cmdOfRandomBeerPage.map(RandomBeerPageAction)
                ];
            },

            SetFavorites: (checked, beerId) => setFavorites(checked, beerId, state),

            SetFilters: filters => [
                state,
                state.page.cata({
                    PageSearchBeer: () => Router.ToBeerSearch(filters).push(),
                    PageFavoritesBeer: () => Router.ToFavorites(filters).push(),
                    _: () => Cmd.none
                })
            ]
        });
    }
});

export const HomePageAction = Utils.cons(class implements Action {
    public constructor(private readonly action: HomePage.Action) {}

    public update(state: State): [ State, Cmd<Action> ] {
        return state.page.cata<[ State, Cmd<Action> ]>({
            PageHome: homePage => {
                return this.action.update(homePage)
                    .cata<[ State, Cmd<Action> ]>({
                        Update: (nextHomePage, cmdOfHomePage) => [
                            {
                                ...state,
                                page: PageHome(nextHomePage)
                            },
                            cmdOfHomePage.map(HomePageAction)
                        ],

                        SetFavorites: (checked, beerId) => setFavorites(checked, beerId, state)
                    });
            },

            _: () => [ state, Cmd.none ]
        });
    }
});

export const BeerPageAction = Utils.cons(class implements Action {
    public constructor(private readonly action: BeerPage.Action) {}

    public update(state: State): [ State, Cmd<Action> ] {
        return state.page.cata<[ State, Cmd<Action> ]>({
            PageBeer: (beerId, beerPage) => {
                return [
                    { ...state, page: PageBeer(beerId, this.action.update(beerPage)) },
                    Cmd.none
                ];
            },

            _: () => [ state, Cmd.none ]
        });
    }
});

export const RandomBeerPageAction = Utils.cons(class implements Action {
    public constructor(private readonly action: RandomBeerPage.Action) {}

    public update(state: State): [ State, Cmd<Action> ] {
        return state.page.cata<[ State, Cmd<Action> ]>({
            PageRandomBeer: randomBeerPage => {
                const [ nextRandomBeerPage, cmdOfRandomBeerPage ] = this.action.update(randomBeerPage);

                return [
                    { ...state, page: PageRandomBeer(nextRandomBeerPage) },
                    cmdOfRandomBeerPage.map(RandomBeerPageAction)
                ];
            },

            _: () => [ state, Cmd.none ]
        });
    }
});

export const SearchBeerPageAction = Utils.cons(class implements Action {
    public constructor(private readonly action: SearchBeerPage.Action) {}

    public update(state: State): [ State, Cmd<Action> ] {
        return state.page.cata<[ State, Cmd<Action> ]>({
            PageSearchBeer: (filter, searchBeerPage) => this.action.update(filter, searchBeerPage)
                .cata<[ State, Cmd<Action> ]>({
                    Update: (nextSearchBeerPage, cmdOfSearchBeerPage) => [
                        {
                            ...state,
                            header: SearchBeerPage.isEmpty(nextSearchBeerPage)
                                ? Header.showSearchBuilder(filter, state.header)
                                : state.header,
                            page: PageSearchBeer(filter, nextSearchBeerPage)
                        },
                        cmdOfSearchBeerPage.map(SearchBeerPageAction)
                    ],

                    SetFavorites: (checked, beerId) => setFavorites(checked, beerId, state)
                }),

            _: () => [ state, Cmd.none ]
        });
    }
});

export const FavoritesPageAction = Utils.cons(class implements Action {
    public constructor(private readonly action: FavoritesPage.Action) {}

    public update(state: State): [ State, Cmd<Action> ] {
        return state.page.cata<[ State, Cmd<Action> ]>({
            PageFavoritesBeer: (filter, favoritesPage) => this.action.update(
                filter,
                favoritesPage
            ).cata<[ State, Cmd<Action> ]>({
                Update: (nextFavoritesPage, cmdOfFavoritesPage) => [
                    {
                        ...state,
                        header: FavoritesPage.isEmpty(nextFavoritesPage)
                            ? Header.showSearchBuilder(filter, state.header)
                            : state.header,
                        page: PageFavoritesBeer(filter, nextFavoritesPage)
                    },
                    cmdOfFavoritesPage.map(FavoritesPageAction)
                ],

                SetFavorites: (checked, beerId) => setFavorites(checked, beerId, state)
            }),

            _: () => [ state, Cmd.none ]
        });
    }
});

const PageView: React.FC<{
    scroller: React.RefObject<HTMLDivElement>;
    favorites: Set<number>;
    page: Page;
    dispatch(action: Action): void;
}> = ({ scroller, favorites, page, dispatch }) => page.cata({
    PageVoid: () => null,

    PageHome: homePage => (
        <HomePage.View
            scroller={scroller}
            favorites={favorites}
            state={homePage}
            dispatch={compose(dispatch, HomePageAction)}
            {...brewedAfterLimits}
        />
    ),

    PageBeer: (_beerId, beerPage) => (
        <BeerPage.View state={beerPage} />
    ),

    PageRandomBeer: randomBeerPage => (
        <RandomBeerPage.View state={randomBeerPage} />
    ),

    PageSearchBeer: (_filter, searchBeerPage) => (
        <SearchBeerPage.View
            scroller={scroller}
            favorites={favorites}
            state={searchBeerPage}
            dispatch={compose(dispatch, SearchBeerPageAction)}
        />
    ),

    PageFavoritesBeer: (_filter, favoritesPage) => (
        <FavoritesPage.View
            scroller={scroller}
            favorites={favorites}
            state={favoritesPage}
            dispatch={compose(dispatch, FavoritesPageAction)}
        />
    )
});

export class View extends React.PureComponent<{
    state: State;
    dispatch(action: Action): void;
}> {
    private readonly scroller = React.createRef<HTMLDivElement>();

    public render() {
        const { state, dispatch } = this.props;
        const favoritesSet = new Set(state.favorites);
        const headerTools = state.page.cata({
            PageBeer: beerId => [
                Header.Favorite(favoritesSet, Just(beerId))
            ],
            PageRandomBeer: randomBeer => [
                Header.Roll(RandomBeerPage.isLoading(randomBeer)),
                Header.Favorite(favoritesSet, randomBeer.beer.map(beer => beer.id).toMaybe())
            ],
            PageSearchBeer: filter => [
                Header.Filter(filter)
            ],
            PageFavoritesBeer: filter => state.favorites.length > 1 ? [
                Header.Filter(filter)
            ] : [],
            _: () => []
        });

        return (
            <Router.View onChange={compose(dispatch, RouteChanged)}>
                <Header.View
                    tools={headerTools}
                    state={state.header}
                    dispatch={compose(dispatch, HeaderAction)}
                    {...brewedAfterLimits}
                />

                <div className={`bg-light ${styles.scroller}`} ref={this.scroller}>
                    <Container fluid className={`bg-white pt-3 ${styles.container}`}>
                        <PageView
                            scroller={this.scroller}
                            favorites={favoritesSet}
                            page={state.page}
                            dispatch={dispatch}
                        />

                    </Container>

                    <Container
                        fluid
                        as="footer"
                        className={`bg-dark text-secondary py-2 text-center fixed-bottom ${styles.footer}`}
                    >
                        Made with
                        <FontAwesomeIcon icon={faHeart} className="mx-2 text-danger" />
                        and
                        <FontAwesomeIcon icon={faBeer} className="mx-2 text-warning" />
                        by{' '}
                        <a
                            href="https://github.com/owanturist"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-secondary"
                        >Ovechkin Anton</a>
                    </Container>
                </div>
            </Router.View>
        );
    }
}
