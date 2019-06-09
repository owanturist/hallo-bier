import React from 'react';
import { compose } from 'redux';
import Navbar from 'react-bootstrap/Navbar';
import Button from 'react-bootstrap/Button';
import Container from 'react-bootstrap/Container';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFilter, faBeer, faDice } from '@fortawesome/free-solid-svg-icons';
import { Cata } from 'frctl/dist/src/Basics';
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

export interface StagePattern<R> {
    Idle(): R;
    Update(nextState: State, cmd: Cmd<Action>): R;
    RollRandomBeer(): R;
}

export abstract class Stage {
    public abstract cata<R>(pattern: StagePattern<R>): R;
}

class Idle extends Stage {
    public cata<R>(pattern: StagePattern<R>): R {
        return pattern.Idle();
    }
}

class Update extends Stage {
    public constructor(
        private readonly state: State,
        private readonly cmd: Cmd<Action>
    ) {
        super();
    }

    public cata<R>(pattern: StagePattern<R>): R {
        return pattern.Update(this.state, this.cmd);
    }
}

class RollRandomBeer extends Stage {
    public cata<R>(pattern: StagePattern<R>): R {
        return pattern.RollRandomBeer();
    }
}

export abstract class Action extends Utils.Action<[ State ], Stage> {}

class ShowSearchBuilder extends Action {
    public static show(filter: Router.SearchFilter, state: State): State {
        if (state.searchBuilder.isJust()) {
            return state;
        }

        return {
            ...state,
            searchBuilder: Just(
                SearchBuilder.init(
                    filter.name.getOrElse(''),
                    filter.brewedAfter.map(
                        date => ({
                            month: Month.fromDate(date),
                            year: date.getFullYear()
                        })
                    )
                )
            )
        };
    }

    public constructor(private readonly filter: Router.SearchFilter) {
        super();
    }

    public update(state: State): Stage {
        return new Update(
            ShowSearchBuilder.show(this.filter, state),
            Cmd.none
        );
    }
}

export const showSearchBuilder = ShowSearchBuilder.show;

class RollBeer extends Action {
    public update(): Stage {
        return new RollRandomBeer();
    }
}

class HideSearchBuilder extends Action {
    public update(state: State): Stage {
        return new Update({ ...state, searchBuilder: Nothing }, Cmd.none);
    }
}

class ActionSearchBuilder extends Action {
    public static cons(action: SearchBuilder.Action) {
        return new ActionSearchBuilder(action);
    }

    private constructor(private readonly action: SearchBuilder.Action) {
        super();
    }

    public update(state: State): Stage {
        return state.searchBuilder.cata({
            Nothing: () => new Idle(),

            Just: searchBuilder => {
                return this.action.update(searchBuilder).cata({
                    Update: nextSearchBuilder => new Update(
                        { ...state, searchBuilder: Just(nextSearchBuilder) },
                        Cmd.none
                    ),

                    Search: filter => new Update(
                        state,
                        Router.ToBeerSearch(filter).push()
                    )
                });
            }
        });
    }
}

type ToolPattern<R> = Cata<{
    Filter(filter: Router.SearchFilter): R;
    Roll(busy: boolean): R;
    Favorite(checked: boolean): R;
}>;

export abstract class Tool {
    public static Filter(filter: Router.SearchFilter): Tool {
        return new FilterTool(filter);
    }

    public static Roll(busy: boolean): Tool {
        return new RollTool(busy);
    }

    public static Favorite(checked: boolean): Tool {
        return new FavoriteTool(checked);
    }

    public abstract cata<R>(pattern: ToolPattern<R>): R;
}

class FilterTool extends Tool {
    public constructor(private readonly filter: Router.SearchFilter) {
        super();
    }

    public cata<R>(pattern: ToolPattern<R>): R {
        if (typeof pattern.Filter === 'function') {
            return pattern.Filter(this.filter);
        }

        return (pattern._ as () => R)();
    }
}

class RollTool extends Tool {
    public constructor(private readonly busy: boolean) {
        super();
    }

    public cata<R>(pattern: ToolPattern<R>): R {
        if (typeof pattern.Roll === 'function') {
            return pattern.Roll(this.busy);
        }

        return (pattern._ as () => R)();
    }
}

class FavoriteTool extends Tool {
    public constructor(private readonly checked: boolean) {
        super();
    }

    public cata<R>(pattern: ToolPattern<R>): R {
        if (typeof pattern.Favorite === 'function') {
            return pattern.Favorite(this.checked);
        }

        return (pattern._ as () => R)();
    }
}

export const View: React.FC<{
    minBrewedAfter?: [ Month, number ];
    maxBrewedAfter?: [ Month, number ];
    tool: Maybe<Tool>;
    state: State;
    dispatch(action: Action): void;
}> = ({ minBrewedAfter, maxBrewedAfter, tool, state, dispatch }) => (
    <div className={state.searchBuilder.isJust() ? 'border-bottom' : ''}>
        <Navbar bg="warning" expand="lg">
            <Container fluid className={styles.container}>
                <Navbar.Brand as={Router.Link} to={Router.ToHome}>
                    Hallo
                    <FontAwesomeIcon icon={faBeer} className="text-white mx-1" />
                    Bier
                </Navbar.Brand>

                {tool.cata({
                    Nothing: () => null,

                    Just: t => t.cata({
                        Filter: filter => (
                            <Button
                                variant="outline-dark"
                                size="sm"
                                active={state.searchBuilder.isJust()}
                                onClick={() => dispatch(
                                    state.searchBuilder.isJust()
                                        ? new HideSearchBuilder()
                                        : new ShowSearchBuilder(filter)
                                )}
                            >
                                <FontAwesomeIcon icon={faFilter} />
                            </Button>
                        ),

                        Roll: busy => (
                            <Button
                                variant="dark"
                                size="sm"
                                disabled={busy}
                                onClick={() => dispatch(new RollBeer())}
                            >
                                <FontAwesomeIcon icon={faDice} />
                            </Button>
                        ),

                        Favorite: () => null
                    })
                })}
            </Container>
        </Navbar>

        {tool.cata({
            Nothing: () => null,

            Just: t => t.cata({
                Filter: () => state.searchBuilder.cata({
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
                }),

                _: () => null
            })
        })}
    </div>
);
