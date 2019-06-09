import React from 'react';
import { compose } from 'redux';
import { Cmd } from 'Cmd';
import { Cata } from 'frctl/dist/src/Basics';
import Container from 'react-bootstrap/Container';
import * as Utils from './Utils';
import * as Router from './Router';
import * as Header from './Header';
import * as HomePage from './HomePage';
import * as BeerPage from './BeerPage';
import * as RandomBeerPage from './RandomBeerPage';
import * as BeerListPage from './BeerListPage';
import { Month } from './MonthPicker';
import styles from 'App.module.css';

const brewedAfterLimits: {
    minBrewedAfter: [ Month, number ];
    maxBrewedAfter: [ Month, number ];
} = {
    minBrewedAfter: [ Month.Sep, 0 ],
    maxBrewedAfter: [ Month.Jul, 2019 ]
};

type PagePattern<R> = Cata<{
    PageVoid(): R;
    PageHome(homePage: HomePage.State): R;
    PageBeer(beerPage: BeerPage.State): R;
    PageRandomBeer(randomBeerPage: RandomBeerPage.State): R;
    PageBeerList(filter: Router.SearchFilter, beerListPage: BeerListPage.State): R;
}>;

abstract class Page {
    public static init(route: Router.Route): [ Page, Cmd<Action> ] {
        return route.cata<[ Page, Cmd<Action> ]>({
            ToHome: () => [
                new PageHome(HomePage.init()),
                Cmd.none
            ],

            ToBeer: beerId => {
                const [ initialBeerPage, cmdOfBeerPage ] = BeerPage.init(beerId);

                return [
                    new PageBeer(initialBeerPage),
                    cmdOfBeerPage.map(ActionBeerPage.cons)
                ];
            },

            ToRandomBeer: () => {
                const [ initialRandomBeerPage, cmdOfRandomBeerPage ] = RandomBeerPage.init();

                return [
                    new PageRandomBeer(initialRandomBeerPage),
                    cmdOfRandomBeerPage.map(ActionRandomBeerPage.cons)
                ];
            },

            ToBeerSearch: filter => {
                const [ initialBeerList, cmdOfBeerList ] = BeerListPage.init(10, filter);

                return [
                    new PageBeerList(filter, initialBeerList),
                    cmdOfBeerList.map(ActionBeerListPage.cons)
                ];
            }
        });
    }

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
    public constructor(private readonly beerPage: BeerPage.State) {
        super();
    }

    public cata<R>(pattern: PagePattern<R>): R {
        if (typeof pattern.PageBeer === 'function') {
            return pattern.PageBeer(this.beerPage);
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

class PageBeerList extends Page {
    public constructor(
        private readonly filter: Router.SearchFilter,
        private readonly beerListPage: BeerListPage.State
    ) {
        super();
    }

    public cata<R>(pattern: PagePattern<R>): R {
        if (typeof pattern.PageBeerList === 'function') {
            return pattern.PageBeerList(this.filter, this.beerListPage);
        }

        return (pattern._ as () => R)();
    }
}

export interface State {
    header: Header.State;
    page: Page;
}

export const init = (): [ State, Cmd<Action> ] => [
    {
        header: Header.init(),
        page: new VoidPage()
    },
    Cmd.none
];

export abstract class Action extends Utils.Action<[ State ], [ State, Cmd<Action> ]> {}

class RouteChanged extends Action {
    public static cons(route: Router.Route): Action {
        return new RouteChanged(route);
    }

    private constructor(private readonly route: Router.Route) {
        super();
    }

    public update(state: State): [ State, Cmd<Action> ] {
        const [ nextPage, cmd ] = Page.init(this.route);
        const nextHeader = this.route.cata({
            ToBeerSearch: () => state.header,
            _: () => Header.hideSearchBuilder(state.header)
        });

        return [{ header: nextHeader, page: nextPage }, cmd ];
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
            Idle: () => [ state, Cmd.none ],

            Update: (nextHeader, cmdOfHeader) => [
                { ...state, header: nextHeader },
                cmdOfHeader.map(ActionHeader.cons)
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
            }
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
                const [ nextHomePage, cmdOfHomePage ] = this.action.update(homePage);

                return [
                    { ...state, page: new PageHome(nextHomePage) },
                    cmdOfHomePage.map(ActionHomePage.cons)
                ];
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
            PageBeer: beerPage => {
                return [
                    { ...state, page: new PageBeer(this.action.update(beerPage)) },
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

class ActionBeerListPage extends Action {
    public static cons(action: BeerListPage.Action): Action {
        return new ActionBeerListPage(action);
    }

    private constructor(private readonly action: BeerListPage.Action) {
        super();
    }

    public update(state: State): [ State, Cmd<Action> ] {
        return state.page.cata<[ State, Cmd<Action> ]>({
            PageBeerList: (filter, beerListPage) => {
                const [ nextBeerListPage, cmdOfBeerListPage ] = this.action.update(filter, beerListPage);

                return [
                    {
                        header: BeerListPage.isEmpty(nextBeerListPage)
                            ? Header.showSearchBuilder(filter, state.header)
                            : state.header,
                        page: new PageBeerList(filter, nextBeerListPage)
                    },
                    cmdOfBeerListPage.map(ActionBeerListPage.cons)
                ];
            },

            _: () => [ state, Cmd.none ]
        });
    }
}

const PageView: React.FC<{
    scroller: React.RefObject<HTMLDivElement>;
    page: Page;
    dispatch(action: Action): void;
}> = ({ scroller, page, dispatch }) => page.cata({
    PageVoid: () => null,

    PageHome: homePage => (
        <HomePage.View
            state={homePage}
            dispatch={compose(dispatch, ActionHomePage.cons)}
            {...brewedAfterLimits}
        />
    ),

    PageBeer: beerPage => (
        <BeerPage.View state={beerPage} />
    ),

    PageRandomBeer: randomBeerPage => (
        <RandomBeerPage.View state={randomBeerPage} />
    ),

    PageBeerList: (_filter, beerListPage) => (
        <BeerListPage.View
            scroller={scroller}
            state={beerListPage}
            dispatch={compose(dispatch, ActionBeerListPage.cons)}
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
        const headerTools = state.page.cata({
            PageBeer: () => [
                Header.Tool.Favorite(true)
            ],
            PageRandomBeer: randomBeer => [
                Header.Tool.Roll(RandomBeerPage.isLoading(randomBeer)),
                Header.Tool.Favorite(true)
            ],
            PageBeerList: filter => [
                Header.Tool.Filter(filter)
            ],
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
                            page={state.page}
                            dispatch={dispatch}
                        />
                    </Container>
                </div>
            </Router.View>
        );
    }
}
