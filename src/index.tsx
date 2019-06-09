import React from 'react';
import ReactDOM from 'react-dom';
import { Provider, connect } from 'react-redux';
import { createStore, compose } from 'redux';
import * as App from './App';
import './index.css';
import 'bootstrap/dist/css/bootstrap.css';
import * as serviceWorker from './serviceWorker';
import { Cmd, Done } from 'Cmd';

const reduxDevtools = (window as any).__REDUX_DEVTOOLS_EXTENSION__ && (window as any).__REDUX_DEVTOOLS_EXTENSION__();

interface Action {
    type: 'SELF';
    payload: App.Action;
}

const Self = (payload: App.Action): Action => ({ type: 'SELF', payload });
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
    if (action.type !== 'SELF') {
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

const store = createStore(
    reducer,
    init(),
    reduxDevtools
);

loopDispatch = compose(store.dispatch, Self);
CmdExecutor.execute(initialAppCmd, loopDispatch);

const Root = connect(
    (state: App.State) => ({ state }),
    { dispatch: Self }
)(({ state, dispatch }) => (
    <App.View state={state} dispatch={dispatch} />
));

ReactDOM.render(
    <Provider store={store}>
        <Root />
    </Provider>,
    document.getElementById('root')
);

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister();
