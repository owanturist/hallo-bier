export abstract class Action<S, R> {
    private readonly type: string = this.constructor.name;

    public abstract update(state: S): R;

    protected toString() {
        return this.type;
    }
}
