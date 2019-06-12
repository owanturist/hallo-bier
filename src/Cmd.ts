export type Executor<T> = (action: T) => void;

abstract class Bag<T> {
    protected static execute<T>(cmd: Cmd<T>, done: Executor<T>): void {
        cmd.execute(done);
    }

    public abstract map<R>(fn: (action: T) => R): Cmd<R>;

    protected abstract execute(done: Executor<T>): void;
}

abstract class CmdExecutor extends Bag<never> {
    public static execute<T>(cmd: Cmd<T>, done: Executor<T>): void {
        super.execute(cmd, done);
    }
}

// tslint:disable-next-line:variable-name
export const __execute__ = CmdExecutor.execute;

export default abstract class Cmd<T> extends Bag<T> {
    public static get none(): Cmd<never> {
        return Batch.EMPTY;
    }

    public static of<T>(cast: (done: Executor<T>) => void): Cmd<T> {
        return new Unit(cast);
    }

    public static batch<T>(cmds: Array<Cmd<T>>): Cmd<T> {
        switch (cmds.length) {
            case 0: {
                return Cmd.none;
            }

            case 1: {
                return cmds[ 0 ];
            }

            default: {
                return new Batch(cmds);
            }
        }
    }

    private constructor() {
        super();
    }

    public abstract map<R>(fn: (action: T) => R): Cmd<R>;
}

class Batch<T> extends Bag<T> {
    public static EMPTY: Cmd<never> = new Batch([]);

    public constructor(
        private readonly cmds: Array<Cmd<T>>
    ) {
        super();
    }

    public map<R>(fn: (action: T) => R): Cmd<R> {
        const acc: Array<Cmd<R>> = [];

        for (const cmd of this.cmds) {
            acc.push(cmd.map(fn));
        }

        return new Batch(acc);
    }

    protected execute(done: Executor<T>): void {
        for (const cmd of this.cmds) {
            __execute__(cmd, done);
        }
    }
}

class Unit<T> extends Bag<T> {
    public constructor(
        private readonly cast: (done: Executor<T>) => void
    ) {
        super();
    }

    public map<R>(fn: (action: T) => R): Cmd<R> {
        return new Unit((done: (action: R) => void): void => {
            this.cast((action: T): void => done(fn(action)));
        });
    }

    protected execute(done: Executor<T>): void {
        this.cast(done);
    }
}
