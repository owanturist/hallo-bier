import React from 'react';
import { compose } from 'redux';
import Navbar from 'react-bootstrap/Navbar';
import Nav from 'react-bootstrap/Nav';
import Button, { ButtonProps } from 'react-bootstrap/Button';
import Container from 'react-bootstrap/Container';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFilter, faBeer, faDice, faHeart, faBars } from '@fortawesome/free-solid-svg-icons';
import { faHeart as faRegularHeart } from '@fortawesome/free-regular-svg-icons';
import { Cata } from 'frctl/dist/Basics';
import { Maybe, Nothing, Just } from 'frctl/dist/Maybe';
import * as Utils from 'Utils';
import * as Router from './Router';
import * as SearchBuilder from './SearchBuilder';
import * as MonthPicker from './MonthPicker';
import styles from 'Header.module.css';

export interface State {
    expanded: boolean;
    searchBuilder: Maybe<SearchBuilder.State>;
}

export const init = (): State => ({
    expanded: false,
    searchBuilder: Nothing
});

export interface StagePattern<R> {
    Update(nextState: State): R;
    RollRandomBeer(): R;
    SetFavorites(checked: boolean, beerId: number): R;
    SetFilters(filters: Router.SearchFilter): R;
}

export interface Stage {
    cata<R>(pattern: StagePattern<R>): R;
}

export const Update = Utils.cons(class implements Stage {
    public constructor(private readonly state: State) {}

    public cata<R>(pattern: StagePattern<R>): R {
        return pattern.Update(this.state);
    }
});

export const RollRandomBeer = Utils.inst(class implements Stage {
    public cata<R>(pattern: StagePattern<R>): R {
        return pattern.RollRandomBeer();
    }
});

export const SetFavorites = Utils.cons(class implements Stage {
    public constructor(
        private readonly checked: boolean,
        private readonly beerId: number
    ) {}

    public cata<R>(pattern: StagePattern<R>): R {
        return pattern.SetFavorites(this.checked, this.beerId);
    }
});

export const SetFilters = Utils.cons(class implements Stage {
    public constructor(private readonly filters: Router.SearchFilter) {}

    public cata<R>(pattern: StagePattern<R>): R {
        return pattern.SetFilters(this.filters);
    }
});

export interface Action extends Utils.Action<[ State ], Stage> {}

export const RollBeer = Utils.inst(class implements Action {
    public update(_state: State): Stage {
        return RollRandomBeer;
    }
});

export const showSearchBuilder = (filter: Router.SearchFilter, state: State): State => {
    if (state.searchBuilder.isJust()) {
        return state;
    }

    return {
        ...state,
        searchBuilder: Just(SearchBuilder.init(filter))
    };
};

export const ShowSearchBuilder = Utils.cons(class implements Action {
    public constructor(private readonly filter: Router.SearchFilter) {}

    public update(state: State): Stage {
        return Update(showSearchBuilder(this.filter, state));
    }
});

export const hideSearchBuilder = (state: State): State => {
    return { ...state, searchBuilder: Nothing };
};

export const HideSearchBuilder = Utils.inst(class implements Action {
    public update(state: State): Stage {
        return Update(hideSearchBuilder(state));
    }
});

export const ToggleMenu = Utils.cons(class implements Action {
    public constructor(private readonly expanded: boolean) {}

    public update(state: State): Stage {
        return Update({ ...state, expanded: this.expanded });
    }
});

export const ToggleFavorite = Utils.cons(class implements Action {
    public constructor(
        private readonly checked: boolean,
        private readonly beerId: number
    ) {}

    public update(_state: State): Stage {
        return SetFavorites(this.checked, this.beerId);
    }
});

export const SearchBuilderAction = Utils.cons(class implements Action {
    public constructor(private readonly action: SearchBuilder.Action) {}

    public update(state: State): Stage {
        return state.searchBuilder.cata({
            Nothing: () => Update(state),

            Just: searchBuilder => {
                return this.action.update(searchBuilder).cata<Stage>({
                    Update: nextSearchBuilder => Update({
                        ...state,
                        searchBuilder: Just(nextSearchBuilder)
                    }),

                    Search: SetFilters
                });
            }
        });
    }
});

export type ToolPattern<R> = Cata<{
    Filter(filter: Router.SearchFilter): R;
    Roll(busy: boolean): R;
    Favorite(favorites: Set<number>, beerId: Maybe<number>): R;
}>;

export interface Tool {
    cata<R>(pattern: ToolPattern<R>): R;
}

export const Filter = Utils.cons<[ Router.SearchFilter ], Tool>(class implements Tool {
    public constructor(private readonly filter: Router.SearchFilter) {}

    public cata<R>(pattern: ToolPattern<R>): R {
        if (typeof pattern.Filter === 'function') {
            return pattern.Filter(this.filter);
        }

        return (pattern._ as () => R)();
    }
});

