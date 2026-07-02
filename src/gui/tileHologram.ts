import { Container, Geometry, Mesh, Shader, State, Texture } from "pixi.js";
import type { TextureAtlas } from "../assets/textureAtlas";
import { blockStateRegistry } from "../block/blockRegistry";
import type { TileFace, TileMesh } from "../rendering/chunkMesher";

const vertex = `
in vec3 aPosition;
in vec3 aNormal;
in vec2 aUv;
out vec2 vUv;
out vec3 vNormal;

uniform mat3 uProjectionMatrix;
uniform mat3 uWorldTransformMatrix;

uniform mat3 uTransformMatrix;


void main() {
    vec2 projectedPosition = vec2(
        aPosition.x - aPosition.z,
        aPosition.y * -1.25 + (aPosition.x + aPosition.z) * 0.5
    );
    float depth = -(aPosition.x + aPosition.y + aPosition.z) * 0.001;

    mat3 mvp = uProjectionMatrix * uWorldTransformMatrix * uTransformMatrix;
    gl_Position = vec4((mvp * vec3(projectedPosition, 1.0)).xy, depth, 1.0);
    vUv = aUv;
    vNormal = aNormal;
}
`;

const fragment = `
varying vec2 vUv;
varying vec3 vNormal;

uniform sampler2D uTerrainTexture;

void main() {
    vec4 terrainColor = texture2D(uTerrainTexture, vUv);
    if(terrainColor.a < 0.1) discard;

    float brightness = 1.0;

    if(vNormal.z != 0.0) brightness = 0.8;
    if(vNormal.x != 0.0) brightness = 0.6;
    
    gl_FragColor = vec4(terrainColor.rgb * brightness, 1.0);
}
`

export class TileHologramProvider {
    private readonly tileGeometries = new Map<string, Geometry>;
    private readonly meshState: State;
    private readonly shader: Shader;

    public constructor(textureAtlas: TextureAtlas) {
        for(const [ id, state ] of blockStateRegistry.entries()) {
            this.tileGeometries.set(id, this.buildModel(state.model.compile()));
        }

        const terrainTexture = Texture.from(textureAtlas.packedTexture.image as HTMLCanvasElement);
        this.shader = Shader.from({
            gl: { vertex, fragment },
            resources: {
                uTerrainTexture: terrainTexture.source,
                uSampler: terrainTexture.source.style
            }
        });

        this.meshState = State.for2d();
        this.meshState.depthTest = true;
        this.meshState.depthMask = true;
    }

    public createBlockStateMesh(blockStateId: string) {
        let geometry = this.tileGeometries.get(blockStateId);
        geometry ||= this.tileGeometries.get("base:axes[default]");
        if(geometry == null) return null;

        const shader = this.shader;

        const mesh = new Mesh({
            geometry, shader, state: this.meshState
        });

        return mesh;
    }

    private buildModel(model: TileMesh) {
        const positions = new Array<number>;
        const normals = new Array<number>;
        const uvs = new Array<number>;
        const indices = new Array<number>;

        let vertexCount = 0;

        const addData = (face: TileFace, normalX: number, normalY: number, normalZ: number) => {
            normals.push(
                normalX, normalY, normalZ,
                normalX, normalY, normalZ,
                normalX, normalY, normalZ,
                normalX, normalY, normalZ
            );
            uvs.push(
                face.uvMinX, 1 - face.uvMinY,
                face.uvMinX, 1 - face.uvMaxY,
                face.uvMaxX, 1 - face.uvMaxY,
                face.uvMaxX, 1 - face.uvMinY
            );
            indices.push(
                vertexCount + 0, vertexCount + 3, vertexCount + 2,
                vertexCount + 2, vertexCount + 1, vertexCount + 0
            );
            vertexCount += 4;
        }

        // North
        for(const face of model.north.toReversed()) {
            positions.push(
                face.x, face.y, face.z,
                face.x, face.y + face.height, face.z,
                face.x + face.width, face.y + face.height, face.z,
                face.x + face.width, face.y, face.z,
            );
            addData(face, 0, 0, 1);
        }

        // South
        for(const face of model.south.toReversed()) {
            positions.push(
                face.x, face.y, face.z,
                face.x, face.y + face.height, face.z,
                face.x - face.width, face.y + face.height, face.z,
                face.x - face.width, face.y, face.z,
            );
            addData(face, 0, 0, -1);
        }

        // East
        for(const face of model.east.toReversed()) {
            positions.push(
                face.x, face.y, face.z,
                face.x, face.y + face.height, face.z,
                face.x, face.y + face.height, face.z - face.width,
                face.x, face.y, face.z - face.width,
            );
            addData(face, 1, 0, 0);
        }

        // West
        for(const face of model.west.toReversed()) {
            positions.push(
                face.x, face.y, face.z,
                face.x, face.y + face.height, face.z,
                face.x, face.y + face.height, face.z + face.width,
                face.x, face.y, face.z + face.width,
            );
            addData(face, -1, 0, 0);
        }

        // Up
        for(const face of model.up.toReversed()) {
            positions.push(
                face.x, face.y, face.z,
                face.x, face.y, face.z - face.height,
                face.x + face.width, face.y, face.z - face.height,
                face.x + face.width, face.y, face.z,
            );
            addData(face, 0, 1, 0);
        }

        // Down
        for(const face of model.down.toReversed()) {
            positions.push(
                face.x, face.y, face.z,
                face.x, face.y, face.z + face.height,
                face.x + face.width, face.y, face.z + face.height,
                face.x + face.width, face.y, face.z,
            );
            addData(face, 0, -1, 0);
        }

        const geometry = new Geometry;
        geometry.addAttribute("aPosition", positions);
        geometry.addAttribute("aNormal", normals);
        geometry.addAttribute("aUv", uvs);
        geometry.addIndex(indices);

        return geometry;
    }
}

export class TileHologram extends Container {
    private _blockStateId: string = "";

    public constructor(
        private readonly hologramProvider: TileHologramProvider
    ) {
        super();
    }

    public get blockStateId() {
        return this._blockStateId;
    }
    public set blockStateId(blockStateId: string) {
        if(blockStateId == this._blockStateId) return;

        this._blockStateId = blockStateId;
        this.updateModel();
    }

    private updateModel() {
        this.removeChildren();

        const mesh = this.hologramProvider.createBlockStateMesh(this._blockStateId);
        if(mesh !== null) {
            this.addChild(mesh);
        }
    }
}