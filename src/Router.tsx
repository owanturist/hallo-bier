import React from 'react';
import {
    Router,
    Switch,
    Route as ReactRoute,
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
import {
    Maybe,
    Nothing,
    Just
} from 'frctl/dist/src/Maybe';
import { Cmd } from 'Cmd';

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

export type Route
    = { type: 'TO_HOME' }
    | { type: 'TO_BEER'; id: number }
    | { type: 'TO_BEER_SEARCH'; name: Maybe<string>; brewedAfter: Maybe<Date> }
    ;

export const ToHome: Route = { type: 'TO_HOME' };
export const ToBeerSearch = (name: Maybe<string>, brewedAfter: Maybe<Date>): Route => ({
    type: 'TO_BEER_SEARCH',
    name,
    brewedAfter
});
export const ToBeer = (id: number): Route => ({ type: 'TO_BEER', id });

const brewedDateToString = (date: Date): string => {
    return date.toLocaleDateString().slice(3);
};

const routeToPath = (route: Route): string => {
    switch (route.type) {
        case 'TO_HOME': {
            return '/';
        }

        case 'TO_BEER_SEARCH': {
            const queryBuilder: Array<[ string, Maybe<string> ]> = [
                [ 'name', route.name.map(percentEncode) ],
                [ 'bra', route.brewedAfter.map(brewedDateToString).map(percentEncode) ]
            ];
            const queryList = queryBuilder.reduce(
                (acc, [ key, value ]) => value.map((val: string) => [ `${key}=${val}`, ...acc ]).getOrElse(acc),
                []
            );

            if (queryList.length === 0) {
                return '/search';
            }

            return '/search?' + queryList.join('&');
        }

        case 'TO_BEER': {
            return `/beer/${route.id}`;
        }
    }
};

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

const history = createBrowserHistory();

export const push = (route: Route): Cmd<never> => {
    return Cmd.of((): void => {
        history.push(routeToPath(route));
    });
};

export const replace = (route: Route): Cmd<never> => {
    return Cmd.of((): void => {
        history.replace(routeToPath(route));
    });
};

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
                path="/search"
                onEnter={(_match: match, loc: Location) => {
                    const qs = queryString.parse(loc.search);
                    const name = Array.isArray(qs.name) ? qs.name[0] : qs.name;
                    const bra = Array.isArray(qs.bra) ? qs.bra[0] : qs.bra;

                    onChange(ToBeerSearch(
                        Maybe.fromNullable(name).chain(percentDecode),
                        Maybe.fromNullable(bra).chain(percentDecode).chain((val: string) => {
                            const fr = val.split('/');

                            if (fr.length !== 2) {
                                return Nothing;
                            }

                            return Just(new Date([ '01' ].concat(fr).join('/')));
                        })
                    ));
                }}
            />

            <Path
                path="/beer/:id"
                onEnter={(match: match<{ id: string }>) => onChange(ToBeer(Number(match.params.id)))}
            />
        </Switch>
        {children}
    </Router>
);

type LinkProps = Pick<ReactLinkProps, Exclude<keyof ReactLinkProps, 'to'>> & {
    to: Route;
};

export const Link: React.FC<LinkProps> = props => (
    <ReactLink {...props} to={routeToPath(props.to)} />
);
