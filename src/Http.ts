import { Cata } from 'frctl/dist/Basics';
import { Maybe, Nothing, Just } from 'frctl/dist/Maybe';
import { Either, Left, Right } from 'frctl/dist/Either';
import Cmd, { Executor } from 'Cmd';
import * as Decode from 'frctl/dist/Json/Decode';
import * as Encode from 'frctl/dist/Json/Encode';

/* H E L P E R S */

const queryEscape = (str: string): string => encodeURIComponent(str).replace(/%20/g, '+');

const queryPair = ([ key, value ]: [ string, string ]): string => queryEscape(key) + '=' + queryEscape(value);

const buildUrlWithQuery = (url: string, queryParams: Array<[ string, string ]>): string => {
    if (queryParams.length === 0) {
        return url;
    }

    return url + '?' + queryParams.map(queryPair).join('&');
};

const parseHeaders = (rawHeaders: string): {[ name: string ]: string } => {
    const headers: {[ name: string ]: string } = {};

    if (!rawHeaders) {
        return headers;
    }

    const headerPairs = rawHeaders.split('\u000d\u000a');

    for (const headerPair of headerPairs) {
        const delimiterIndex = headerPair.indexOf('\u003a\u0020');

        if (delimiterIndex > 0) {
            const key = headerPair.substring(0, delimiterIndex);
            const value = headerPair.substring(delimiterIndex + 2);
            const oldValue = headers[ key ];

            headers[ key ] = oldValue ? value + ', ' + oldValue : value;
        }
    }

    return headers;
};

/* E R R O R */

export type ErrorPattern<T> = Cata<{
    BadUrl(url: string): T;
    Timeout(): T;
    NetworkError(): T;
    BadStatus(response: Response<string>): T;
    BadBody(error: Decode.Error, response: Response<string>): T;
}>;

export abstract class Error {
    public static BadUrl(url: string): Error {
        return new BadUrlError(url);
    }

    public static get Timeout(): Error {
        return Timeout.SINGLETON;
    }

    public static get NetworkError(): Error {
        return NetworkError.SINGLETON;
    }

    public static BadStatus(response: Response<string>): Error {
        return new BadStatus(response);
    }

    public static BadBody(error: Decode.Error, response: Response<string>): Error {
        return new BadBody(error, response);
    }

    public abstract cata<T>(pattern: ErrorPattern<T>): T;
}

class BadUrlError extends Error {
    constructor(private readonly url: string) {
        super();
    }

    public cata<T>(pattern: ErrorPattern<T>): T {
        if (typeof pattern.BadUrl === 'function') {
            return pattern.BadUrl(this.url);
        }

        return (pattern._ as () => T)();
    }
}

class Timeout extends Error {
    public static SINGLETON: Error = new Timeout();

    public cata<T>(pattern: ErrorPattern<T>): T {
        if (typeof pattern.Timeout === 'function') {
            return pattern.Timeout();
        }

        return (pattern._ as () => T)();
    }
}

class NetworkError extends Error {
    public static SINGLETON: Error = new NetworkError();

    public cata<T>(pattern: ErrorPattern<T>): T {
        if (typeof pattern.NetworkError === 'function') {
            return pattern.NetworkError();
        }

        return (pattern._ as () => T)();
    }
}

class BadStatus extends Error {
    constructor(private readonly response: Response<string>) {
        super();
    }

    public cata<T>(pattern: ErrorPattern<T>): T {
        if (typeof pattern.BadStatus === 'function') {
            return pattern.BadStatus(this.response);
        }

        return (pattern._ as () => T)();
    }
}

class BadBody extends Error {
    constructor(
        private readonly error: Decode.Error,
        private readonly response: Response<string>
    ) {
        super();
    }

    public cata<T>(pattern: ErrorPattern<T>): T {
        if (typeof pattern.BadBody === 'function') {
            return pattern.BadBody(this.error, this.response);
        }

        return (pattern._ as () => T)();
    }
}

/* H E A D E R */

export class Header {
    protected constructor(
        protected readonly name: string,
        protected readonly value: string
    ) {}
}

abstract class PhantomHeader extends Header {
    public static of(name: string, value: string): Header {
        return new Header(name, value);
    }

    public static getName(header: PhantomHeader): string {
        return header.name;
    }

    public static getValue(header: PhantomHeader): string {
        return header.value;
    }
}

export const header = PhantomHeader.of;

/* R E S P O N S E */

