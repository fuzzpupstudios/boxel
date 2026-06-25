import { describe, it, expect } from 'vitest';
import { DataDrivenBlock } from '../src/block/dataDrivenBlock';
import type { DataDrivenJson } from '../src/data/dataDrivenJson';

describe('DataDrivenBlock', () => {
  describe('basic block creation', () => {
    it('should create a block from JSON data', () => {
      const blockData: DataDrivenJson.Block = {
        states: [
          {
            model: {
              north: [],
              east: [],
              south: [],
              west: [],
              up: [],
              down: [],
            },
          },
        ],
      };

      const block = new DataDrivenBlock(blockData);
      expect(block).toBeDefined();
      expect(block).toBeInstanceOf(DataDrivenBlock);
    });

    it('should have multiple states', () => {
      const blockData: DataDrivenJson.Block = {
        states: [
          {
            model: {
              north: [],
              east: [],
              south: [],
              west: [],
              up: [],
              down: [],
            },
          },
          {
            model: {
              skipRender: true,
              north: [],
              east: [],
              south: [],
              west: [],
              up: [],
              down: [],
            },
          },
        ],
      };

      const block = new DataDrivenBlock(blockData);
      const states = block.getStates();
      expect(states).toHaveLength(2);
    });
  });

  describe('model face parsing', () => {
    it('should parse faces on all sides', () => {
      const blockData: DataDrivenJson.Block = {
        states: [
          {
            model: {
              north: [
                {
                  pos: [0, 0, 0],
                  size: [16, 16],
                  uv: [0, 0, 1, 1],
                },
              ],
              east: [
                {
                  pos: [16, 0, 0],
                  size: [16, 16],
                  uv: [0, 0, 1, 1],
                },
              ],
              south: [
                {
                  pos: [0, 0, 16],
                  size: [16, 16],
                  uv: [0, 0, 1, 1],
                },
              ],
              west: [
                {
                  pos: [0, 0, 0],
                  size: [16, 16],
                  uv: [0, 0, 1, 1],
                },
              ],
              up: [
                {
                  pos: [0, 16, 0],
                  size: [16, 16],
                  uv: [0, 0, 1, 1],
                },
              ],
              down: [
                {
                  pos: [0, 0, 0],
                  size: [16, 16],
                  uv: [0, 0, 1, 1],
                },
              ],
            },
          },
        ],
      };

      const block = new DataDrivenBlock(blockData);
      const states = block.getStates();
      const model = states[0]!.model;

      expect(model.north).toHaveLength(1);
      expect(model.east).toHaveLength(1);
      expect(model.south).toHaveLength(1);
      expect(model.west).toHaveLength(1);
      expect(model.up).toHaveLength(1);
      expect(model.down).toHaveLength(1);
    });

    it('should parse face properties correctly', () => {
      const blockData: DataDrivenJson.Block = {
        states: [
          {
            model: {
              north: [
                {
                  pos: [1, 2, 3],
                  size: [8, 10],
                  uv: [0.1, 0.2, 0.9, 0.8],
                  cull: false,
                },
              ],
              east: [],
              south: [],
              west: [],
              up: [],
              down: [],
            },
          },
        ],
      };

      const block = new DataDrivenBlock(blockData);
      const states = block.getStates();
      const northFace = states[0]!.model.north[0]!;

      expect(northFace.x).toBe(1);
      expect(northFace.y).toBe(2);
      expect(northFace.z).toBe(3);
      expect(northFace.width).toBe(8);
      expect(northFace.height).toBe(10);
      expect(northFace.uvMinX).toBe(0.1);
      expect(northFace.uvMinY).toBe(0.2);
      expect(northFace.uvMaxX).toBe(0.9);
      expect(northFace.uvMaxY).toBe(0.8);
      expect(northFace.cull).toBe(false);
    });

    it('should default cull to true when not specified', () => {
      const blockData: DataDrivenJson.Block = {
        states: [
          {
            model: {
              north: [
                {
                  pos: [0, 0, 0],
                  size: [16, 16],
                  uv: [0, 0, 1, 1],
                },
              ],
              east: [],
              south: [],
              west: [],
              up: [],
              down: [],
            },
          },
        ],
      };

      const block = new DataDrivenBlock(blockData);
      const northFace = block.getStates()[0]!.model.north[0]!;
      expect(northFace.cull).toBe(true);
    });

    it('should handle multiple faces on one side', () => {
      const blockData: DataDrivenJson.Block = {
        states: [
          {
            model: {
              north: [
                {
                  pos: [0, 0, 0],
                  size: [8, 8],
                  uv: [0, 0, 0.5, 0.5],
                },
                {
                  pos: [8, 0, 0],
                  size: [8, 8],
                  uv: [0.5, 0, 1, 0.5],
                },
                {
                  pos: [0, 8, 0],
                  size: [8, 8],
                  uv: [0, 0.5, 0.5, 1],
                },
              ],
              east: [],
              south: [],
              west: [],
              up: [],
              down: [],
            },
          },
        ],
      };

      const block = new DataDrivenBlock(blockData);
      const northFaces = block.getStates()[0]!.model.north;
      expect(northFaces).toHaveLength(3);
      expect(northFaces[0]!.x).toBe(0);
      expect(northFaces[1]!.x).toBe(8);
      expect(northFaces[2]!.x).toBe(0);
    });
  });

  describe('model occlusion defaults', () => {
    it('should default all occlusion to true', () => {
      const blockData: DataDrivenJson.Block = {
        states: [
          {
            model: {
              north: [],
              east: [],
              south: [],
              west: [],
              up: [],
              down: [],
            },
          },
        ],
      };

      const block = new DataDrivenBlock(blockData);
      const model = block.getStates()[0]!.model;

      expect(model.occludeNorth).toBe(true);
      expect(model.occludeEast).toBe(true);
      expect(model.occludeSouth).toBe(true);
      expect(model.occludeWest).toBe(true);
      expect(model.occludeUp).toBe(true);
      expect(model.occludeDown).toBe(true);
    });

    it('should respect occlude flag for all sides', () => {
      const blockData: DataDrivenJson.Block = {
        states: [
          {
            model: {
              occlude: false,
              north: [],
              east: [],
              south: [],
              west: [],
              up: [],
              down: [],
            },
          },
        ],
      };

      const block = new DataDrivenBlock(blockData);
      const model = block.getStates()[0]!.model;

      expect(model.occludeNorth).toBe(false);
      expect(model.occludeEast).toBe(false);
      expect(model.occludeSouth).toBe(false);
      expect(model.occludeWest).toBe(false);
      expect(model.occludeUp).toBe(false);
      expect(model.occludeDown).toBe(false);
    });

    it('should allow per-side occlusion override', () => {
      const blockData: DataDrivenJson.Block = {
        states: [
          {
            model: {
              occlude: true,
              occludeNorth: false,
              occludeUp: false,
              north: [],
              east: [],
              south: [],
              west: [],
              up: [],
              down: [],
            },
          },
        ],
      };

      const block = new DataDrivenBlock(blockData);
      const model = block.getStates()[0]!.model;

      expect(model.occludeNorth).toBe(false);
      expect(model.occludeEast).toBe(true);
      expect(model.occludeSouth).toBe(true);
      expect(model.occludeWest).toBe(true);
      expect(model.occludeUp).toBe(false);
      expect(model.occludeDown).toBe(true);
    });
  });

  describe('skipRender flag', () => {
    it('should default skipRender to false', () => {
      const blockData: DataDrivenJson.Block = {
        states: [
          {
            model: {
              north: [],
              east: [],
              south: [],
              west: [],
              up: [],
              down: [],
            },
          },
        ],
      };

      const block = new DataDrivenBlock(blockData);
      const model = block.getStates()[0]!.model;
      expect(model.skipRender).toBe(false);
    });

    it('should respect skipRender flag', () => {
      const blockData: DataDrivenJson.Block = {
        states: [
          {
            model: {
              skipRender: true,
              north: [],
              east: [],
              south: [],
              west: [],
              up: [],
              down: [],
            },
          },
        ],
      };

      const block = new DataDrivenBlock(blockData);
      const model = block.getStates()[0]!.model;
      expect(model.skipRender).toBe(true);
    });
  });

  describe('complex block definitions', () => {
    it('should handle textured cube block', () => {
      const blockData: DataDrivenJson.Block = {
        states: [
          {
            model: {
              north: [
                {
                  pos: [0, 0, 0],
                  size: [16, 16],
                  uv: [0, 0, 1, 1],
                },
              ],
              east: [
                {
                  pos: [16, 0, 0],
                  size: [16, 16],
                  uv: [0, 0, 1, 1],
                },
              ],
              south: [
                {
                  pos: [0, 0, 16],
                  size: [16, 16],
                  uv: [0, 0, 1, 1],
                },
              ],
              west: [
                {
                  pos: [0, 0, 0],
                  size: [16, 16],
                  uv: [0, 0, 1, 1],
                },
              ],
              up: [
                {
                  pos: [0, 16, 0],
                  size: [16, 16],
                  uv: [0, 0, 1, 1],
                },
              ],
              down: [
                {
                  pos: [0, 0, 0],
                  size: [16, 16],
                  uv: [0, 0, 1, 1],
                },
              ],
            },
          },
        ],
      };

      const block = new DataDrivenBlock(blockData);
      const states = block.getStates();
      expect(states).toHaveLength(1);

      const model = states[0]!.model;
      expect(model.north).toHaveLength(1);
      expect(model.east).toHaveLength(1);
      expect(model.south).toHaveLength(1);
      expect(model.west).toHaveLength(1);
      expect(model.up).toHaveLength(1);
      expect(model.down).toHaveLength(1);
    });

    it('should handle log-like block with rotatable states', () => {
      const blockData: DataDrivenJson.Block = {
        states: [
          // Vertical log
          {
            model: {
              north: [{ pos: [0, 0, 0], size: [16, 16], uv: [0, 0, 1, 1] }],
              east: [{ pos: [16, 0, 0], size: [16, 16], uv: [0, 0, 1, 1] }],
              south: [{ pos: [0, 0, 16], size: [16, 16], uv: [0, 0, 1, 1] }],
              west: [{ pos: [0, 0, 0], size: [16, 16], uv: [0, 0, 1, 1] }],
              up: [{ pos: [0, 16, 0], size: [16, 16], uv: [0.25, 0.25, 0.75, 0.75] }],
              down: [{ pos: [0, 0, 0], size: [16, 16], uv: [0.25, 0.25, 0.75, 0.75] }],
            },
          },
          // Horizontal log (axis=x)
          {
            model: {
              north: [{ pos: [0, 0, 0], size: [16, 16], uv: [0.25, 0.25, 0.75, 0.75] }],
              east: [{ pos: [16, 0, 0], size: [16, 16], uv: [0, 0, 1, 1] }],
              south: [{ pos: [0, 0, 16], size: [16, 16], uv: [0.25, 0.25, 0.75, 0.75] }],
              west: [{ pos: [0, 0, 0], size: [16, 16], uv: [0, 0, 1, 1] }],
              up: [{ pos: [0, 16, 0], size: [16, 16], uv: [0, 0, 1, 1] }],
              down: [{ pos: [0, 0, 0], size: [16, 16], uv: [0, 0, 1, 1] }],
            },
          },
        ],
      };

      const block = new DataDrivenBlock(blockData);
      const states = block.getStates();
      expect(states).toHaveLength(2);
    });

    it('should handle transparent block with selective rendering', () => {
      const blockData: DataDrivenJson.Block = {
        states: [
          {
            model: {
              occlude: false,
              north: [
                {
                  pos: [2, 2, 0],
                  size: [12, 12],
                  uv: [0.125, 0.125, 0.875, 0.875],
                  cull: false,
                },
              ],
              east: [
                {
                  pos: [16, 2, 2],
                  size: [12, 12],
                  uv: [0.125, 0.125, 0.875, 0.875],
                  cull: false,
                },
              ],
              south: [
                {
                  pos: [2, 2, 16],
                  size: [12, 12],
                  uv: [0.125, 0.125, 0.875, 0.875],
                  cull: false,
                },
              ],
              west: [
                {
                  pos: [0, 2, 2],
                  size: [12, 12],
                  uv: [0.125, 0.125, 0.875, 0.875],
                  cull: false,
                },
              ],
              up: [
                {
                  pos: [2, 16, 2],
                  size: [12, 12],
                  uv: [0.125, 0.125, 0.875, 0.875],
                  cull: false,
                },
              ],
              down: [
                {
                  pos: [2, 0, 2],
                  size: [12, 12],
                  uv: [0.125, 0.125, 0.875, 0.875],
                  cull: false,
                },
              ],
            },
          },
        ],
      };

      const block = new DataDrivenBlock(blockData);
      const model = block.getStates()[0]!.model;

      expect(model.occludeNorth).toBe(false);
      expect(model.occludeEast).toBe(false);
      expect(model.occludeSouth).toBe(false);
      expect(model.occludeWest).toBe(false);
      expect(model.occludeUp).toBe(false);
      expect(model.occludeDown).toBe(false);

      expect(model.north[0]!.cull).toBe(false);
      expect(model.east[0]!.cull).toBe(false);
    });
  });

  describe('empty face arrays', () => {
    it('should handle missing face arrays', () => {
      const blockData: DataDrivenJson.Block = {
        states: [
          {
            model: {},
          },
        ],
      };

      const block = new DataDrivenBlock(blockData);
      const model = block.getStates()[0]!.model;

      expect(model.north).toEqual([]);
      expect(model.east).toEqual([]);
      expect(model.south).toEqual([]);
      expect(model.west).toEqual([]);
      expect(model.up).toEqual([]);
      expect(model.down).toEqual([]);
    });

    it('should allow partial face definitions', () => {
      const blockData: DataDrivenJson.Block = {
        states: [
          {
            model: {
              north: [
                {
                  pos: [0, 0, 0],
                  size: [16, 16],
                  uv: [0, 0, 1, 1],
                },
              ],
            },
          },
        ],
      };

      const block = new DataDrivenBlock(blockData);
      const model = block.getStates()[0]!.model;

      expect(model.north).toHaveLength(1);
      expect(model.east).toEqual([]);
      expect(model.south).toEqual([]);
      expect(model.west).toEqual([]);
    });
  });
});
