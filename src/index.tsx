import React from 'react';
import ReactDOM from 'react-dom';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { createStore } from 'redux';
import * as Counter from './Counter';
import './index.css';
import * as serviceWorker from './serviceWorker';

const reduxDevtools = (window as any).__REDUX_DEVTOOLS_EXTENSION__ && (window as any).__REDUX_DEVTOOLS_EXTENSION__();

const store = createStore(
    Counter.reducer,
    reduxDevtools
);

ReactDOM.render(
    <Provider store={store}>
        <BrowserRouter>
            <Counter.View />
        </BrowserRouter>
    </Provider>,
    document.getElementById('root')
);

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister();
