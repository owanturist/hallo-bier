import React from 'react';
import { compose } from 'redux';
import Container from 'react-bootstrap/Container';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBeer, faHeart } from '@fortawesome/free-solid-svg-icons';
import { Cata } from 'frctl/dist/Basics';
import { Maybe, Nothing, Just } from 'frctl/dist/Maybe';
import { Cmd } from 'Cmd';
import * as Utils from './Utils';
import * as Router from './Router';
import * as Api from './Api';
import * as Header from './Header';
import * as HomePage from './HomePage';
import * as BeerPage from './BeerPage';
import * as RandomBeerPage from './RandomBeerPage';
import * as SearchBeerPage from './SearchBeerPage';
import * as FavoritesPage from './FavoritesPage';
import { Month } from './MonthPicker';
import styles from 'App.module.css';

const brewedAfterLimits: {
    minBrewedAfter: [ Month, number ];
    maxBrewedAfter: [ Month, number ];
} = {
    minBrewedAfter: [ Month.Sep, 0 ],
    maxBrewedAfter: [ Month.Jul, 2019 ]
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

abstract class Page {
    public abstract cata<R>(pattern: PagePattern<R>): R;
}

class VoidPage extends Page {
    public cata<R>(pattern: PagePattern<R>): R {
        if (typeof pattern.PageVoid === 'function') {
            return pattern.PageVoid();
        }

        return (pattern._ as () => R)();
    }
}

class PageHome extends Page {
    public constructor(private readonly homePage: HomePage.State) {
        super();
    }

    public cata<R>(pattern: PagePattern<R>): R {
        if (typeof pattern.PageHome === 'function') {
            return pattern.PageHome(this.homePage);
        }

        return (pattern._ as () => R)();
    }
}

class PageBeer extends Page {
    public constructor(
        private readonly beerId: number,
        private readonly beerPage: BeerPage.State
    ) {
        super();
    }

    public cata<R>(pattern: PagePattern<R>): R {
        if (typeof pattern.PageBeer === 'function') {
            return pattern.PageBeer(this.beerId, this.beerPage);
        }

        return (pattern._ as () => R)();
    }
}

class PageRandomBeer extends Page {
    public constructor(private readonly randomBeerPage: RandomBeerPage.State) {
        super();
    }

    public cata<R>(pattern: PagePattern<R>): R {
        if (typeof pattern.PageRandomBeer === 'function') {
            return pattern.PageRandomBeer(this.randomBeerPage);
        }

        return (pattern._ as () => R)();
    }
}

class PageSearchBeer extends Page {
    public constructor(
        private readonly filter: Router.SearchFilter,
        private readonly searchBeerPage: SearchBeerPage.State
    ) {
        super();
    }

    public cata<R>(pattern: PagePattern<R>): R {
        if (typeof pattern.PageSearchBeer === 'function') {
            return pattern.PageSearchBeer(this.filter, this.searchBeerPage);
        }

        return (pattern._ as () => R)();
    }
}

class PageFavoritesBeer extends Page {
    public constructor(
        private readonly filter: Router.SearchFilter,
        private readonly favoritesPage: FavoritesPage.State
    ) {
        super();
    }

    public cata<R>(pattern: PagePattern<R>): R {
        if (typeof pattern.PageFavoritesBeer === 'function') {
            return pattern.PageFavoritesBeer(this.filter, this.favoritesPage);
        }

        return (pattern._ as () => R)();
    }
}


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
        page: new VoidPage()
    },
    Api.getListOfFavorites().map(GetListOfFavorites.cons)
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

export abstract class Action extends Utils.Action<[ State ], [ State, Cmd<Action> ]> {}

class RouteChanged extends Action {
    public static cons(route: Router.Route): Action {
        return new RouteChanged(route);
    }

    private constructor(private readonly route: Router.Route) {
        super();
    }

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
                        page: new PageHome(initialHomePage)
                    },
                    cmdOfHomePage.map(ActionHomePage.cons)
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
                                page: new PageBeer(beerId, initialBeerPage)
                            },
                            cmdOfBeerPage.map(ActionBeerPage.cons)
                        ];
                    },

                    Just: beer => {
                        return [
                            {
                                ...nextState,
                                page: new PageBeer(beer.id, BeerPage.initWithBeer(beer))
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
                        page: new PageRandomBeer(initialRandomBeerPage)
                    },
                    cmdOfRandomBeerPage.map(ActionRandomBeerPage.cons)
                ];
            },

            ToBeerSearch: filter => {
                const [ initialSeachBeerPage, cmdOfSearchBeerPage ] = SearchBeerPage.init(filter, BEERS_PER_PAGE);

                return [
                    {
                        ...nextState,
                        page: new PageSearchBeer(filter, initialSeachBeerPage)
                    },
                    cmdOfSearchBeerPage.map(ActionSearchBeerPage.cons)
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
                        page: new PageFavoritesBeer(filter, initialFavoritesPage)
                    },
                    cmdOfFavoritesPage.map(ActionFavoritesPage.cons)
                ];
            }
        });
    }
}

class GetListOfFavorites extends Action {
    public static cons(favorites: Array<number>): Action {
        return new GetListOfFavorites(favorites);
    }

