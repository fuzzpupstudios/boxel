import { Object3D } from "three";
import { cameraPosition, float, mix, pass, positionWorld, sample, texture, uniform, uv, vec3, vec4 } from "three/tsl";
import { AdditiveBlending, BackSide, BoxGeometry, BufferGeometry, Color, ConstantAlphaFactor, Euler, Float32BufferAttribute, MathUtils, Mesh, MeshBasicMaterial, MeshBasicNodeMaterial, MeshNormalNodeMaterial, NearestFilter, PassNode, PerspectiveCamera, Scene, Texture, Vector3 } from "three/webgpu";
import type { Assets } from "../textures/assets";

export class Sky {
    public readonly time = uniform(float(0));
    public readonly sunPos = uniform(vec3(0));
    public readonly moonPos = uniform(vec3(0));

    public readonly skyColor = uniform(vec3(0, 0, 0));
    public readonly fogColor = uniform(vec3(0, 0, 0));
    public readonly sunlightColor = uniform(vec3(0, 0, 0));
    public readonly dayFactor = uniform(float(0));

    public readonly scene = new Scene;

    public readonly fog: Object3D;
    public readonly sky: Object3D;
    public readonly sun: Object3D;
    public readonly moon: Object3D;

    public readonly renderPass: PassNode;
    public readonly camera = new PerspectiveCamera;

    private readonly skyColorLUT: ImageData;

    public constructor(assets: Assets) {
        this.renderPass = pass(this.scene, this.camera);

        const skyPos = positionWorld.sub(cameraPosition).normalize();

        this.fog = new Mesh(
            new BoxGeometry(1, 1, 1),
            new MeshBasicNodeMaterial({
                colorNode: vec4(
                    this.fogColor,
                    skyPos.y.div(skyPos.x.pow2().add(skyPos.z.pow2())).remapClamp(0, 0.25, 1, 0).smoothstep(0, 1)
                ),
                side: BackSide,
                transparent: true,
                blendAlpha: ConstantAlphaFactor
            })
        );

        const skyColorRaw = this.skyColor.sub(skyPos.dot(this.sunPos.normalize()).remap(-1, 1, 1, 0).smoothstep(0, 1).remapClamp(0, 1, 0, 0.2)).toVar();

        this.sky = new Mesh(
            new BoxGeometry(50, 50, 50),
            new MeshBasicNodeMaterial({
                colorNode: vec3(
                    skyColorRaw.r.smoothstep(0, 1),
                    skyColorRaw.g.smoothstep(0, 1),
                    skyColorRaw.b.smoothstep(0, 1)
                ),
                side: BackSide
            })
        );

        const sunInner = new Mesh(
            new BoxGeometry(2, 2, 2),
            new MeshBasicMaterial({ color: 0xffffff })
        );
        const sunOuter = new Mesh(
            new BoxGeometry(2.5, 2.5, 2.5),
            new MeshBasicMaterial({
                color: 0xffff00,
                transparent: true,
                opacity: 0.5,
                blending: AdditiveBlending
            })
        );

        this.sun = new Object3D();
        this.sun.add(sunInner, sunOuter);

        const moonTextureSource = assets.textureRegistry.get("base:environment/moon.png");
        console.log(moonTextureSource);
        if(moonTextureSource == null) throw new ReferenceError("Cannot find moon texture map base:environment/moon.png");

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
            new MeshBasicMaterial({
                map: moonTexture
            })
        );
        const moonOuter = new Mesh(
            new BoxGeometry(2.5, 2.5, 2.5),
            new MeshBasicMaterial({
                color: 0xffffff,
                transparent: true,
                blendAlpha: ConstantAlphaFactor,
                opacity: 0.05,
                side: BackSide
            })
        );

        this.moon = new Object3D;
        this.moon.add(moonInner, moonOuter);

        this.scene.add(this.fog, this.sky, this.sun, this.moon);


        {
            const image = assets.textureRegistry.get("base:environment/sky.png");
            if(image == null) throw new ReferenceError("Cannot find sky environment map base:environment/sky.png");

            const canvas = new OffscreenCanvas(image.width, image.height);
            const ctx = canvas.getContext("2d")!;
            ctx.drawImage(image, 0, 0);
            this.skyColorLUT = ctx.getImageData(0, 0, image.width, image.height);
        }
    }

    public updateCamera(baseCamera: PerspectiveCamera) {
        this.camera.fov = baseCamera.fov;
        this.camera.aspect = baseCamera.aspect;
        this.camera.quaternion.copy(baseCamera.quaternion);
        this.camera.updateProjectionMatrix();
    }

    private getSkyColor(time: number, fog: number): Color {
        const x = fog * this.skyColorLUT.width;
        const y = time * this.skyColorLUT.height;

        const i = (x: number, y: number) => {
            x %= this.skyColorLUT.width;
            y %= this.skyColorLUT.height;
            return (x + y * this.skyColorLUT.width) * 4;
        }

        const nnR = this.skyColorLUT.data[i(Math.floor(x), Math.floor(y)) + 0]!;
        const nnG = this.skyColorLUT.data[i(Math.floor(x), Math.floor(y)) + 1]!;
        const nnB = this.skyColorLUT.data[i(Math.floor(x), Math.floor(y)) + 2]!;

        const npR = this.skyColorLUT.data[i(Math.floor(x), Math.ceil(y)) + 0]!;
        const npG = this.skyColorLUT.data[i(Math.floor(x), Math.ceil(y)) + 1]!;
        const npB = this.skyColorLUT.data[i(Math.floor(x), Math.ceil(y)) + 2]!;

        const pnR = this.skyColorLUT.data[i(Math.ceil(x), Math.floor(y)) + 0]!;
        const pnG = this.skyColorLUT.data[i(Math.ceil(x), Math.floor(y)) + 1]!;
        const pnB = this.skyColorLUT.data[i(Math.ceil(x), Math.floor(y)) + 2]!;

        const ppR = this.skyColorLUT.data[i(Math.ceil(x), Math.ceil(y)) + 0]!;
        const ppG = this.skyColorLUT.data[i(Math.ceil(x), Math.ceil(y)) + 1]!;
        const ppB = this.skyColorLUT.data[i(Math.ceil(x), Math.ceil(y)) + 2]!;

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

        const euler = new Euler((time - 0.25) * Math.PI * 2, 0, 0, "YZX");
        const sunPos = new Vector3(0, 10, 0).applyEuler(euler);

        this.sunPos.value.copy(sunPos);
        this.moonPos.value.copy(sunPos.multiplyScalar(-1));

        this.moon.setRotationFromEuler(euler);
        this.moon.rotateX(Math.PI * 0.25);
        this.moon.rotateY(Math.PI * 0.25);
        this.moon.position.copy(this.moonPos.value);

        this.sun.setRotationFromEuler(euler);
        this.sun.rotateX(Math.PI * 0.25);
        this.sun.rotateY(Math.PI * 0.25);
        this.sun.position.copy(this.sunPos.value);

        const calculatedSkyColor = this.getSkyColor(time % 1, 0);
        calculatedSkyColor.r **= 2;
        calculatedSkyColor.g **= 2;
        calculatedSkyColor.b **= 2;

        sunlightColor.set(
            Math.min(calculatedSkyColor.r * 1.5, 1),
            Math.min(calculatedSkyColor.g * 1.5, 1),
            Math.min(calculatedSkyColor.b * 1.5, 1)
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

        this.dayFactor.value = MathUtils.clamp(MathUtils.mapLinear(Math.abs(0.5 - time), -0.025, 0, 0, 1), 0, 1);
        console.log(this.dayFactor.value);
    }
}