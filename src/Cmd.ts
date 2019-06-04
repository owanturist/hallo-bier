export type Done<T> = (action: T) => void;

export abstract class Cmd<T> {
    public static get none(): Cmd<never> {
        return Batch.EMPTY;
    }

    public static of<T>(cast: (done: Done<T>) => void): Cmd<T> {
        return new Unit(cast);
    }

    public static batch<T>(cmds: Array<Cmd<T>>): Cmd<T> {
        switch (cmds.length) {
            case 0: {
                return Cmd.none;
            }

            case 1: {
                return cmds[0];
            }

            default: {
                return new Batch(cmds);
            }
        }
    }

    protected static execute<T>(cmd: Cmd<T>, done: Done<T>): void {
        cmd.execute(done);
    }

    public abstract map<R>(fn: (action: T) => R): Cmd<R>;

    protected abstract execute(done: Done<T>): void;
}

abstract class Executor extends Cmd<never> {
    public static execute<T>(cmd: Cmd<T>, done: Done<T>): void {
        super.execute(cmd, done);
    }
}

class Batch<T> extends Cmd<T> {
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

    protected execute(done: Done<T>): void {
        for (const cmd of this.cmds) {
            Executor.execute(cmd, done);
        }
    }
}

class Unit<T> extends Cmd<T> {
    public constructor(
        private readonly cast: (done: Done<T>) => void
    ) {
        super();
    }

    public map<R>(fn: (action: T) => R): Cmd<R> {
        return new Unit((done: (action: R) => void): void => {
            this.cast((action: T): void => done(fn(action)));
        });
    }

    protected execute(done: Done<T>): void {
        this.cast(done);
    }
}
