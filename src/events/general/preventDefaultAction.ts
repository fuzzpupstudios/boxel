import type { EventAction } from "../eventAction";

export function preventDefaultAction(): EventAction {
    return (cursor) => cursor.preventDefault();
}