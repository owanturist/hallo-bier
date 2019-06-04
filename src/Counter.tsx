import React from 'react';

export type Action
    = Readonly<{ type: 'INCREMENT' }>
    | Readonly<{ type: 'DECREMENT' }>
    ;

const Increment: Action = { type: 'INCREMENT' };
const Decrement: Action = { type: 'DECREMENT' };

export type State = Readonly<{
    count: number;
}>;

export const initial: State = {
    count: 0
};

export const update = (action: Action, state: State): State => {
    switch (action.type) {
        case 'INCREMENT': {
            return { ...state, count: state.count + 1 };
        }

        case 'DECREMENT': {
            return { ...state, count: state.count - 1 };
        }
    }
};

export const View: React.FC<{
    state: State;
    dispatch(action: Action): void;
}> = ({ state, dispatch }) => (
    <div>
        <button
            type="button"
            onClick={() => dispatch(Decrement)}
        >-</button>

        {state.count}

        <button
            type="button"
            onClick={() => dispatch(Increment)}
        >+</button>
    </div>
);
