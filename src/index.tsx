import React from 'react';
import ReactDOM from 'react-dom';
import { BrowserRouter } from 'react-router-dom';
import { Provider, connect } from 'react-redux';
import { createStore } from 'redux';
import * as App from './App';
import './index.css';
import * as serviceWorker from './serviceWorker';

const reduxDevtools = (window as any).__REDUX_DEVTOOLS_EXTENSION__ && (window as any).__REDUX_DEVTOOLS_EXTENSION__();

const store = createStore(
    (state: App.State, action: App.Action) => App.update(action, state) || state,
    App.initial,
    reduxDevtools
);

const Connector = connect(
    (state: App.State) => ({ state }),
    (dispatch: (action: App.Action) => void) => ({ dispatch })
)(({ state, dispatch }) => (
    <App.View state={state} dispatch={dispatch} />
));

ReactDOM.render(
    <Provider store={store}>
        <BrowserRouter>
            <Connector />
        </BrowserRouter>
    </Provider>,
    document.getElementById('root')
);

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister();
