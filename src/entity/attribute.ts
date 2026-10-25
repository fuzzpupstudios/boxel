import type { EventPredicate } from "../events/eventPredicate";
import type { EventCursor } from "../events/eventSheet";

export class AttributeBase {
    constructor(
        public readonly name: string,
        public readonly value: number
    ) {}

    public create() {
        return new Attribute(this);
    }
}

export enum AttributeModifierAction { ADD, MULTIPLY };

export interface AttributeModifier {
    action: AttributeModifierAction;
    value: number;
    condition?: EventPredicate
}
export type AttributeModifierMap = Map<string, AttributeModifier>;

export class Attribute {
    public readonly modifiers = new Map<string, AttributeModifier>;
    public constructor(
        public readonly base: AttributeBase
    ) { }

    private applyModifiers(value: number, modifiers: Iterable<AttributeModifier>, cursor: EventCursor | null) {
        for(const modifier of modifiers) {
            if(modifier.condition && (!cursor || !modifier.condition(cursor))) continue;

            if(modifier.action === AttributeModifierAction.ADD) value += modifier.value;
            if(modifier.action === AttributeModifierAction.MULTIPLY) value *= modifier.value;
        }
        return value;
    }

    public get(cursor: EventCursor | null, additionalModifiers: Iterable<AttributeModifier> | null) {
        let value = this.base.value;

        value = this.applyModifiers(value, this.modifiers.values(), cursor);
        if(additionalModifiers) {
            value = this.applyModifiers(value, additionalModifiers, cursor);
        }

        return value;
    }
}

export class AttributeSet {
    public readonly attributeBases: Set<AttributeBase>;

    public constructor(attributeBases: Iterable<AttributeBase>) {
        this.attributeBases = new Set(attributeBases);
    }

    public extend(attributeBases: Iterable<AttributeBase>) {
        return new AttributeSet([ ...this.attributeBases.values(), ...attributeBases ]);
    }

    public create() {
        return new AttributeMap(this);
    }
}

export class AttributeMap {
    public readonly attributes = new Map<string, Attribute>;
    private readonly modifiers = new Set<AttributeModifierMap>;
    private readonly modifiersByName = new Map<string, Set<AttributeModifier>>;

    public constructor(
        public readonly baseSet: AttributeSet
    ) {
        for(const attribute of baseSet.attributeBases) {
            this.attributes.set(attribute.name, attribute.create());
        }
    }
    
    public addModifierMap(map: AttributeModifierMap) {
        this.modifiers.add(map);

        for(const [ name, value ] of map.entries()) {
            this.modifiersByName.getOrInsertComputed(name, () => new Set).add(value);
        }
    }
    public removeModifierMap(map: AttributeModifierMap) {
        this.modifiers.add(map);

        for(const [ name, value ] of map.entries()) {
            this.modifiersByName.get(name)?.delete(value);
        }
    }

    private getModifiersByName(name: string): Set<AttributeModifier> | null {
        return this.modifiersByName.get(name) ?? null;
    }

    public get(name: string, cursor: EventCursor | null): number | null {
        const attribute = this.attributes.get(name);
        if(attribute == null) return null;

        return attribute.get(cursor, this.getModifiersByName(name));
    }

    public getOrDefault(name: string, defaultValue: number, cursor: EventCursor | null) {
        const attribute = this.attributes.get(name);
        if(attribute == null) return defaultValue;

        return attribute.get(cursor, this.getModifiersByName(name));
    }

    public getOrThrow(name: string, cursor: EventCursor | null) {
        const attribute = this.attributes.get(name);
        if(attribute == null) throw new ReferenceError("Cannot find attribute " + name);

        return attribute.get(cursor, this.getModifiersByName(name));
    }
}