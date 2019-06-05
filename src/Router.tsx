import React from 'react';
import {
    Route as ReactRoute,
    RouteProps,
    Switch,
    match
} from 'react-router-dom';
import {
    Location
} from 'history';
import queryString from 'query-string';
import {
    Maybe, Nothing, Just
} from 'frctl/dist/src/Maybe';

export type Route
    = { type: 'TO_HOME' }
    | { type: 'TO_BEER_LIST'; name: Maybe<string>; brewedAfter: Maybe<Date> }
    | { type: 'TO_BEER_ITEM'; id: number }
    ;

const ToHome: Route = { type: 'TO_HOME' };
const ToBeerList = (name: Maybe<string>, brewedAfter: Maybe<Date>): Route => ({
    type: 'TO_BEER_LIST',
    name,
    brewedAfter
});
const ToBeerItem = (id: number): Route => ({ type: 'TO_BEER_ITEM', id });

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
    onChange(route: Route): void;
}> = ({ onChange }) => (
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

                onChange(ToBeerList(
                    Maybe.fromNullable(name).chain((val: string) => val === '' ? Nothing : Just(val)),
                    Maybe.fromNullable(bra).chain((val: string) => {
                        const fr = val.split('_');

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
            onEnter={(match: match<{ id: string }>) => onChange(ToBeerItem(Number(match.params.id)))}
        />
    </Switch>
);