export interface Response<T> {
    readonly url: string;
    readonly statusCode: number;
    readonly statusText: string;
    readonly headers: {[ name: string ]: string };
    readonly body: T;
}

/* E X P E C T */

export class Expect<T> {
    protected constructor(
        protected readonly responseType: XMLHttpRequestResponseType,
        protected readonly responseToResult: (response: Response<string>) => Either<Decode.Error, T>
    ) {}
}

abstract class PhantomExpect<T> extends Expect<T> {
    public static of<T>(
        responseType: XMLHttpRequestResponseType,
        responseToResult: (response: Response<string>) => Either<Decode.Error, T>
    ): Expect<T> {
        return new Expect(responseType, responseToResult);
    }

    public static getType<T>(expect: PhantomExpect<T>): XMLHttpRequestResponseType {
        return expect.responseType;
    }

    public static toResult<T>(response: Response<string>, expect: PhantomExpect<T>): Either<Decode.Error, T> {
        return expect.responseToResult(response);
    }
}

export const expectResponse = <T>(
    responseToResult: (response: Response<string>) => Either<Decode.Error, T>
): Expect<T> => PhantomExpect.of('text', responseToResult);

export const expectWhatever: Expect<void> = expectResponse(
    (): Either<Decode.Error, void> => Right(undefined)
);

export const expectString: Expect<string> = expectResponse(
    (response: Response<string>): Either<Decode.Error, string> => Right(response.body)
);

export const expectJson = <T>(decoder: Decode.Decoder<T>): Expect<T> => expectResponse(
    (response: Response<string>): Either<Decode.Error, T> => decoder.decodeJSON(response.body)
);

/* B O D Y */

interface BodyContent {
    type: string;
    value: string;
}

export class Body {
    protected constructor(
        protected readonly content: Maybe<BodyContent>
    ) {}
}

abstract class PhantomBody extends Body {
    public static of(content: Maybe<BodyContent>): Body {
        return new Body(content);
    }

    public static getContent(body: PhantomBody): Maybe<BodyContent> {
        return body.content;
    }
}

export const emptyBody: Body = PhantomBody.of(Nothing);

export const stringBody = (type: string, value: string): Body => PhantomBody.of(Just({ type, value }));

export const jsonBody = (encoder: Encode.Encoder): Body => stringBody('application/json', encoder.encode(4));

/* R E Q U E S T */

interface RequestConfig<T> {
    method: string;
    url: string;
    headers: Array<Header>;
    body: Body;
    expect: Expect<T>;
    timeout: Maybe<number>;
    withCredentials: boolean;
    queryParams: Array<[ string, string ]>;
}

export class Request<T> {
    protected constructor(private readonly config: Readonly<RequestConfig<T>>) {}

    public withHeader(name: string, value: string): Request<T> {
        return this.withHeaders([ header(name, value) ]);
    }

    public withHeaders(headers: Array<Header>): Request<T> {
        return new Request({
            ...this.config,
            headers: [
                ...headers,
                ...this.config.headers
            ]
        });
    }

    public withBody(body: Body): Request<T> {
        return new Request({
            ...this.config,
            body
        });
    }

    public withStringBody(type: string, value: string): Request<T> {
        return this.withBody(stringBody(type, value));
    }

    public withJsonBody(encoder: Encode.Encoder): Request<T> {
        return this.withBody(jsonBody(encoder));
    }

    public withTimeout(timeout: number): Request<T> {
        return new Request({
            ...this.config,
            timeout: Just(timeout)
        });
    }

    public withoutTimeout(): Request<T> {
        return new Request({
            ...this.config,
            timeout: Nothing
        });
    }

    public withCredentials(enabled: boolean): Request<T> {
        return new Request({
            ...this.config,
            withCredentials: enabled
        });
    }

    public withQueryParam(key: string, value: string): Request<T> {
        return new Request({
            ...this.config,
            queryParams: [
                [ key, value ],
                ...this.config.queryParams
            ]
        });
    }

    public withQueryParams(queries: Array<[ string, string ]>): Request<T> {
        return new Request({
            ...this.config,
            queryParams: [
                ...queries,
                ...this.config.queryParams
            ]
        });
    }

    public withExpect<R>(expect: Expect<R>): Request<R> {
        return new Request({
            ...this.config,
            expect
        });
    }

