import { Object3D } from "three";
import { cameraPosition, color, float, instanceIndex, mix, pass, positionWorld, texture, uniform, vec3, vec4, vertexIndex } from "three/tsl";
import { AdditiveBlending, BackSide, BoxGeometry, BufferGeometry, Color, ConstantAlphaFactor, Euler, Float32BufferAttribute, InstancedBufferGeometry, InstancedMesh, MathUtils, Matrix4, Mesh, MeshBasicMaterial, MeshBasicNodeMaterial, NearestFilter, Node, PassNode, PerspectiveCamera, Quaternion, Scene, Texture, Vector3 } from "three/webgpu";
import type { Assets } from "../textures/assets";
import Alea from "alea";

export class Sky {
    public readonly time = uniform(float(0));
    public readonly sunPos = uniform(vec3(0));
    public readonly moonPos = uniform(vec3(0));

    public readonly skyColor = uniform(color(0, 0, 0));
    public readonly fogColor = uniform(color(0, 0, 0));
    public readonly sunlightColor = uniform(color(0, 0, 0));
    public readonly dayFactor = uniform(float(0));
    public readonly starThreshold = uniform(float(0));

    public readonly scene = new Scene;

    public sky?: Object3D;
    public sun?: Object3D;
    public moon?: Object3D;
    public stars?: Object3D;

    public readonly renderPass: PassNode;
    public readonly camera = new PerspectiveCamera;

    private skyColorLUT?: ImageData;

    public constructor(
        private readonly assets: Assets
    ) {
        this.renderPass = pass(this.scene, this.camera);
    }

    public create(seed: number) {
        const moonTextureSource = this.assets.getTextureOrThrow("base:environment/moon.png");
        const skyLutTextureSource = this.assets.getTextureOrThrow("base:environment/sky.png");

        const skyPos = positionWorld.sub(cameraPosition).normalize();
        const celestialFade = skyPos.y.div(skyPos.x.pow2().add(skyPos.z.pow2())).remapClamp(-0.2, 0.2, 0, 1).smoothstep(0, 1);

        this.sky = this.createSky(skyPos);
        this.sun = this.createSun(celestialFade);
        this.moon = this.createMoon(celestialFade, moonTextureSource);
        this.stars = this.createStars(4000, seed);

        this.scene.add(this.sun, this.moon, this.stars, this.sky);
        
        const lutCtx = new OffscreenCanvas(
            skyLutTextureSource.width, skyLutTextureSource.height
        ).getContext("2d")!;

        lutCtx.drawImage(skyLutTextureSource, 0, 0);

        this.skyColorLUT = lutCtx.getImageData(0, 0,
            skyLutTextureSource.width, skyLutTextureSource.height);
    }

    private createSky(skyPos: Node<"vec3">) {
        const skyColorRaw = this.skyColor.mul(skyPos.dot(this.sunPos.normalize()).remap(-1, 1, 0, 1).smoothstep(0, 1).remapClamp(0, 1, 0.5, 1)).toVar();

        return new Mesh(
            new BoxGeometry(50, 50, 50),
            new MeshBasicNodeMaterial({
                colorNode: mix(
                    vec3(
                        skyColorRaw.r.smoothstep(0, 1),
                        skyColorRaw.g.smoothstep(0, 1),
                        skyColorRaw.b.smoothstep(0, 1)
                    ),
                    this.fogColor,
                    skyPos.y.div(skyPos.x.pow2().add(skyPos.z.pow2())).remapClamp(0.1, 0.6, 1, 0).smoothstep(0, 1)
                ),
                side: BackSide
            })
        );
    }

    private createSun(celestialFade: Node<"float">) {
        const sunInner = new Mesh(
            new BoxGeometry(2, 2, 2),
            new MeshBasicNodeMaterial({
                colorNode: vec4(1, 1, 1, celestialFade),
                transparent: true,
            })
        );
        const sunOuter = new Mesh(
            new BoxGeometry(2.5, 2.5, 2.5),
            new MeshBasicNodeMaterial({
                colorNode: vec4(1, 1, 0, celestialFade),
                transparent: true,
                side: BackSide,
                blending: AdditiveBlending
            })
        );

        const sun = new Object3D();
        sun.add(sunInner, sunOuter);

        return sun;
    }

