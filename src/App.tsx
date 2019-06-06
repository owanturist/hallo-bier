import React from 'react';
import { compose } from 'redux';
import { Cmd } from 'Cmd';
import * as Router from './Router';
import * as HomePage from './HomePage';
import * as BeerPage from './BeerPage';
import * as BeerListPage from './BeerListPage';

export type Action
    = Readonly<{ type: 'ROUTE_CHANGED'; route: Router.Route }>
    | Readonly<{ type: 'ACTION_HOME_PAGE'; action: HomePage.Action }>
    | Readonly<{ type: 'ACTION_BEER_PAGE'; action: BeerPage.Action }>
    | Readonly<{ type: 'ACTION_BEER_LIST_PAGE'; action: BeerListPage.Action }>
    ;

const RouteChanged = (route: Router.Route): Action => ({ type: 'ROUTE_CHANGED', route });
const ActionHomePage = (action: HomePage.Action): Action => ({ type: 'ACTION_HOME_PAGE', action });
const ActionBeerPage = (action: BeerPage.Action): Action => ({ type: 'ACTION_BEER_PAGE', action });
const ActionBeerListPage = (action: BeerListPage.Action): Action => ({ type: 'ACTION_BEER_LIST_PAGE', action });

type Page
    = Readonly<{ type: 'PAGE_VOID' }>
    | Readonly<{ type: 'PAGE_HOME'; state: HomePage.State }>
    | Readonly<{ type: 'PAGE_BEER'; state: BeerPage.State }>
    | Readonly<{ type: 'PAGE_BEER_LIST'; state: BeerListPage.State }>
    ;

const PageVoid: Page = { type: 'PAGE_VOID' };
const PageHome = (state: HomePage.State): Page => ({ type: 'PAGE_HOME', state });
const PageBeer = (state: BeerPage.State): Page => ({ type: 'PAGE_BEER', state });
const PageBeerList = (state: BeerListPage.State): Page => ({ type: 'PAGE_BEER_LIST', state });

const initPage = (route: Router.Route): [ Page, Cmd<Action> ] => {
    switch (route.type) {
        case 'TO_HOME': {
            return [
                PageHome(HomePage.init()),
                Cmd.none
            ];
        }

        case 'TO_BEER': {
            const [ initialBeerPage, cmdOfBeerPage ] = BeerPage.init(route.id);

            return [
                PageBeer(initialBeerPage),
                cmdOfBeerPage.map(ActionBeerPage)
            ];
        }

        case 'TO_BEER_SEARCH': {
            const [ initialBeerList, cmdOfBeerList ] = BeerListPage.init(10, {
                name: route.name,
                brewedAfter: route.brewedAfter
            });

            return [
                PageBeerList(initialBeerList),
                cmdOfBeerList.map(ActionBeerListPage)
            ];
        }
    }
};

export type State = Readonly<{
    page: Page;
}>;

export const init = (): [ State, Cmd<Action> ] => [
    {
        page: PageVoid
    },
    Cmd.none
];

export const update = (action: Action, { page }: State): [ State, Cmd<Action> ] => {
    switch (action.type) {
        case 'ROUTE_CHANGED': {
            const [ nextPage, cmd ] = initPage(action.route);

            return [{ page: nextPage }, cmd ];
        }

        case 'ACTION_HOME_PAGE': {
            if (page.type !== 'PAGE_HOME') {
                return [{ page }, Cmd.none ];
            }

            const [ nextHomePage, cmdOfHome ] = HomePage.update(action.action, page.state);

            return [
                {
                    page: PageHome(nextHomePage)
                },
                cmdOfHome.map(ActionHomePage)
            ];
        }

        case 'ACTION_BEER_PAGE': {
            if (page.type !== 'PAGE_BEER') {
                return [{ page }, Cmd.none ];
            }

            return [
                {
                    page: PageBeer(action.action.update(page.state))
                },
                Cmd.none
            ];
        }

        case 'ACTION_BEER_LIST_PAGE': {
            if (page.type !== 'PAGE_BEER_LIST') {
                return [{ page }, Cmd.none ];
            }

            const [ nextBeerListPage, cmdOfBeerList ] = BeerListPage.update(action.action, page.state);

            return [
                {
                    page: PageBeerList(nextBeerListPage)
                },
                cmdOfBeerList.map(ActionBeerListPage)
            ];
        }
    }
};

const ViewPage: React.FC<{
    page: Page;
    dispatch(action: Action): void;
}> = ({ page, dispatch }) => {
    switch (page.type) {
        case 'PAGE_VOID': {
            return (
                <div>Loading...</div>
            );
        }

        case 'PAGE_HOME': {
            return (
                <HomePage.View
                    state={page.state}
                    dispatch={compose(dispatch, ActionHomePage)}
                />
            );
        }

        case 'PAGE_BEER': {
            return (
                <BeerPage.View
                    state={page.state}
                />
            );
        }

        case 'PAGE_BEER_LIST': {
            return (
                <BeerListPage.View
                    state={page.state}
                    dispatch={compose(dispatch, ActionBeerListPage)}
                />
            );
        }
    }
};

export const View: React.FC<{
    state: State;
    dispatch(action: Action): void;
}> = ({ state, dispatch }) => (
    <Router.View onChange={compose(dispatch, RouteChanged)}>
        <ViewPage page={state.page} dispatch={dispatch} />
    </Router.View>
);