    public withExpectResponse<R>(
        responseToResult: (response: Response<string>) => Either<Decode.Error, R>
    ): Request<R> {
        return this.withExpect(expectResponse(responseToResult));
    }

    public withExpectString(): Request<string> {
        return this.withExpect(expectString);
    }

    public withExpectJson<R>(decoder: Decode.Decoder<R>): Request<R> {
        return this.withExpect(expectJson(decoder));
    }

    public send<R>(tagger: (result: Either<Error, T>) => R): Cmd<R> {
        if (process.env.NODE_ENV === 'test') {
            return Cmd.of((done: Executor<R>) => {
                Scope.fake(this.config).cata({
                    Nothing: () => {
                        throw new global.Error('Not handled');
                    },

                    Just: ([ status, body ]) => {
                        const stringResponse: Response<string> = {
                            url: this.config.url,
                            statusCode: status,
                            statusText: 'unknown',
                            headers: {},
                            body
                        };

                        if (status < 200 || status >= 300) {
                            done(
                                tagger(Left(Error.BadStatus(stringResponse)))
                            );

                            return;
                        }

                        PhantomExpect.toResult(stringResponse, this.config.expect).cata({
                            Left(decodeError: Decode.Error): void {
                                done(
                                    tagger(Left(Error.BadBody(decodeError, stringResponse)))
                                );
                            },

                            Right(value: T): void {
                                done(
                                    tagger(Right(value))
                                );
                            }
                        });
                    }
                });
            });
        }

        return Cmd.of((done: Executor<R>) => {
            const xhr = new XMLHttpRequest();

            xhr.addEventListener('error', () => {
                done(
                    tagger(Left(Error.NetworkError))
                );
            });

            xhr.addEventListener('timeout', () => {
                done(
                    tagger(Left(Error.Timeout))
                );
            });

            xhr.addEventListener('load', () => {
                const stringResponse: Response<string> = {
                    url: xhr.responseURL,
                    statusCode: xhr.status,
                    statusText: xhr.statusText,
                    headers: parseHeaders(xhr.getAllResponseHeaders()),
                    body: xhr.responseText
                };

                if (xhr.status < 200 || xhr.status >= 300) {
                    done(
                        tagger(Left(Error.BadStatus(stringResponse)))
                    );

                    return;
                }

                PhantomExpect.toResult({
                    ...stringResponse,
                    body: xhr.response as string
                }, this.config.expect).cata({
                    Left(decodeError: Decode.Error): void {
                        done(
                            tagger(Left(Error.BadBody(decodeError, stringResponse)))
                        );
                    },

                    Right(value: T): void {
                        done(
                            tagger(Right(value))
                        );
                    }
                });
            });

            try {
                xhr.open(this.config.method, buildUrlWithQuery(this.config.url, this.config.queryParams), true);
            } catch (e) {
                done(
                    tagger(Left(Error.BadUrl(this.config.url)))
                );

                return;
            }

            for (const requestHeader of this.config.headers) {
                xhr.setRequestHeader(
                    PhantomHeader.getName(requestHeader),
                    PhantomHeader.getValue(requestHeader)
                );
            }

            xhr.responseType = PhantomExpect.getType(this.config.expect);
            xhr.withCredentials = this.config.withCredentials;

            this.config.timeout.cata({
                Nothing(): void {
                    // do nothing
                },

                Just(timeout: number): void {
                    xhr.timeout = timeout;
                }
            });

            PhantomBody.getContent(this.config.body).cata({
                Nothing(): void {
                    xhr.send();
                },

                Just({ type, value }: BodyContent): void {
                    xhr.setRequestHeader('Content-Type', type);
                    xhr.send(value);
                }
            });

            return () => {
                if (xhr.readyState > 0 && xhr.readyState < 4) {
                    xhr.abort();
                }
            };
        });
    }
}

abstract class PhantomRequest<T> extends Request<T> {
    public static of(method: string, url: string): Request<void> {
        return new Request({
            method,
            url,
            headers: [],
            body: emptyBody,
            expect: expectWhatever,
            timeout: Nothing,
            withCredentials: false,
            queryParams: []
        });
    }
}

export const get     = (url: string): Request<void> => PhantomRequest.of('GET', url);
export const post    = (url: string): Request<void> => PhantomRequest.of('GET', url);
export const put     = (url: string): Request<void> => PhantomRequest.of('PUT', url);
export const patch   = (url: string): Request<void> => PhantomRequest.of('PATCH', url);
export const del     = (url: string): Request<void> => PhantomRequest.of('DELETE', url);
export const options = (url: string): Request<void> => PhantomRequest.of('OPTIONS', url);
export const trace   = (url: string): Request<void> => PhantomRequest.of('TRACE', url);
export const head    = (url: string): Request<void> => PhantomRequest.of('HEAD', url);

