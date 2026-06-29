import * as z from "zod";

export type Settings = z.infer<typeof Settings>;
export const Settings = z.object({
    invertX: z.boolean().default(false),
    invertY: z.boolean().default(false),
    mouseSensitivity: z.number().default(1),
    controllerSensitivity: z.number().default(1),
    controllerDeadzone: z.number().default(0.1),
});