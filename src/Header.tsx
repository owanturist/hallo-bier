import React from 'react';
import { compose } from 'redux';
import Navbar from 'react-bootstrap/Navbar';
import Button from 'react-bootstrap/Button';
import Container from 'react-bootstrap/Container';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFilter } from '@fortawesome/free-solid-svg-icons';
import { Maybe, Nothing, Just } from 'frctl/dist/src/Maybe';
import { Cmd } from 'Cmd';
import * as Utils from 'Utils';
import * as Router from './Router';
import * as SearchBuilder from './SearchBuilder';
import { Month } from './MonthPicker';
import styles from 'Header.module.css';

export interface State {
    searchBuilder: Maybe<SearchBuilder.State>;
}

export const init = (): State => ({
    searchBuilder: Nothing
});

export abstract class Action extends Utils.Action<[ State ], [ State, Cmd<Action> ]> {}

class ShowSearchBuilder extends Action {
    public constructor(private readonly filter: Router.SearchFilter) {
        super();
    }

    public update(state: State): [ State, Cmd<Action> ] {
        return [
            {
                ...state,
                searchBuilder: Just(
                    SearchBuilder.init(
                        this.filter.name.getOrElse(''),
                        this.filter.brewedAfter.map(
                            date => ({
                                month: Month.fromDate(date),
                                year: date.getFullYear()
                            })
                        )
                    )
                )
            },
            Cmd.none
        ];
    }
}

class HideSearchBuilder extends Action {
    public update(state: State): [ State, Cmd<Action> ] {
        return [{ ...state, searchBuilder: Nothing }, Cmd.none ];
    }
}

class ActionSearchBuilder extends Action {
    public static cons(action: SearchBuilder.Action) {
        return new ActionSearchBuilder(action);
    }

    private constructor(private readonly action: SearchBuilder.Action) {
        super();
    }

    public update(state: State): [ State, Cmd<Action> ] {
        return state.searchBuilder.map(searchBuilder => {
            return this.action.update(searchBuilder).cata({
                Update: (nextSearchBuilder): [ State, Cmd<Action> ] => [
                    { ...state, searchBuilder: Just(nextSearchBuilder) },
                    Cmd.none
                ],

                Search: (filter): [ State, Cmd<Action> ] => [
                    state,
                    Router.ToBeerSearch(filter).push()
                ]
            });
        }).getOrElse([ state, Cmd.none ]);
    }
}


export const View: React.FC<{
    minBrewedAfter?: [ Month, number ];
    maxBrewedAfter?: [ Month, number ];
    filter: Maybe<Router.SearchFilter>;
    state: State;
    dispatch(action: Action): void;
}> = ({ minBrewedAfter, maxBrewedAfter, filter, state, dispatch }) => (
    <div className={state.searchBuilder.isJust() ? 'border-bottom' : ''}>
        <Navbar bg="warning" expand="lg">
            <Container fluid className={styles.container}>
                <Navbar.Brand as={Router.Link} to={Router.ToHome}>Hallo Bier</Navbar.Brand>

                {filter.cata({
                    Nothing: () => null,
                    Just: f => (
                        <Button
                            variant="outline-dark"
                            size="sm"
                            active={state.searchBuilder.isJust()}
                            onClick={() => dispatch(
                                state.searchBuilder.isJust()
                                    ? new HideSearchBuilder()
                                    : new ShowSearchBuilder(f)
                            )}
                        >
                            <FontAwesomeIcon icon={faFilter} />
                        </Button>
                    )
                })}
            </Container>
        </Navbar>

        {filter.isJust() && state.searchBuilder.cata({
            Nothing: () => null,
            Just: searchBuilder => (
                <Container fluid className={`${styles.container} py-2`}>
                    <SearchBuilder.View
                        compact
                        minBrewedAfter={minBrewedAfter}
                        maxBrewedAfter={maxBrewedAfter}
                        state={searchBuilder}
                        dispatch={compose(dispatch, ActionSearchBuilder.cons)}
                    />
                </Container>
            )
        })}
    </div>
);
