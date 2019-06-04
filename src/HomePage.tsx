import React from 'react';
import {
    Container,
    Row,
    Col,
    InputGroup,
    FormControl,
    Button,
    FormControlProps
} from 'react-bootstrap';
import { Cmd } from 'Cmd';

export type Action
    = Readonly<{ type: 'CHANGE_QUERY'; q: string }>
    | Readonly<{ type: 'SEARCH' }>
    ;

const Search: Action = { type: 'SEARCH' };
const ChangeQuery = (q: string): Action => ({ type: 'CHANGE_QUERY', q });

export type State = Readonly<{
    query: string;
}>;

export const init = (): [ State, Cmd<Action> ] => [
    {
        query: ''
    },
    Cmd.none
];

export const update = (action: Action, state: State): [ State, Cmd<Action> ] => {
    switch (action.type) {
        case 'CHANGE_QUERY': {
            return [
                { ...state, query: action.q },
                Cmd.none
            ];
        }

        case 'SEARCH': {
            return [ state, Cmd.none ];
        }
    }
};

export const View: React.FC<{
    state: State;
    dispatch(action: Action): void;
}> = ({ state, dispatch }) => (
    <Container>
        <Row>
            <Col
                sm={{ span: 10, offset: 1 }}
            >
                <form
                    noValidate
                    onSubmit={(event: React.FormEvent) => {
                        dispatch(Search);

                        event.preventDefault();
                    }}
                >
                    <InputGroup>
                        <FormControl
                            type="search"
                            value={state.query}
                            tabIndex={1}
                            onChange={(event: React.ChangeEvent<FormControlProps>) => {
                                dispatch(ChangeQuery(event.currentTarget.value || ''));
                            }}
                            placeholder="Search for a beer"
                        />
                        <InputGroup.Append>
                            <Button
                                type="submit"
                                variant="outline-primary"
                                tabIndex={1}
                                disabled={state.query.trim().length === 0}
                            >
                                Search
                            </Button>
                        </InputGroup.Append>
                    </InputGroup>
                </form>
            </Col>
        </Row>
    </Container>
);
