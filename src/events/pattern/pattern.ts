import { ItemStack } from "../../item/itemStack";

export type PatternTypeBase = string | number | boolean | ItemStack | { [key: string]: PatternTypeBase };

export class Pattern<T extends PatternTypeBase> {
    public readonly entries = new Set<T>;
    
    public addEntry(entry: T) {
        this.entries.add(entry);
    }

    private matchEquals(query: any, entry: any) {
        if(typeof query === "object" && query != null) {
            for(const key of Object.keys(query)) {
                if(key in entry && this.matchEquals(query[key], entry[key])) continue;

                return false;
            }

            return true;
        } else {
            return entry === query;
        }
    }

    public find(query: any): T | null {
        for(const entry of this.entries) {
            if(this.matchEquals(query, entry)) {
                return entry;
            }
        }
        return null;
    }
}