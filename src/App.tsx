import React from 'react';
import { compose } from 'redux';
import * as Router from './Router';
import * as Counter from './Counter';
import * as HomePage from './HomePage';
import * as BeerListPage from './BeerListPage';
import {
    Link
} from 'react-router-dom';
import { Cmd } from 'Cmd';

export type Action
    = Readonly<{ type: 'ROUTE_CHANGED'; route: Router.Route }>
    | Readonly<{ type: 'ACTION_HOME'; action: HomePage.Action }>
    | Readonly<{ type: 'ACTION_BEER_LIST'; action: BeerListPage.Action }>
    | Readonly<{ type: 'ACTION_COUNTER'; action: Counter.Action }>
    ;

const RouteChanged = (route: Router.Route): Action => ({ type: 'ROUTE_CHANGED', route });
const ActionHome = (action: HomePage.Action): Action => ({ type: 'ACTION_HOME', action });
const ActionBeerList = (action: BeerListPage.Action): Action => ({ type: 'ACTION_BEER_LIST', action });
const ActionCounter = (action: Counter.Action): Action => ({ type: 'ACTION_COUNTER', action });

type Page
    = Readonly<{ type: 'PAGE_VOID' }>
    | Readonly<{ type: 'PAGE_HOME'; state: HomePage.State }>
    | Readonly<{ type: 'PAGE_BEER_LIST'; state: BeerListPage.State }>
    | Readonly<{ type: 'PAGE_BEER_ITEM'; state: Counter.State }>
    ;

const PageVoid: Page = { type: 'PAGE_VOID' };
const PageHome = (state: HomePage.State): Page => ({ type: 'PAGE_HOME', state });
const PageBeerList = (state: BeerListPage.State): Page => ({ type: 'PAGE_BEER_LIST', state });
const PageBeerItem = (state: Counter.State): Page => ({ type: 'PAGE_BEER_ITEM', state });

const initPage = (route: Router.Route): [ Page, Cmd<Action> ] => {
    switch (route.type) {
        case 'TO_HOME': {
            return [
                PageHome(HomePage.init()),
                Cmd.none
            ];
        }

        case 'TO_BEER_SEARCH': {
            const [ initialBeerList, cmdOfBeerList ] = BeerListPage.init(10, {
                name: route.name,
                brewedAfter: route.brewedAfter
            });

            return [
                PageBeerList(initialBeerList),
                cmdOfBeerList.map(ActionBeerList)
            ];
        }

        case 'TO_BEER_ITEM': {
            const [ initialCounter, cmdOfCounter ] = Counter.init(route.id);

            return [
                PageBeerItem(initialCounter),
                cmdOfCounter.map(ActionCounter)
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

        case 'ACTION_HOME': {
            if (page.type !== 'PAGE_HOME') {
                return [{ page }, Cmd.none ];
            }

            const [ nextHomePage, cmdOfHome ] = HomePage.update(action.action, page.state);

            return [
                {
                    page: PageHome(nextHomePage)
                },
                cmdOfHome.map(ActionHome)
            ];
        }

        case 'ACTION_BEER_LIST': {
            if (page.type !== 'PAGE_BEER_LIST') {
                return [{ page }, Cmd.none ];
            }

            const [ nextBeerListPage, cmdOfBeerList ] = BeerListPage.update(action.action, page.state);

            return [
                {
                    page: PageBeerList(nextBeerListPage)
                },
                cmdOfBeerList.map(ActionBeerList)
            ];
        }

        case 'ACTION_COUNTER': {
            if (page.type !== 'PAGE_BEER_ITEM') {
                return [{ page }, Cmd.none ];
            }

            const [ nextCounter, cmdOfCounter ] = Counter.update(action.action, page.state);

            return [
                {
                    page: PageBeerItem(nextCounter)
                },
                cmdOfCounter.map(ActionCounter)
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
                    dispatch={compose(dispatch, ActionHome)}
                />
            );
        }

        case 'PAGE_BEER_LIST': {
            return (
                <BeerListPage.View
                    state={page.state}
                    dispatch={compose(dispatch, ActionBeerList)}
                />
            );
        }

        case 'PAGE_BEER_ITEM': {
            return (
                <div>
                    <Link to="/">Go to home</Link>

                    <Counter.View
                        state={page.state}
                        dispatch={compose(dispatch, ActionCounter)}
                    />
                </div>
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
