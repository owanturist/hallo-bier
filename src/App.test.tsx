import React from 'react';
import ReactDOM from 'react-dom';
import * as App from './App';

it('renders without crashing', () => {
    const div = document.createElement('div');
    const [ initialState ] = App.init();
    const dispatch = (): void => {
        // noop
    };

    ReactDOM.render(
        <App.View state={initialState} dispatch={dispatch} />,
        div
    );
    ReactDOM.unmountComponentAtNode(div);
});
