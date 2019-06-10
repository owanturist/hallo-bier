import React from 'react';
import { compose } from 'redux';
import Navbar from 'react-bootstrap/Navbar';
import Nav from 'react-bootstrap/Nav';
import Button from 'react-bootstrap/Button';
import Container from 'react-bootstrap/Container';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFilter, faBeer, faDice, faHeart } from '@fortawesome/free-solid-svg-icons';
import { faHeart as faRegularHeart } from '@fortawesome/free-regular-svg-icons';
import { Cata } from 'frctl/dist/src/Basics';
import { Maybe, Nothing, Just } from 'frctl/dist/src/Maybe';
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
    Update(nextState: State): R;
    RollRandomBeer(): R;
    SetFavorites(checked: boolean, beerId: number): R;
    SetFilters(filters: Router.SearchFilter): R;
}

export abstract class Stage {
    public abstract cata<R>(pattern: StagePattern<R>): R;
}

class Update extends Stage {
    public constructor(private readonly state: State) {
        super();
    }

    public cata<R>(pattern: StagePattern<R>): R {
        return pattern.Update(this.state);
    }
}

class RollRandomBeer extends Stage {
    public cata<R>(pattern: StagePattern<R>): R {
        return pattern.RollRandomBeer();
    }
}

class SetFavorites extends Stage {
    public constructor(
        private readonly checked: boolean,
        private readonly beerId: number
    ) {
        super();
    }

    public cata<R>(pattern: StagePattern<R>): R {
        return pattern.SetFavorites(this.checked, this.beerId);
    }
}

export abstract class Action extends Utils.Action<[ State ], Stage> {}

class RollBeer extends Action {
    public update(): Stage {
        return new RollRandomBeer();
    }
}

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
        return new Update(ShowSearchBuilder.show(this.filter, state));
    }
}

class SetFilters extends Stage {
    public static cons(filters: Router.SearchFilter): Stage {
        return new SetFilters(filters);
    }

    private constructor(private readonly filters: Router.SearchFilter) {
        super();
    }

    public cata<R>(pattern: StagePattern<R>): R {
        return pattern.SetFilters(this.filters);
    }
}

export const showSearchBuilder = ShowSearchBuilder.show;

class HideSearchBuilder extends Action {
    public static hide(state: State): State {
        return { ...state, searchBuilder: Nothing };
    }

    public update(state: State): Stage {
        return new Update(HideSearchBuilder.hide(state));
    }
}

export const hideSearchBuilder = HideSearchBuilder.hide;

class ToggleFavorite extends Action {
    public constructor(
        private readonly checked: boolean,
        private readonly beerId: number
    ) {
        super();
    }

    public update(): Stage {
        return new SetFavorites(this.checked, this.beerId);
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
            Nothing: () => new Update(state),

            Just: searchBuilder => {
                return this.action.update(searchBuilder).cata({
                    Update: nextSearchBuilder => new Update({
                        ...state,
                        searchBuilder: Just(nextSearchBuilder)
                    }),

                    Search: SetFilters.cons
                });
            }
        });
    }
}

type ToolPattern<R> = Cata<{
    Filter(filter: Router.SearchFilter): R;
    Roll(busy: boolean): R;
    Favorite(favorites: Set<number>, beerId: Maybe<number>): R;
}>;

export abstract class Tool {
    public static Filter(filter: Router.SearchFilter): Tool {
        return new FilterTool(filter);
    }

    public static Roll(busy: boolean): Tool {
        return new RollTool(busy);
    }

    public static Favorite(favorites: Set<number>, beerId: Maybe<number>): Tool {
        return new FavoriteTool(favorites, beerId);
    }

    public toString(): string {
        return this.constructor.name;
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
    public constructor(
        private readonly favorites: Set<number>,
        private readonly beerId: Maybe<number>
    ) {
        super();
    }

    public cata<R>(pattern: ToolPattern<R>): R {
        if (typeof pattern.Favorite === 'function') {
            return pattern.Favorite(this.favorites, this.beerId);
        }

        return (pattern._ as () => R)();
    }
}

const ViewTool: React.FC<{
    tool: Tool;
    state: State;
    dispatch(action: Action): void;
}> = ({ tool, state, dispatch }) => tool.cata({
    Filter: filter => (
        <Button
            className="ml-2"
            variant="outline-warning"
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
            className="ml-2"
            variant="outline-warning"
            size="sm"
            disabled={busy}
            onClick={() => dispatch(new RollBeer())}
        >
            <FontAwesomeIcon icon={faDice} />
        </Button>
    ),

    Favorite: (favorites, beerId) => beerId.cata({
        Nothing: () => (
            <Button
                className="ml-2"
                variant="outline-warning"
                size="sm"
                disabled
            >
                <FontAwesomeIcon icon={faRegularHeart} />
            </Button>
        ),

        Just: beerId => {
            const checked = favorites.has(beerId);

            return (
                <Button
                    className="ml-2"
                    variant="outline-warning"
                    size="sm"
                    onClick={() => dispatch(new ToggleFavorite(!checked, beerId))}
                >
                    {checked
                        ? (
                            <FontAwesomeIcon className="text-danger" icon={faHeart} />
                        )
                        : (
                            <FontAwesomeIcon icon={faRegularHeart} />
                        )
                    }
                </Button>
            );
        }
    })
});

export const View: React.FC<{
    minBrewedAfter?: [ Month, number ];
    maxBrewedAfter?: [ Month, number ];
    tools: Array<Tool>;
    state: State;
    dispatch(action: Action): void;
}> = ({ minBrewedAfter, maxBrewedAfter, tools, state, dispatch }) => (
    <div className={state.searchBuilder.isJust() ? 'border-bottom' : ''}>
        <Navbar bg="dark" variant="dark" expand="lg">
            <Container fluid className={styles.container}>
                <Navbar.Brand as={Router.Link} to={Router.ToHome}>
                    Hallo
                    <FontAwesomeIcon icon={faBeer} className="text-warning mx-1" />
                    Bier
                </Navbar.Brand>

                <Nav className="mr-auto">
                    <Nav.Link
                        as={Router.Link}
                        to={Router.ToFavorites({ name: Nothing, brewedAfter: Nothing })}
                    >favorites</Nav.Link>
                </Nav>

                <div>
                    {tools.length > 0 && tools.map(tool => (
                        <ViewTool
                            key={tool.toString()}
                            state={state}
                            tool={tool}
                            dispatch={dispatch}
                        />
                    ))}
                </div>
            </Container>
        </Navbar>

        {state.searchBuilder.cata({
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
