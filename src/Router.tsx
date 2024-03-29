import React from 'react';
import {
    Router,
    Switch,
    Route as ReactRoute,
    Redirect,
    RouteProps,
    Link as ReactLink,
    LinkProps as ReactLinkProps,
    match
} from 'react-router-dom';
import {
    Location,
    createBrowserHistory
} from 'history';
import queryString from 'query-string';
import { Maybe, Nothing, Just } from 'frctl/dist/Maybe';
import { Cata } from 'frctl/dist/Basics';
import Cmd from 'Cmd';
import * as Utils from './Utils';

const history = createBrowserHistory();

export interface SearchFilter {
    name: Maybe<string>;
    brewedAfter: Maybe<Date>;
}

export const areSearchFiltersEqual = (left: SearchFilter, right: SearchFilter): boolean => {
    return left.name.isEqual(right.name)
        && left.brewedAfter.map(date => date.getTime()).isEqual(
            right.brewedAfter.map(date => date.getTime())
        );
};

const percentDecode = (str: string): Maybe<string> => {
    try {
        return Just(decodeURIComponent(str));
    } catch (err) {
        return Nothing;
    }
};

const percentEncode = (str: string): string => {
    return encodeURIComponent(str);
};

export type RouterPattern<R> = Cata<{
    ToHome(): R;
    ToBeer(beerId: number): R;
    ToRandomBeer(): R;
    ToBeerSearch(filter: SearchFilter): R;
    ToFavorites(filter: SearchFilter): R;
}>;

export abstract class Route {
    private readonly type: string = this.constructor.name;

    public abstract toPath(): string;

    public abstract cata<R>(pattern: RouterPattern<R>): R;

    public abstract isEqual(another: Route): boolean;

    public push(): Cmd<never> {
        return Cmd.of((): void => {
            history.push(this.toPath());
        });
    }

    public replace(): Cmd<never> {
        return Cmd.of((): void => {
            history.replace(this.toPath());
        });
    }

    protected toString(): string {
        return this.type;
    }
}

export const ToHome = Utils.inst<Route>(
    class ToHome extends Route {
        public toPath(): string {
            return '/';
        }

        public cata<R>(pattern: RouterPattern<R>): R {
            if (typeof pattern.ToHome === 'function') {
                return pattern.ToHome();
            }

            return (pattern._ as () => R)();
        }

        public isEqual(another: Route): boolean {
            return another.cata({
                ToHome: () => true,
                _: () => false
            });
        }
    }
);

export const ToBeer = Utils.cons<[ number ], Route>(
    class ToBeer extends Route {
        public constructor(private readonly id: number) {
            super();
        }

        public toPath(): string {
            return `/beer/${this.id}`;
        }

        public cata<R>(pattern: RouterPattern<R>): R {
            if (typeof pattern.ToBeer === 'function') {
                return pattern.ToBeer(this.id);
            }

            return (pattern._ as () => R)();
        }

        public isEqual(another: Route): boolean {
            return another.cata({
                ToBeer: beerId => beerId === this.id,
                _: () => false
            });
        }
    }
);

export const ToRandomBeer: Route = Utils.inst(
    class ToRandomBeer extends Route {
        public toPath(): string {
            return '/random';
        }

        public cata<R>(pattern: RouterPattern<R>): R {
            if (typeof pattern.ToRandomBeer === 'function') {
                return pattern.ToRandomBeer();
            }

            return (pattern._ as () => R)();
        }

        public isEqual(another: Route): boolean {
            return another.cata({
                ToRandomBeer: () => true,
                _: () => false
            });
        }
    }
);

abstract class ToRouteWithFilter extends Route {
    public static parseFilter(loc: Location): SearchFilter {
        const qs = queryString.parse(loc.search);
        const name = Array.isArray(qs.name) ? qs.name[0] : qs.name;
        const bra = Array.isArray(qs.bra) ? qs.bra[0] : qs.bra;

        return {
            name: Maybe.fromNullable(name).chain(percentDecode),
            brewedAfter: Maybe.fromNullable(bra).chain(percentDecode).chain(Utils.parseDate)
        };
    }

