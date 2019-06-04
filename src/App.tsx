import React from 'react';
import { compose } from 'redux';
import * as Counter from './Counter';
import * as Router from './Router';
import {
    Link
} from 'react-router-dom';
import { Cmd } from 'Cmd';

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

const initPage = (route: Router.Route): [ Page, Cmd<Action> ] => {
    switch (route.type) {
        case 'TO_BEER_LIST': {
            const [ initialCounter, cmdOfCounter ] = Counter.init(0);

            return [
                BeerListPage(initialCounter),
                cmdOfCounter.map(CounterAction)
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
            const [ page, cmd ] = initPage(action.route);

            return [ { page }, cmd ];
        }

        case 'COUNTER_ACTION': {
            switch (page.type) {
                case 'BEER_LIST_PAGE': {
                    const [ nextCounter, cmdOfCounter ] = Counter.update(action.msg, page.counter);

                    return [
                        {
                            page: BeerListPage(nextCounter)
                        },
                        cmdOfCounter.map(CounterAction)
                    ];
                }

                case 'BEER_ITEM_PAGE': {
                    const [ nextCounter, cmdOfCounter ] = Counter.update(action.msg, page.counter);

                    return [
                        {
                            page: BeerItemPage(nextCounter)
                        },
                        cmdOfCounter.map(CounterAction)
                    ];
                }
                default: {
                    return [ { page }, Cmd.none ];
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
