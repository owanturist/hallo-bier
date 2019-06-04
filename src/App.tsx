import React from 'react';
import { compose } from 'redux';
import * as Router from './Router';
import * as Counter from './Counter';
import * as BeerList from './BeerList';
import {
    Link
} from 'react-router-dom';
import { Cmd } from 'Cmd';

export type Action
    = Readonly<{ type: 'ROUTE_CHANGED'; route: Router.Route }>
    | Readonly<{ type: 'BEER_LIST_ACTION'; action: BeerList.Action }>
    | Readonly<{ type: 'COUNTER_ACTION'; action: Counter.Action }>
    ;

const RouteChanged = (route: Router.Route): Action => ({ type: 'ROUTE_CHANGED', route });
const BeerListAction = (action: BeerList.Action): Action => ({ type: 'BEER_LIST_ACTION', action });
const CounterAction = (msg: Counter.Action): Action => ({ type: 'COUNTER_ACTION', action: msg });

type Page
    = Readonly<{ type: 'VOID_PAGE' }>
    | Readonly<{ type: 'BEER_LIST_PAGE'; beerListPage: BeerList.State }>
    | Readonly<{ type: 'BEER_ITEM_PAGE'; counter: Counter.State }>
    ;

const VoidPage: Page = { type: 'VOID_PAGE' };
const BeerListPage = (beerListPage: BeerList.State): Page => ({ type: 'BEER_LIST_PAGE', beerListPage });
const BeerItemPage = (counter: Counter.State): Page => ({ type: 'BEER_ITEM_PAGE', counter });

const initPage = (route: Router.Route): [ Page, Cmd<Action> ] => {
    switch (route.type) {
        case 'TO_BEER_LIST': {
            const [ initialBeerList, cmdOfBeerList ] = BeerList.init();

            return [
                BeerListPage(initialBeerList),
                cmdOfBeerList.map(BeerListAction)
            ];
        }

        case 'TO_BEER_ITEM': {
            const [ initialCounter, cmdOfCounter ] = Counter.init(route.id);

            return [
                BeerItemPage(initialCounter),
                cmdOfCounter.map(CounterAction)
            ];
        }
    }
};

export type State = Readonly<{
    page: Page;
}>;

export const init = (): [ State, Cmd<Action> ] => [
    {
        page: VoidPage
    },
    Cmd.none
];

export const update = (action: Action, { page }: State): [ State, Cmd<Action> ] => {
    switch (action.type) {
        case 'ROUTE_CHANGED': {
            const [ nextPage, cmd ] = initPage(action.route);

            return [{ page: nextPage }, cmd ];
        }

        case 'BEER_LIST_ACTION': {
            if (page.type !== 'BEER_LIST_PAGE') {
                return [{ page }, Cmd.none ];
            }

            const [ nextBeerListPage, cmdOfBeerList ] = BeerList.update(action.action, page.beerListPage);

            return [
                {
                    page: BeerListPage(nextBeerListPage)
                },
                cmdOfBeerList.map(BeerListAction)
            ];
        }

        case 'COUNTER_ACTION': {
            if (page.type !== 'BEER_ITEM_PAGE') {
                return [{ page }, Cmd.none ];
            }

            const [ nextCounter, cmdOfCounter ] = Counter.update(action.action, page.counter);

            return [
                {
                    page: BeerItemPage(nextCounter)
                },
                cmdOfCounter.map(CounterAction)
            ];
        }
    }
};

const ViewPage: React.FC<{
    page: Page;
    dispatch(action: Action): void;
}> = ({ page, dispatch }) => {
    switch (page.type) {
        case 'VOID_PAGE': {
            return (
                <div>Loading...</div>
            );
        }

        case 'BEER_LIST_PAGE': {
            return (
                <BeerList.View
                    state={page.beerListPage}
                    dispatch={compose(dispatch, BeerListAction)}
                />
            );
        }

        case 'BEER_ITEM_PAGE': {
            return (
                <div>
                    <Link to="/">Go to home</Link>

                    <Counter.View
                        state={page.counter}
                        dispatch={compose(dispatch, CounterAction)}
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
    <div>
        <Router.View onChange={compose(dispatch, RouteChanged)}/>
        <ViewPage page={state.page} dispatch={dispatch} />
    </div>
);
