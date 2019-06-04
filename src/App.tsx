import React from 'react';
import { compose } from 'redux';
import * as Counter from './Counter';
import * as Router from './Router';
import {
    Link
} from 'react-router-dom';

export type Action
    = Readonly<{ type: 'ROUTE_CHANGED'; route: Router.Route }>
    | Readonly<{ type: 'COUNTER_ACTION'; msg: Counter.Action }>
    ;

const RouteChanged = (route: Router.Route): Action => ({ type: 'ROUTE_CHANGED', route });
const CounterAction = (msg: Counter.Action): Action => ({ type: 'COUNTER_ACTION', msg });

type Page
    = Readonly<{ type: 'VOID_PAGE' }>
    | Readonly<{ type: 'BEER_LIST_PAGE'; counter: Counter.State }>
    | Readonly<{ type: 'BEER_ITEM_PAGE'; counter: Counter.State }>
    ;

const VoidPage: Page = { type: 'VOID_PAGE' };
const BeerListPage = (counter: Counter.State): Page => ({ type: 'BEER_LIST_PAGE', counter });
const BeerItemPage = (counter: Counter.State): Page => ({ type: 'BEER_ITEM_PAGE', counter });

const initPage = (route: Router.Route): Page => {
    switch (route.type) {
        case 'TO_BEER_LIST': {
            return BeerListPage(Counter.init(0));
        }

        case 'TO_BEER_ITEM': {
            return BeerItemPage(Counter.init(route.id));
        }
    }
};

export type State = Readonly<{
    page: Page;
}>;

export const initial: State = {
    page: VoidPage
};

export const update = (action: Action, { page }: State): State => {
    switch (action.type) {
        case 'ROUTE_CHANGED': {
            return {
                page: initPage(action.route)
            };
        }

        case 'COUNTER_ACTION': {
            switch (page.type) {
                case 'BEER_LIST_PAGE': {
                    return {
                        page: BeerListPage(
                            Counter.update(action.msg, page.counter)
                        )
                    };
                }

                case 'BEER_ITEM_PAGE': {
                    return {
                        page: BeerItemPage(
                            Counter.update(action.msg, page.counter)
                        )
                    };
                }
                default: {
                    return { page };
                }
            }
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
                <div>
                    <Link to={`/beer/${page.counter.count}`}>
                        Go to counter starts with {page.counter.count}
                    </Link>

                    <Counter.View
                        state={page.counter}
                        dispatch={compose(dispatch, CounterAction)}
                    />
                </div>
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
