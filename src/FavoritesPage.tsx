import React from 'react';
import Jumbotron from 'react-bootstrap/Jumbotron';
import Container from 'react-bootstrap/Container';
import { compose } from 'redux';
import { Maybe, Nothing, Just } from 'frctl/dist/Maybe';
import { Cmd } from './Cmd';
import * as Utils from './Utils';
import * as Router from './Router';
import * as Api from './Api';
import * as BeerList from './BeerList';

export type State = Maybe<{
    beersPerPage: number;
    favorites: Array<number>;
    beerList: BeerList.State;
}>;

export const init = (
    filter: Router.SearchFilter,
    favorites: Array<number>,
    beersPerPage: number
): [ State, Cmd<Action> ] => {
    if (favorites.length === 0) {
        return [
            Nothing,
            Cmd.none
        ];
    }

    const [ initialBeerList, cmdOfBeerList ] = BeerList.init(
        () => Api.loadBeerListByIds(filter, favorites, beersPerPage, 1)
    );

    return [
        Just({
            beersPerPage,
            favorites,
            beerList: initialBeerList
        }),
        cmdOfBeerList.map(ActionBeerList)
    ];
};

export const getBeer = (id: number, state: State): Maybe<Api.Beer> => state.chain(
    ({ beerList }) => BeerList.getBeer(id, beerList)
);

export const isEmpty = (state: State): boolean => state.map(
    ({ beerList }) => BeerList.isEmpty(beerList)
).getOrElse(false);


export interface StagePattern<R> {
    Update(state: State, cmd: Cmd<Action>): R;
    SetFavorites(checked: boolean, beerId: number): R;
}

export abstract class Stage {
    public abstract cata<R>(patern: StagePattern<R>): R;
}

export const Update = Utils.cons<[ State, Cmd<Action> ], Stage>(class extends Stage {
    public constructor(
        private readonly state: State,
        private readonly cmd: Cmd<Action>
    ) {
        super();
    }

    public cata<R>(pattern: StagePattern<R>): R {
        return pattern.Update(this.state, this.cmd);
    }
});

export const SetFavorites = Utils.cons<[ boolean, number ], Stage>(class extends Stage {
    public constructor(
        private readonly checked: boolean,
        private readonly beerId: number
    ) {
        super();
    }

    public cata<R>(pattern: StagePattern<R>): R {
        return pattern.SetFavorites(this.checked, this.beerId);
    }
});

export abstract class Action extends Utils.Action<[ Router.SearchFilter, State ], Stage> {}

export const ActionBeerList = Utils.cons<[ BeerList.Action ], Action>(class extends Action {
    public constructor(private readonly action: BeerList.Action) {
        super('ActionBeerList');
    }

    public update(filter: Router.SearchFilter, mState: State): Stage {
        return mState.cata({
            Nothing: () => Update(Nothing, Cmd.none),

            Just: state => this.action.update(
                count => Api.loadBeerListByIds(
                    filter,
                    state.favorites,
                    state.beersPerPage,
                    count / state.beersPerPage + 1
                ),
                state.beerList
            ).cata({
                Update: (nextBeerList, cmdOfBeerList) => Update(
                    Just({ ...state, beerList: nextBeerList }),
                    cmdOfBeerList.map(ActionBeerList)
                ),

                SetFavorites
            })
        });
    }
});

export const View: React.FC<{
    scroller: React.RefObject<HTMLElement>;
    favorites: Set<number>;
    state: State;
    dispatch(action: Action): void;
}> = ({ state, dispatch, ...beerListProps }) => state.cata({
    Nothing: () => (
        <Jumbotron fluid className="mb-0">
            <Container fluid>
                <h1>Oops... favorites are empty!</h1>
                <p>
                    Test your luck with{' '}
                    <Router.Link to={Router.ToRandomBeer}>random beer</Router.Link>{' '}
                    or just{' '}
                    <Router.Link to={Router.ToBeerSearch({ name: Nothing, brewedAfter: Nothing })}>
                        explore all we have
                    </Router.Link>
                    !
                </p>
            </Container>
        </Jumbotron>
    ),

    Just: ({ beerList }) => (
        <BeerList.View
            skeletonCount={Math.min(beerListProps.favorites.size, 4)}
            state={beerList}
            dispatch={compose(dispatch, ActionBeerList)}
            {...beerListProps}
        />
    )
});
