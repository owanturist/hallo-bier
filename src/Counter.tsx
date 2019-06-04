import React from 'react';

import { Cmd, Done } from 'Cmd';

export type Action
    = Readonly<{ type: 'INCREMENT' }>
    | Readonly<{ type: 'DECREMENT' }>
    ;

const Increment: Action = { type: 'INCREMENT' };
const Decrement: Action = { type: 'DECREMENT' };

export type State = Readonly<{
    count: number;
}>;

export const init = (count: number): [ State, Cmd<Action> ] => [
    { count },
    Cmd.none
];

export const update = (action: Action, state: State): [ State, Cmd<Action> ] => {
    switch (action.type) {
        case 'INCREMENT': {
            return [
                { ...state, count: state.count + 1 },
                Cmd.of((done: Done<Action>): void => {
                    setTimeout(() => {
                        done(Decrement);
                    }, 1000);
                })
            ];
        }

        case 'DECREMENT': {
            return [
                { ...state, count: state.count - 1 },
                Cmd.none
            ];
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
