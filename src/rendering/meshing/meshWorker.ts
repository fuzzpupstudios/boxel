import { ThreadReceiver } from "../../multithreading/receiver";
import { createChunkMesher } from "./chunkMesher";
import type { MesherWorkerConfig } from "./meshWorkerConfig";
import { MeshCache, TileCache } from "./tileRendering";

const receiver = new ThreadReceiver<MesherWorkerConfig>;
const config = await receiver.getConfig();

const meshCache = MeshCache.deserialize(config.meshCache);
const tileCache = new TileCache(config.tileCache, meshCache);

const mesher = createChunkMesher(config.geometryData);

receiver.setHandler("mesh", () => {
    const vertexCount = mesher(meshCache, tileCache);

    receiver.send({
        type: "mesh",
        vertexCount
    })
});

receiver.ready();