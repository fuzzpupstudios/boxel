import type { EventAction } from "../eventAction";
import { parameter } from "../eventVariable";
import n from "../eventVariableTypes";

export function debugLogAction(args: unknown): EventAction {
    const parsed = n.String.parse(args);

    const text = parameter(parsed);

    return (cursor) => {
        console.log(text(cursor));
    }
}