import { BoxGeometry, EdgesGeometry, LineSegments, Vector2, Vector3 } from "three";
import { BufferGeometryUtils, LineMaterial } from "three/examples/jsm/Addons.js";
import { BlockState } from "../block/block";
import { LineBasicNodeMaterial } from "three/webgpu";

export class BlockStateOutline {
    public readonly mesh: LineSegments;

    private readonly outlines = new Map<BlockState, EdgesGeometry>;
    public currentBlockState: BlockState | null = null;
    private readonly material = new LineBasicNodeMaterial({
        color: 0x000000,
        linewidth: 1,
        transparent: true,
        opacity: 1,
    });

    public constructor() {
        this.mesh = new LineSegments(undefined, this.material);
    }

    public setBlockState(state: BlockState) {
        if (state === this.currentBlockState) return;

        this.currentBlockState = state;
        const outlineGeometry = this.getOutline(state);

        this.mesh.geometry = outlineGeometry;
    }

    private getOutline(state: BlockState) {
        // Check if outline is already cached
        let outlineGeometry = this.outlines.get(state);
        if(outlineGeometry != null) return outlineGeometry;

        // Otherwise create a new outline
        const boxGeometries = new Array;

        const center = new Vector3;
        const size = new Vector3;
        for(const hitbox of state.collider.hitboxes) {
            hitbox.getCenter(center);
            hitbox.getSize(size);
            size.addScalar(1/1024);

            const boxGeometry = new BoxGeometry(size.x, size.y, size.z);
            boxGeometry.translate(center.x, center.y, center.z);

            boxGeometries.push(boxGeometry);
        }
        
        outlineGeometry = new EdgesGeometry(BufferGeometryUtils.mergeGeometries(boxGeometries));
        this.outlines.set(state, outlineGeometry);

        return outlineGeometry;
    }
}