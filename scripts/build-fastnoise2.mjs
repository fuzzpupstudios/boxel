import { existsSync, mkdirSync, rmSync, copyFileSync, renameSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const FASTNOISE2_VERSION = "v1.1.1";
const FASTNOISE2_TARBALL_URL = `https://github.com/Auburn/FastNoise2/archive/refs/tags/${FASTNOISE2_VERSION}.tar.gz`;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const cacheRoot = path.join(projectRoot, ".cache", "fastnoise2");
const downloadsRoot = path.join(cacheRoot, "downloads");
const sourceRoot = path.join(cacheRoot, "FastNoise2");
const buildRoot = path.join(cacheRoot, "build");
const nativeProjectRoot = path.join(projectRoot, "native", "fastnoise2");
const artifactPath = path.join(buildRoot, "artifacts", "fastnoise2.js");
const outputPath = path.join(projectRoot, "src", "fastnoise", "generated", "fastnoise2.js");
const tarballPath = path.join(downloadsRoot, `${FASTNOISE2_VERSION}.tar.gz`);

function run(command, args, options = {}) {
    const result = spawnSync(command, args, {
        cwd: projectRoot,
        stdio: "inherit",
        ...options,
    });

    if (result.error) {
        throw result.error;
    }
    if (result.status !== 0) {
        throw new Error(`${command} exited with code ${result.status ?? "unknown"}`);
    }
}

function requireCommand(command) {
    const result = spawnSync("bash", ["-lc", `command -v ${command}`], {
        cwd: projectRoot,
        encoding: "utf8",
    });

    if (result.status !== 0) {
        throw new Error(`Required command '${command}' was not found in PATH`);
    }
}

function ensureFastNoise2Source() {
    if (existsSync(sourceRoot)) {
        return;
    }

    mkdirSync(downloadsRoot, { recursive: true });

    if (!existsSync(tarballPath)) {
        run("curl", ["--fail", "--location", "--output", tarballPath, FASTNOISE2_TARBALL_URL]);
    }

    const extractRoot = cacheRoot;
    const extractedDir = path.join(extractRoot, `FastNoise2-${FASTNOISE2_VERSION.slice(1)}`);

    rmSync(sourceRoot, { recursive: true, force: true });
    rmSync(extractedDir, { recursive: true, force: true });
    mkdirSync(extractRoot, { recursive: true });

    run("tar", ["-xzf", tarballPath, "-C", extractRoot]);

    if (!existsSync(extractedDir)) {
        throw new Error(`FastNoise2 archive did not extract to ${extractedDir}`);
    }

    rmSync(sourceRoot, { recursive: true, force: true });
    renameSync(extractedDir, sourceRoot);
}

function buildBridge() {
    mkdirSync(buildRoot, { recursive: true });

    run("emcmake", [
        "cmake",
        "-S", nativeProjectRoot,
        "-B", buildRoot,
        `-DFASTNOISE2_SOURCE_DIR=${sourceRoot}`,
        "-DCMAKE_BUILD_TYPE=Release",
    ]);

    run("cmake", [
        "--build", buildRoot,
        "--config", "Release",
        "--target", "fastnoise2_bridge",
    ]);

    if (!existsSync(artifactPath)) {
        throw new Error(`Expected FastNoise2 bridge artifact at ${artifactPath}`);
    }

    mkdirSync(path.dirname(outputPath), { recursive: true });
    copyFileSync(artifactPath, outputPath);
}

function main() {
    requireCommand("emcmake");
    requireCommand("cmake");
    requireCommand("curl");
    requireCommand("tar");

    ensureFastNoise2Source();
    buildBridge();
}

main();