    private constructor(private readonly favorites: Array<number>) {
        super();
    }

    public update(state: State): [ State, Cmd<Action> ] {
        return [
            { ...state, favorites: this.favorites },
            Cmd.none
        ];
    }
}

class ActionHeader extends Action {
    public static cons(action: Header.Action): Action {
        return new ActionHeader(action);
    }

    private constructor(private readonly action: Header.Action) {
        super();
    }

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
                        page: new PageRandomBeer(initialRandomBeerPage)
                    },
                    cmdOfRandomBeerPage.map(ActionRandomBeerPage.cons)
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
}

class ActionHomePage extends Action {
    public static cons(action: HomePage.Action): Action {
        return new ActionHomePage(action);
    }

    private constructor(private readonly action: HomePage.Action) {
        super();
    }

    public update(state: State): [ State, Cmd<Action> ] {
        return state.page.cata<[ State, Cmd<Action> ]>({
            PageHome: homePage => {
                return this.action.update(homePage)
                    .cata<[ State, Cmd<Action> ]>({
                        Update: (nextHomePage, cmdOfHomePage) => [
                            {
                                ...state,
                                page: new PageHome(nextHomePage)
                            },
                            cmdOfHomePage.map(ActionHomePage.cons)
                        ],

                        SetFavorites: (checked, beerId) => setFavorites(checked, beerId, state)
                    });
            },

            _: () => [ state, Cmd.none ]
        });
    }
}

class ActionBeerPage extends Action {
    public static cons(action: BeerPage.Action): Action {
        return new ActionBeerPage(action);
    }

    private constructor(private readonly action: BeerPage.Action) {
        super();
    }

    public update(state: State): [ State, Cmd<Action> ] {
        return state.page.cata<[ State, Cmd<Action> ]>({
            PageBeer: (beerId, beerPage) => {
                return [
                    { ...state, page: new PageBeer(beerId, this.action.update(beerPage)) },
                    Cmd.none
                ];
            },

            _: () => [ state, Cmd.none ]
        });
    }
}

class ActionRandomBeerPage extends Action {
    public static cons(action: RandomBeerPage.Action): Action {
        return new ActionRandomBeerPage(action);
    }

    private constructor(private readonly action: RandomBeerPage.Action) {
        super();
    }

    public update(state: State): [ State, Cmd<Action> ] {
        return state.page.cata<[ State, Cmd<Action> ]>({
            PageRandomBeer: randomBeerPage => {
                const [ nextRandomBeerPage, cmdOfRandomBeerPage ] = this.action.update(randomBeerPage);

                return [
                    { ...state, page: new PageRandomBeer(nextRandomBeerPage) },
                    cmdOfRandomBeerPage.map(ActionRandomBeerPage.cons)
                ];
            },

            _: () => [ state, Cmd.none ]
        });
    }
}

class ActionSearchBeerPage extends Action {
    public static cons(action: SearchBeerPage.Action): Action {
        return new ActionSearchBeerPage(action);
    }

    private constructor(private readonly action: SearchBeerPage.Action) {
        super();
    }

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
                            page: new PageSearchBeer(filter, nextSearchBeerPage)
                        },
                        cmdOfSearchBeerPage.map(ActionSearchBeerPage.cons)
                    ],

                    SetFavorites: (checked, beerId) => setFavorites(checked, beerId, state)
                }),

            _: () => [ state, Cmd.none ]
        });
    }
}

class ActionFavoritesPage extends Action {
    public static cons(action: FavoritesPage.Action): Action {
        return new ActionFavoritesPage(action);
    }

    private constructor(private readonly action: FavoritesPage.Action) {
        super();
    }

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
                        page: new PageFavoritesBeer(filter, nextFavoritesPage)
                    },
                    cmdOfFavoritesPage.map(ActionFavoritesPage.cons)
                ],

                SetFavorites: (checked, beerId) => setFavorites(checked, beerId, state)
            }),

            _: () => [ state, Cmd.none ]
        });
    }
}

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
            dispatch={compose(dispatch, ActionHomePage.cons)}
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
            dispatch={compose(dispatch, ActionSearchBeerPage.cons)}
        />
    ),

    PageFavoritesBeer: (_filter, favoritesPage) => (
        <FavoritesPage.View
            scroller={scroller}
            favorites={favorites}
            state={favoritesPage}
            dispatch={compose(dispatch, ActionFavoritesPage.cons)}
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
                Header.Tool.Favorite(favoritesSet, Just(beerId))
            ],
            PageRandomBeer: randomBeer => [
                Header.Tool.Roll(RandomBeerPage.isLoading(randomBeer)),
                Header.Tool.Favorite(favoritesSet, randomBeer.beer.map(beer => beer.id).toMaybe())
            ],
            PageSearchBeer: filter => [
                Header.Tool.Filter(filter)
            ],
            PageFavoritesBeer: filter => state.favorites.length > 1 ? [
                Header.Tool.Filter(filter)
            ] : [],
            _: () => []
        });

        return (
            <Router.View onChange={compose(dispatch, RouteChanged.cons)}>
                <Header.View
                    tools={headerTools}
                    state={state.header}
                    dispatch={compose(dispatch, ActionHeader.cons)}
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
