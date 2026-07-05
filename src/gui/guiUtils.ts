import type { ButtonContainer } from "@pixi/ui";
import type { Signal } from "typed-signals";

export class GuiUtils {
    public static bindButtonSignals(
        button: ButtonContainer,
        downSignal: Signal<() => void>,
        upSignal: Signal<() => void>
    ) {
        button.addEventListener("pointerdown", (event) => {
            (<Event>event.nativeEvent).stopImmediatePropagation();
            downSignal.emit();
        });
        button.addEventListener("pointerup", (event) => {
            (<Event>event.nativeEvent).stopImmediatePropagation();
            upSignal.emit();
        });
        button.addEventListener("pointerupoutside", (event) => {
            (<Event>event.nativeEvent).stopImmediatePropagation();
            upSignal.emit();
        });
    }
}