    private createMoon(celestialFade: Node<"float">, moonTextureSource: ImageBitmap) {
        const moonTexture = new Texture(moonTextureSource);
        moonTexture.magFilter = NearestFilter;
        moonTexture.needsUpdate = true;

        const moonGeometry = new BufferGeometry;
        moonGeometry.setAttribute("position", new Float32BufferAttribute([
            1, -1, 1,
            1, -1, -1,
            1, 1, -1,
            1, 1, 1,

            1, -1, -1,
            -1, -1, -1,
            -1, 1, -1,
            1, 1, -1,

            -1, 1, 1,
            1, 1, 1,
            1, 1, -1,
            -1, 1, -1
        ], 3));
        moonGeometry.setAttribute("uv", new Float32BufferAttribute([
            0, 0,
            0.5, 0,
            0.5, 0.5,
            0, 0.5,

            0.5, 0,
            1, 0,
            1, 0.5,
            0.5, 0.5,

            0, 0.5,
            0.5, 0.5,
            0.5, 1,
            0, 1
        ], 2));
        moonGeometry.setIndex([
            0, 1, 2,
            2, 3, 0,

            4, 5, 6,
            6, 7, 4,

            8, 9, 10,
            10, 11, 8
        ]);

        const moonInner = new Mesh(
            moonGeometry,
            new MeshBasicNodeMaterial({
                colorNode: vec4(texture(moonTexture).rgb, celestialFade),
                depthWrite: false,
                depthTest: false,
                transparent: true
            })
        );
        const moonOuter = new Mesh(
            new BoxGeometry(2.5, 2.5, 2.5),
            new MeshBasicNodeMaterial({
                colorNode: vec4(0.3, 0.3, 0.3, celestialFade),
                transparent: true,
                blending: AdditiveBlending,
                side: BackSide,
                depthWrite: false,
                depthTest: false
            })
        );

        const moon = new Object3D;
        moon.add(moonInner, moonOuter);

        return moon;
    }

    private createStars(starCount: number, seed: number) {
        const starGeometry = new BufferGeometry();

        const random = Alea(seed);

        starGeometry.setAttribute("position", new Float32BufferAttribute([
            -0.5, -0.5, 0,
            0.5, -0.5, 0,
            0.5, 0.5, 0,
            -0.5, 0.5, 0
        ], 3));
        starGeometry.setIndex([ 0, 1, 2, 2, 3, 0 ]);

        const starMaterial = new MeshBasicNodeMaterial({
            colorNode: vec3(float(instanceIndex).div(starCount).sub(this.starThreshold).max(0).pow2()),
            blending: AdditiveBlending,
            depthWrite: false
        });

        const mesh = new InstancedMesh(starGeometry, starMaterial, starCount);
        mesh.frustumCulled = false;
        mesh.instanceMatrix.needsUpdate = true;


        const pos = new Vector3;
        const up = new Vector3(0, 0, 1);
        const dir = new Vector3;
        const scale = new Vector3;
        const matrix = new Matrix4;
        const quat1 = new Quaternion;
        const quat2 = new Quaternion;

        for(let i = 0; i < starCount; i++) {
            do {
                pos.set(
                    random() - 0.5,
                    random() - 0.5,
                    random() - 0.5
                );
            } while(pos.length() > 0.5);

            pos.normalize();
            dir.copy(pos).multiplyScalar(-1);
            pos.multiplyScalar(25);

            quat1.setFromUnitVectors(up, dir);
            quat2.setFromAxisAngle(dir, random() * Math.PI * 2);

            const size = (i / starCount) * 0.1;
            scale.set(size, size, size);

            matrix.compose(
                pos,
                quat2.multiply(quat1),
                scale
            );

            mesh.setMatrixAt(i, matrix);
        }
        mesh.instanceMatrix.needsUpdate = true;

        return mesh;
    }

    public updateCamera(baseCamera: PerspectiveCamera) {
        this.camera.fov = baseCamera.fov;
        this.camera.aspect = baseCamera.aspect;
        this.camera.quaternion.copy(baseCamera.quaternion);
        this.camera.updateProjectionMatrix();
    }

