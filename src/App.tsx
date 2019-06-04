import React from 'react';
import { compose } from 'redux';
import * as Counter from './Counter';

export type Action
    = Readonly<{ type: 'LEFT_COUNTER_ACTION'; msg: Counter.Action }>
    | Readonly<{ type: 'RIGHT_COUNTER_ACTION'; msg: Counter.Action }>
    ;

const LeftCounterAction = (msg: Counter.Action): Action => ({ type: 'LEFT_COUNTER_ACTION', msg });
const RightCounterAction = (msg: Counter.Action): Action => ({ type: 'RIGHT_COUNTER_ACTION', msg });

export type State = Readonly<{
    left: Counter.State;
    right: Counter.State;
}>;

export const initial: State = {
    left: Counter.initial,
    right: Counter.initial
};

export const update = (action: Action, state: State): State => {
    switch (action.type) {
        case 'LEFT_COUNTER_ACTION': {
            return { ...state, left: Counter.update(action.msg, state.left) };
        }

        case 'RIGHT_COUNTER_ACTION': {
            return { ...state, right: Counter.update(action.msg, state.right) };
        }
    }
};

export const View: React.FC<{
    state: State;
    dispatch(action: Action): void;
}> = ({ state, dispatch }) => (
    <div>
        <Counter.View
            state={state.left}
            dispatch={compose(dispatch, LeftCounterAction)}
        />

        <Counter.View
            state={state.right}
            dispatch={compose(dispatch, RightCounterAction)}
        />
    </div>
  );
