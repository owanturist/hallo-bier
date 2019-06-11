import React from 'react';
import ReactDOM from 'react-dom';
import { Provider, connect } from 'react-redux';
import { createStore, compose } from 'redux';
import * as App from './App';
import './index.css';
import 'bootstrap/dist/css/bootstrap.css';
import { Cmd, Done } from 'Cmd';

const reduxDevtools = process.env.NODE_ENV !== 'production'
    && (window as any).__REDUX_DEVTOOLS_EXTENSION__
    && (window as any).__REDUX_DEVTOOLS_EXTENSION__();

interface Action {
    type: 'Action';
    payload: App.Action;
}

const Action = (payload: App.Action): Action => ({ type: 'Action', payload });
let initialAppCmd: Cmd<App.Action> = Cmd.none;

let loopDispatch: Done<App.Action> = () => {
    // do nothing
};

abstract class CmdExecutor extends Cmd<never> {
    public static execute<T>(cmd: Cmd<T>, done: Done<T>): void {
        super.execute(cmd, done);
    }
}

function reducer(state: App.State, action: Action): App.State {
    // @INIT Redux action
    if (action.type !== 'Action') {
        return state;
    }

    const [ nextState, cmd ] = action.payload.update(state);

    CmdExecutor.execute(cmd, loopDispatch);

    return nextState;
}

function init(): App.State {
    const [ initialState, initialCmd ] = App.init();

    initialAppCmd = initialCmd;

    return initialState;
}

const store = reduxDevtools
    ? createStore(reducer, init(), reduxDevtools)
    : createStore(reducer, init());

loopDispatch = compose(store.dispatch, Action);
CmdExecutor.execute(initialAppCmd, loopDispatch);

const Root = connect(
    (state: App.State) => ({ state }),
    { dispatch: Action }
)(({ state, dispatch }) => (
    <App.View state={state} dispatch={dispatch} />
));

ReactDOM.render(
    <Provider store={store}>
        <Root />
    </Provider>,
    document.getElementById('root')
);
