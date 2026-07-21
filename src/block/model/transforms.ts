import { Vector2, Vector3 } from "three";
import z from "zod";
import type { BlockModel } from "./blockModel";

export const blockModelTransforms: Record<string, (model: BlockModel, params: any) => void> = {
    "rotateX": (model: BlockModel, params: any) => {
        const parsed = z.object({
            angle: z.int(),
            pivot: z.tuple([ z.number(), z.number() ]).default([ 0.5, 0.5 ]),
            transformUVs: z.boolean().default(false)
        }).or(z.number()).parse(params);

        let angle = 0;
        const pivot = new Vector2(0.5, 0.5);
        let transformUVs = false;

        if(typeof parsed == "number") {
            angle = parsed;
        } else {
            angle = parsed.angle;
            pivot.set(...parsed.pivot),
            transformUVs = parsed.transformUVs
        }

        model.rotateX(angle, pivot, transformUVs);
    },
    "rotateY": (model: BlockModel, params: any) => {
        const parsed = z.object({
            angle: z.int(),
            pivot: z.tuple([ z.number(), z.number() ]).default([ 0.5, 0.5 ]),
            transformUVs: z.boolean().default(false)
        }).or(z.number()).parse(params);

        let angle = 0;
        const pivot = new Vector2(0.5, 0.5);
        let transformUVs = false;

        if(typeof parsed == "number") {
            angle = parsed;
        } else {
            angle = parsed.angle;
            pivot.set(...parsed.pivot),
            transformUVs = parsed.transformUVs
        }

        model.rotateY(angle, pivot, transformUVs);
    },
    "rotateZ": (model: BlockModel, params: any) => {
        const parsed = z.object({
            angle: z.int(),
            pivot: z.tuple([ z.number(), z.number() ]).default([ 0.5, 0.5 ]),
            transformUVs: z.boolean().default(false)
        }).or(z.number()).parse(params);

        let angle = 0;
        const pivot = new Vector2(0.5, 0.5);
        let transformUVs = false;

        if(typeof parsed == "number") {
            angle = parsed;
        } else {
            angle = parsed.angle;
            pivot.set(...parsed.pivot),
            transformUVs = parsed.transformUVs
        }

        model.rotateZ(angle, pivot, transformUVs);
    },
    "translate": (model: BlockModel, params: any) => {
        const parsed = z.object({
            x: z.number().default(0),
            y: z.number().default(0),
            z: z.number().default(0),
            transformUVs: z.boolean().default(false)
        }).parse(params);

        model.translate(new Vector3(parsed.x, parsed.y, parsed.z), parsed.transformUVs);
    }
}