    private getSkyColor(time: number, fog: number): Color {
        if(this.skyColorLUT == null) return new Color;
        const LUT = this.skyColorLUT;

        const x = fog * LUT.width;
        const y = time * LUT.height;

        const i = (x: number, y: number) => {
            x %= LUT.width;
            y %= LUT.height;
            return (x + y * LUT.width) * 4;
        }

        const nnR = LUT.data[i(Math.floor(x), Math.floor(y)) + 0]!;
        const nnG = LUT.data[i(Math.floor(x), Math.floor(y)) + 1]!;
        const nnB = LUT.data[i(Math.floor(x), Math.floor(y)) + 2]!;

        const npR = LUT.data[i(Math.floor(x), Math.ceil(y)) + 0]!;
        const npG = LUT.data[i(Math.floor(x), Math.ceil(y)) + 1]!;
        const npB = LUT.data[i(Math.floor(x), Math.ceil(y)) + 2]!;

        const pnR = LUT.data[i(Math.ceil(x), Math.floor(y)) + 0]!;
        const pnG = LUT.data[i(Math.ceil(x), Math.floor(y)) + 1]!;
        const pnB = LUT.data[i(Math.ceil(x), Math.floor(y)) + 2]!;

        const ppR = LUT.data[i(Math.ceil(x), Math.ceil(y)) + 0]!;
        const ppG = LUT.data[i(Math.ceil(x), Math.ceil(y)) + 1]!;
        const ppB = LUT.data[i(Math.ceil(x), Math.ceil(y)) + 2]!;

        return new Color(
            MathUtils.lerp(
                MathUtils.lerp(nnR, npR, y % 1),
                MathUtils.lerp(pnR, ppR, y % 1),
                x % 1
            ) / 255,
            MathUtils.lerp(
                MathUtils.lerp(nnG, npG, y % 1),
                MathUtils.lerp(pnG, ppG, y % 1),
                x % 1
            ) / 255,
            MathUtils.lerp(
                MathUtils.lerp(nnB, npB, y % 1),
                MathUtils.lerp(pnB, ppB, y % 1),
                x % 1
            ) / 255
        )
    }

    public update() {
        const time = this.time.value;
        const fogColor = this.fogColor.value;
        const skyColor = this.skyColor.value;
        const sunlightColor = this.sunlightColor.value;

        const dayRot = (time - 0.25) * Math.PI * 2;

        const sunEuler = new Euler(dayRot, 0, 0, "ZXY");
        const sunPos = new Vector3(0, 10, 0).applyEuler(sunEuler);

        const starEuler = new Euler(dayRot * 0.567, dayRot * 0.102, 0, "ZXY");

        this.sunPos.value.copy(sunPos);
        this.moonPos.value.copy(sunPos.multiplyScalar(-1));

        if(this.moon != null) {
            this.moon.setRotationFromEuler(sunEuler);
            this.moon.rotateX(Math.PI * 0.25);
            this.moon.rotateY(Math.PI * 0.25);
            this.moon.position.copy(this.moonPos.value);
        }

        if(this.sun != null) {
            this.sun.setRotationFromEuler(sunEuler);
            this.sun.rotateX(Math.PI * 0.25);
            this.sun.rotateY(Math.PI * 0.25);
            this.sun.position.copy(this.sunPos.value);
        }

        if(this.stars != null) {
            this.stars.setRotationFromEuler(starEuler);
        }

        const calculatedSkyColor = this.getSkyColor(time % 1, 0);
        calculatedSkyColor.r **= 2;
        calculatedSkyColor.g **= 2;
        calculatedSkyColor.b **= 2;

        const skyLuminance = (calculatedSkyColor.r + calculatedSkyColor.g + calculatedSkyColor.b) / 3;

        sunlightColor.set(
            MathUtils.lerp(calculatedSkyColor.r, skyLuminance, 0.9) * 2,
            MathUtils.lerp(calculatedSkyColor.g, skyLuminance, 0.9) * 2,
            MathUtils.lerp(calculatedSkyColor.b, skyLuminance, 0.9) * 2
        );
        fogColor.set(
            calculatedSkyColor.r,
            calculatedSkyColor.g,
            calculatedSkyColor.b
        );
        skyColor.set(
            calculatedSkyColor.r,
            calculatedSkyColor.g,
            calculatedSkyColor.b
        );

        this.dayFactor.value = MathUtils.clamp(
            MathUtils.mapLinear(
                Math.sin(time * Math.PI * 2),
                -0.1, 0.1, 0, 1
            ), 0, 1
        );

        this.starThreshold.value = MathUtils.smootherstep(
            MathUtils.clamp(
                MathUtils.mapLinear(
                    Math.sin(time * Math.PI * 2),
                    -1, 0.25, 0, 1
                ), 0, 1
            ),
            0, 1
        );
    }
}