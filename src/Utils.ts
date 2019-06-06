export abstract class Action<S extends Array<unknown>, R> {
    private readonly type: string = this.constructor.name;

    public abstract update(...args: S): R;

    protected toString() {
        return this.type;
    }
}
