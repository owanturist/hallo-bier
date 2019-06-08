import React from 'react';
import { compose } from 'redux';
import { Cmd } from 'Cmd';
import { Cata } from 'frctl/dist/src/Basics';
import { Nothing, Just } from 'frctl/dist/src/Maybe';
import Container from 'react-bootstrap/Container';
import * as Utils from './Utils';
import * as Router from './Router';
import * as Header from './Header';
import * as HomePage from './HomePage';
import * as BeerPage from './BeerPage';
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
    PageBeerList(filter: Router.SearchFilter, beerListPage: BeerListPage.State): R;
}>;

abstract class Page {
    public static init(route: Router.Route): [ Page, Cmd<Action> ] {
        return route.cata({
            ToHome: (): [ Page, Cmd<Action> ] => [
                new PageHome(HomePage.init()),
                Cmd.none
            ],

            ToBeer: (beerId): [ Page, Cmd<Action> ] => {
                const [ initialBeerPage, cmdOfBeerPage ] = BeerPage.init(beerId);

                return [
                    new PageBeer(initialBeerPage),
                    cmdOfBeerPage.map(ActionBeerPage.cons)
                ];
            },

            ToBeerSearch: (filter): [ Page, Cmd<Action> ] => {
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

        return [{ ...state, page: nextPage }, cmd ];
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
        const [ nextHeader, cmdOfHeader ] = this.action.update(state.header);

        return [
            { ...state, header: nextHeader },
            cmdOfHeader.map(ActionHeader.cons)
        ];
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
                    { ...state, page: new PageBeerList(filter, nextBeerListPage) },
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
        const filter = state.page.cata({
            PageBeerList: f => Just(f),
            _: () => Nothing
        });

        return (
            <Router.View onChange={compose(dispatch, RouteChanged.cons)}>
                <Header.View
                    filter={filter}
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
