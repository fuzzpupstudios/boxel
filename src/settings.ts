import * as z from "zod";

export type Settings = z.infer<typeof Settings>;
export const Settings = z.object({
    invertX: z.boolean().default(false),
    invertY: z.boolean().default(false),
    pauseIfUnlocked: z.boolean().default(true),
    renderDistance: z.number().default(64),
    dPadScale: z.number().default(1),
    guiScale: z.number().default(2),
    fov: z.number().default(90),
    mouseSensitivity: z.number().default(1),
    controllerSensitivity: z.number().default(1),
    controllerGuiSensitivity: z.number().default(1),
    controllerDeadzone: z.number().default(0.1),
    maxChunkUpdates: z.int().default(16),
    maxColumnLoads: z.int().default(4),
    maxColumnGenerations: z.int().default(1),
});