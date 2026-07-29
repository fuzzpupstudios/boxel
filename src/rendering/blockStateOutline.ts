import { BoxGeometry, EdgesGeometry, LineSegments, Vector3 } from "three";
import { BufferGeometryUtils } from "three/examples/jsm/Addons.js";
import { LineBasicNodeMaterial } from "three/webgpu";
import { getUnknownBlockState } from "../block/blockRegistry";
import { BlockState } from "../block/blockState";

export class BlockStateOutline {
    public readonly mesh: LineSegments;

    private readonly outlines = new Map<BlockState, EdgesGeometry>;
    public currentBlockState: BlockState | null = null;
    private readonly material = new LineBasicNodeMaterial({
        color: 0x000000
    });

    public constructor() {
        this.mesh = new LineSegments(undefined, this.material);
    }

    public setBlockState(state: BlockState) {
        if(state === this.currentBlockState) return;
        if(state == null) state = getUnknownBlockState();

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

        if(boxGeometries.length === 0) boxGeometries.push(new BoxGeometry);
        outlineGeometry = new EdgesGeometry(BufferGeometryUtils.mergeGeometries(boxGeometries));
        this.outlines.set(state, outlineGeometry);

        return outlineGeometry;
    }
}