export const Roll = Utils.cons<[ boolean ], Tool>(class implements Tool {
    public constructor(private readonly busy: boolean) {}

    public cata<R>(pattern: ToolPattern<R>): R {
        if (typeof pattern.Roll === 'function') {
            return pattern.Roll(this.busy);
        }

        return (pattern._ as () => R)();
    }
});

export const Favorite = Utils.cons<[ Set<number>, Maybe<number> ], Tool>(class implements Tool {
    public constructor(
        private readonly favorites: Set<number>,
        private readonly beerId: Maybe<number>
    ) {}

    public cata<R>(pattern: ToolPattern<R>): R {
        if (typeof pattern.Favorite === 'function') {
            return pattern.Favorite(this.favorites, this.beerId);
        }

        return (pattern._ as () => R)();
    }
});

const hasFilterTool = (tools: Array<Tool>): boolean => {
    return tools.some(tool => tool.cata({
        Filter: () => true,
        _: () => false
    }));
};

export const ViewTool: React.FC<{
    tool: Tool;
    state: State;
    dispatch(action: Action): void;
}> = ({ tool, state, dispatch }) => tool.cata({
    Filter: filter => (
        <Button
            variant="outline-warning"
            size="sm"
            active={state.searchBuilder.isJust()}
            onClick={() => dispatch(
                state.searchBuilder.isJust()
                    ? HideSearchBuilder
                    : ShowSearchBuilder(filter)
            )}
        >
            <FontAwesomeIcon fixedWidth icon={faFilter} />
        </Button>
    ),

    Roll: busy => (
        <Button
            variant="outline-warning"
            size="sm"
            disabled={busy}
            onClick={() => dispatch(RollBeer)}
        >
            <FontAwesomeIcon fixedWidth icon={faDice} />
        </Button>
    ),

    Favorite: (favorites, beerId) => beerId.cata({
        Nothing: () => (
            <Button
                variant="outline-warning"
                size="sm"
                disabled
            >
                <FontAwesomeIcon fixedWidth icon={faRegularHeart} />
            </Button>
        ),

        Just: beerId => {
            const checked = favorites.has(beerId);

            return (
                <Button
                    variant="outline-warning"
                    size="sm"
                    onClick={() => dispatch(ToggleFavorite(!checked, beerId))}
                >
                    {checked
                        ? (
                            <FontAwesomeIcon fixedWidth className="text-danger" icon={faHeart} />
                        )
                        : (
                            <FontAwesomeIcon fixedWidth icon={faRegularHeart} />
                        )
                    }
                </Button>
            );
        }
    })
});

const ViewNavbarToggle: React.FC<ButtonProps> = props => (
    <Button {...props} variant="outline-light" size="sm" className="d-sm-none">
        <FontAwesomeIcon fixedWidth icon={faBars} />
    </Button>
);

export const View: React.FC<{
    minBrewedAfter?: MonthPicker.Selected;
    maxBrewedAfter?: MonthPicker.Selected;
    tools: Array<Tool>;
    state: State;
    dispatch(action: Action): void;
}> = ({ minBrewedAfter, maxBrewedAfter, tools, state, dispatch }) => (
    <div className={state.searchBuilder.isJust() ? 'border-bottom' : ''}>
        <Navbar
            bg="dark"
            variant="dark"
            expand="sm"
            expanded={state.expanded}
            onToggle={() => dispatch(ToggleMenu(!state.expanded))}
        >
            <Container fluid className={styles.container}>
                <Navbar.Toggle
                    aria-controls="header-links"
                    as={ViewNavbarToggle}
                    active={state.expanded}
                />

                <Navbar.Brand as={Router.Link} to={Router.ToHome} className="mr-0 mr-sm-3">
                    Hallo
                    <FontAwesomeIcon icon={faBeer} className="text-warning mx-1" />
                    Bier
                </Navbar.Brand>

                <Nav navbar={false} className="order-sm-2">
                    {tools.length > 0 && tools.map(tool => (
                        <Nav.Item key={tool.toString()} className="ml-2">
                            <ViewTool
                                state={state}
                                tool={tool}
                                dispatch={dispatch}
                            />
                        </Nav.Item>
                    ))}
                </Nav>

                <Navbar.Collapse id="header-links">
                    <Nav className="mr-auto">
                        <Nav.Link
                            as={Router.Link}
                            to={Router.ToFavorites({ name: Nothing, brewedAfter: Nothing })}
                        >Favorites</Nav.Link>

                        <Nav.Link
                            as={Router.Link}
                            to={Router.ToRandomBeer}
                        >Random</Nav.Link>
                    </Nav>
                </Navbar.Collapse>
            </Container>
        </Navbar>

        {hasFilterTool(tools) && state.searchBuilder.cata({
            Nothing: () => null,
            Just: searchBuilder => (
                <Container fluid className={`${styles.container} py-2`}>
                    <SearchBuilder.View
                        compact
                        minBrewedAfter={minBrewedAfter}
                        maxBrewedAfter={maxBrewedAfter}
                        state={searchBuilder}
                        dispatch={compose(dispatch, SearchBuilderAction)}
                    />
                </Container>
            )
        })}
    </div>
);
