import React from 'react';
import {
    Route as ReactRoute,
    RouteProps,
    Switch,
    match
} from 'react-router-dom';

export type Route
    = { type: 'TO_BEER_LIST' }
    | { type: 'TO_BEER_ITEM'; id: number }
    ;

const ToBeerList: Route = { type: 'TO_BEER_LIST' };
const ToBeerItem = (id: number): Route => ({ type: 'TO_BEER_ITEM', id });

interface PathProps<P> extends RouteProps {
    computedMatch?: match<P>;
    onEnter(match: match): void;
}

class Path<P> extends ReactRoute<PathProps<P>> {
    public componentDidMount() {
        if (this.props.computedMatch) {
            this.props.onEnter(this.props.computedMatch);
        }
    }

    public componentDidUpdate(prevProps: PathProps<P>) {
        if (
            prevProps.computedMatch
            && this.props.computedMatch
            && prevProps.computedMatch.url !== this.props.computedMatch.url
        ) {
            this.props.onEnter(this.props.computedMatch);
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
            onEnter={() => onChange(ToBeerList)}
        />

        <Path
            path="/beer/:id"
            onEnter={(match: match<{ id: string }>) => onChange(ToBeerItem(Number(match.params.id)))}
            />
    </Switch>
);