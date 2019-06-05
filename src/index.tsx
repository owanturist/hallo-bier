import React from 'react';
import ReactDOM from 'react-dom';
import { Provider, connect } from 'react-redux';
import { createStore } from 'redux';
import * as App from './App';
import './index.css';
import 'bootstrap/dist/css/bootstrap.css';
import * as serviceWorker from './serviceWorker';
import { Cmd, Done } from 'Cmd';

const reduxDevtools = (window as any).__REDUX_DEVTOOLS_EXTENSION__ && (window as any).__REDUX_DEVTOOLS_EXTENSION__();

let dispatch: Done<App.Action> = () => {
    // do nothing
};

abstract class CmdExecutor extends Cmd<never> {
    public static execute<T>(cmd: Cmd<T>, done: Done<T>): void {
        super.execute(cmd, done);
    }
}

function reducer(state: App.State, action: App.Action): App.State {
    const tuple = App.update(action, state);

    // @INIT Redux action
    if (!tuple) {
        return state;
    }

    CmdExecutor.execute(tuple[1], dispatch);

    return tuple[0];
}

function init(): App.State {
    const [ initialState, initialCmd ] = App.init();

    CmdExecutor.execute(initialCmd, dispatch);

    return initialState;
}

const store = createStore(
    reducer,
    init(),
    reduxDevtools
);

dispatch = store.dispatch;

const Connector = connect(
    (state: App.State) => ({ state }),
    (dispatch: (action: App.Action) => void) => ({ dispatch })
)(({ state, dispatch }) => (
    <App.View state={state} dispatch={dispatch} />
));

ReactDOM.render(
    <Provider store={store}>
            <Connector />
    </Provider>,
    document.getElementById('root')
);

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister();