    private static brewedDateToString(date: Date): string {
        return [ date.getMonth() + 1, date.getFullYear() ].join('/');
    }

    public constructor(protected readonly filter: SearchFilter) {
        super();
    }

    protected toQueryString(): string {
        const queryBuilder: Array<[ string, Maybe<string> ]> = [
            [ 'name', this.filter.name.map(percentEncode) ],
            [ 'bra', this.filter.brewedAfter.map(ToRouteWithFilter.brewedDateToString).map(percentEncode) ]
        ];
        const queryList = queryBuilder.reduce(
            (acc, [ key, value ]) => value.map((val: string) => [ `${key}=${val}`, ...acc ]).getOrElse(acc),
            []
        );

        if (queryList.length === 0) {
            return '';
        }

        return '?' + queryList.join('&');
    }
}

export const ToBeerSearch = Utils.cons<[ SearchFilter ], Route>(
    class ToBeerSearch extends ToRouteWithFilter {
        public toPath(): string {
            return '/search' + this.toQueryString();
        }

        public cata<R>(pattern: RouterPattern<R>): R {
            if (typeof pattern.ToBeerSearch === 'function') {
                return pattern.ToBeerSearch(this.filter);
            }

            return (pattern._ as () => R)();
        }

        public isEqual(another: Route): boolean {
            return another.cata({
                ToBeerSearch: filter => areSearchFiltersEqual(filter, this.filter),
                _: () => false
            });
        }
    }
);

export const ToFavorites = Utils.cons<[ SearchFilter ], Route>(
    class ToFavorites extends ToRouteWithFilter {
        public toPath(): string {
            return '/favorites' + this.toQueryString();
        }

        public cata<R>(pattern: RouterPattern<R>): R {
            if (typeof pattern.ToFavorites === 'function') {
                return pattern.ToFavorites(this.filter);
            }

            return (pattern._ as () => R)();
        }

        public isEqual(another: Route): boolean {
            return another.cata({
                ToFavorites: filter => areSearchFiltersEqual(filter, this.filter),
                _: () => false
            });
        }
    }
);

interface PathProps<P> extends RouteProps {
    computedMatch?: match<P>;
    onEnter(match: match, location?: Location): void;
}

class Path<P> extends ReactRoute<PathProps<P>> {
    public componentDidMount() {
        if (this.props.computedMatch) {
            this.props.onEnter(this.props.computedMatch, this.props.location);
        }
    }

    public componentDidUpdate(prevProps: PathProps<P>) {
        if (this.props.computedMatch && prevProps.location !== this.props.location) {
            this.props.onEnter(this.props.computedMatch, this.props.location);
        }
    }
}

export const View: React.FC<{
    children: React.ReactNode;
    onChange(route: Route): void;
}> = ({ children, onChange }) => (
    <Router history={history}>
        <Switch>
            <Path
                exact
                path="/"
                onEnter={() => onChange(ToHome)}
            />

            <Path
                path="/beer/:id"
                onEnter={(match: match<{ id: string }>) => onChange(
                    ToBeer(Number(match.params.id))
                )}
            />

            <Path
                path="/random"
                onEnter={() => onChange(ToRandomBeer)}
            />

            <Path
                path="/search"
                onEnter={(_match, loc: Location) => onChange(
                    ToBeerSearch(ToRouteWithFilter.parseFilter(loc))
                )}
            />

            <Path
                path="/favorites"
                onEnter={(_match, loc: Location) => onChange(
                    ToFavorites(ToRouteWithFilter.parseFilter(loc))
                )}
            />

            <Redirect to={ToHome.toPath()}/>
        </Switch>
        {children}
    </Router>
);

type LinkProps = Pick<ReactLinkProps, Exclude<keyof ReactLinkProps, 'to'>> & {
    to: Route;
};

export const Link: React.FC<LinkProps> = props => (
    <ReactLink {...props} to={props.to.toPath()} />
);
