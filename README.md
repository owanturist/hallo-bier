# [Hallo Bier!](http://hallo-bier.s3-website-eu-west-1.amazonaws.com)

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

### Kudos

- Thanks to [PUNK API](https://punkapi.com/documentation/v2) for the open beer API.
- Thanks to [Elm](https://elm-lang.org) for inspire me to start 
[Fractal](https://github.com/owanturist/Fractal) according which I've develop the app.
- Thanks to [nock](https://github.com/nock/nock) for inspire me to implement basic 
mock API for the [`Http`](./src/Http.ts) module.

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.

Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

The page will reload if you make edits.

You will also see any lint errors in the console.

### `npm test`

Launches the test runner in the interactive watch mode.


### `npm run build`

Builds the app for production to the `build` folder.

It correctly bundles React in production mode and optimizes the build for the best performance.

### `npm tun lint`

Runs tslint for all of the `.ts(x)` files.

## Why classes?

Here is a piece of code which describes simple counter's `Action` and
way of handling them like `update`/`reducer`. Below the code you can find lists of
pros and cons by my opinion. I didn't use `readonly` for keep the example more clean.

```ts
/**
 * Common State.
 */
export interface State {
    count: number;
}

/* REDUX WAY */

/**
 * Action definition.
 *
 * Everyone outside knows about signature of your Action.
 */
export type Action
    = { type: Decrement; amount: number }
    | { type: Increment; amount: number }
    | { type: Reset }
    ;

/**
 * Action.type definition.
 *
 * Used in Action definition and Action.type shortcut.
 * Not required.
 */
type Decrement = '@Counter/Decrement';

/**
 * Action.type shortcut.
 *
 * Used in Action shortcut and reducer.
 * Not required.
 */
const Decrement: Decrement = '@Counter/Decrement';

/**
 * Action shortcut.
 *
 * Used like constructor of Action wherever and whenever you need.
 * Not required.
 */
const decrement = (amount: number): Action => ({ type: Decrement, amount });

type Increment = '@Counter/Increment';
const Increment: Increment = '@Counter/Increment';
const increment = (amount: number): Action => ({ type: Increment, amount });

type Reset = '@Counter/Reset';
const Reset: Reset = '@Counter/Reset';
const reset: Action = { type: Reset };

/**
 * Handler of Action (reducer).
 *
 * Handles whole bunch of Action.
 * This function always uses all cases of Action, so you should keep in mind
 * which of them are really used and which are legacy and should be removed.
 */
export const update = (state: State, action: Action): State => {
    switch (action.type) {
        case Decrement: {
            return { ...state, count: state.count + action.amount };
        }

        case Increment: {
            return { ...state, count: state.count + action.amount };
        }

        case Reset: {
            return { ...state, count: 0 };
        }
    }
};

/* CLASS WAY */

/**
 * Action interface.
 *
 * Nobody outisde knows about signature of your Action. Even inside the module.
 */
export interface Action {
    /**
     * Handler of Action.
     *
     * Handles just the Action and nothing else.
     */
    update(state: State): State;
}

class Decrement implements Action {
    constructor(private amount: number) {}

    public update(state: State): State {
        return { ...state, count: state.count + this.amount };
    }
}

class Decrement implements Action {
    constructor(private amount: number) {}

    public update(state: State): State {
        return { ...state, count: state.count - this.amount };
    }
}

class Reset implements Action {
    public update(state: State): State {
        return { ...state, count: 0 };
    }
}
```

### Advantages

1. Encapsulation. No one parent module know anything about `Action`, it can just call `update`.
It prevents modifying and reading of a `Action` from parent module.
1. No more huge `reducer` function - whole logic is described inside the source.
It's very natural to define a `Action` and describe handling right there.
1. Easy track of unused `Action`. Otherwise you use described `type Action` at least in one place: 
`update`/`reducer` and even if you use one of let's say ten `Action` in a module 
but the function will always use all of them.
1. More easy refactoring. Everything (definition and handling) in single place 
and if you've decided to get rid of one of 
the `Action` you just delete it. Otherwise you should delete it at least from two places: 
type definition and `reducer`.
1. No more overhead with types. 
You can and you should use `new` for create a `Action`. 
Just do it like this `dispatch(new Decrement(2))`. 
No more `dispatch({ type: Decrement, amount: 2 })` which cause extra typing in some cases. 
Or even using shortcuts like this `dispatch(decrement(2))` which also could be extra described.
    > Somethimes you shouldn't create an extra types from `type` of `Action`.
    > It usually possible when you work with TS and depends on your team, beliefs and habits.

### Disadvantages

1. You should implement `update` method in every `Action`, so it looks like kind of boilerplate.
Otherwise you have single place (`reducer`) which describes the signature.
1. Creating of `Action` with `new` looks unusual and not natural.
1. Everyone does like Redux.

### Get rid of the `new`

To made the approach more "natural" the class example could be rewriten like that:

```ts
import * as Utils from './src/Utils'; // see the code in src/Utils.ts

export interface State {
    count: number;
}

export interface Action {
    update(state: State): State;
}

const Increment = Utils.cons(class implements Action {
    public constructor(private amount: number) {}

    public update(state: State): State {
        return { ...state, count: state.count + this.amount };
    }
});

const Decrement = Utils.cons(class implements Action {
    public constructor(private amount: number) {}

    public update(state: State): State {
        return { ...state, count: state.count - this.amount };
    }
});

const Reset = Utils.inst(class implements Action {
    public update(state: State): State {
        return { ...state, count: 0 };
    }
});
```

With `Utils.cons` (constructor, at least one argument exists) 
and `Utils.inst` (instance, when no arguments exist) you could use
the action in a way `dispatch(Increment(1))` or `(dispatch(Reset))`
instead `dispatch(new Increment(1))` and `(dispatch(new Reset()))` accordingly.