export class Scope {
    public static cons(url: string): Scope {
        const scope = new Scope(url);

        Scope.scopes.push(scope);

        return scope;
    }

    public static fake<T>(request: RequestConfig<T>): Maybe<[ number, string ]> {
        for (const scope of Scope.scopes) {
            const response = scope.pop(request);

            if (response.isJust()) {
                return response;
            }
        }

        return Nothing;
    }

    private static readonly scopes: Array<Scope> = [];

    private interceptors: Array<Interceptor> = [];

    private constructor(public readonly url: string) {}

    public intercept(method: string, path: string): Interceptor {
        const interceptor = new Interceptor(this, method.toUpperCase(), path);

        this.interceptors.push(interceptor);

        return interceptor;
    }

    public get(path: string): Interceptor {
        return this.intercept('GET', path);
    }

    public post(path: string): Interceptor {
        return this.intercept('POST', path);
    }

    public put(path: string): Interceptor {
        return this.intercept('PUT', path);
    }

    public patch(path: string): Interceptor {
        return this.intercept('PATCH', path);
    }

    public del(path: string): Interceptor {
        return this.intercept('DEL', path);
    }

    public options(path: string): Interceptor {
        return this.intercept('OPTIONS', path);
    }

    public trace(path: string): Interceptor {
        return this.intercept('TRACE', path);
    }

    public head(path: string): Interceptor {
        return this.intercept('HEAD', path);
    }

    private pop<T>(request: RequestConfig<T>): Maybe<[ number, string ]> {
        const acc: Array<Interceptor> = [];
        let response: Maybe<[ number, string ]> = Nothing;

        for (const interceptor of this.interceptors) {
            if (response.isJust()) {
                acc.push(interceptor);
            } else {
                response = interceptor.receive(request).orElse(() => {
                    acc.push(interceptor);

                    return Nothing;
                });
            }
        }

        this.interceptors = acc;

        return response;
    }
}

export class Interceptor {
    private static packQueries(queries: Array<[ string, string ]>): Map<string, Array<string>> {
        const acc: Map<string, Array<string>> = new Map();

        for (const [ key, value ] of queries) {
            const values = acc.get(key);

            if (values) {
                values.push(value);
            } else {
                acc.set(key, [ value ]);
            }
        }

        acc.forEach(arr => arr.sort());

        return acc;
    }

    private readonly queryParams: Array<[ string, string ]> = [];

    private response: Maybe<[ number, string ]> = Nothing;

    public constructor(
        private readonly scope: Scope,
        private readonly method: string,
        private readonly path: string
    ) {}

    public withQueryParam(key: string, value: string): this {
        this.queryParams.push([ key, value ]);

        return this;
    }

    public withQueryParams(queries: Array<[ string, string ]>): this {
        this.queryParams.push(...queries);

        return this;
    }

    public reply(status: number, body?: string | object): Scope {
        this.response = Just<[ number, string ]>([
            status,
            Maybe.fromNullable(body)
                .map(x => typeof x === 'string' ? x : JSON.stringify(x))
                .getOrElse('')
        ]);

        return this.scope;
    }

    public receive<T>(request: RequestConfig<T>): Maybe<[ number, string ]> {
        if (!this.isMatched(request)) {
            return Nothing;
        }

        return this.response;
    }

    private isQueriesMatched(queries: Array<[ string, string ]>): boolean {
        const thisQueries = Interceptor.packQueries(this.queryParams);
        const thatQueries = Interceptor.packQueries(queries);

        for (const [ key, thatValues ] of thisQueries) {
            const thisValues = thatQueries.get(key);


            if (!thisValues) {
                return false;
            }

            for (let i = 0, j = 0; i < thatValues.length; j++) {
                if (j >= thisValues.length) {
                    return false;
                }

                if (thatValues[ i ] === thisValues[ j ]) {
                    i++;
                }
            }
        }

        return true;
    }

    private isMatched<T>(request: RequestConfig<T>): boolean {
        return request.method === this.method
            && request.url === this.scope.url + this.path
            && this.isQueriesMatched(request.queryParams);
    }
}
