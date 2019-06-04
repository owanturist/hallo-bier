import React from 'react';
import { connect } from 'react-redux';

type Action
    = Readonly<{ type: '@COUNTER__INCREMENT' }>
    | Readonly<{ type: '@COUNTER__DECREMENT' }>
    ;

const Increment = (): Action => ({ type: '@COUNTER__INCREMENT' });
const Decrement = (): Action => ({ type: '@COUNTER__DECREMENT' });

export type State = Readonly<{
    count: number;
}>;

const initialState: State = {
    count: 0
};

export const reducer = (state = initialState, action: Action): State => {
    switch (action.type) {
        case '@COUNTER__INCREMENT': {
            return { ...state, count: state.count + 1 };
        }

        case '@COUNTER__DECREMENT': {
            return { ...state, count: state.count - 1 };
        }

        default: {
            return state;
        }
    }
};

const Counter: React.FC<{
    count: number;
    onIncrement(): void;
    onDecrement(): void;
}> = props => (
    <div>
        <button
            type="button"
            onClick={props.onDecrement}
        >-</button>

        {props.count}

        <button
            type="button"
            onClick={props.onIncrement}
        >+</button>
    </div>
);

export const View = connect(
    (state: State) => ({
        count: state.count
    }),
    {
        onIncrement: Increment,
        onDecrement: Decrement
    }
)(Counter);
