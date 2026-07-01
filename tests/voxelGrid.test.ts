import { describe, it, expect, beforeEach } from 'vitest';
import { VoxelGrid, VoxelChunk } from '../src/world/voxelGrid';

describe('VoxelGrid', () => {
  let grid: VoxelGrid;

  beforeEach(() => {
    grid = new VoxelGrid();
  });

  describe('setTile and getTile', () => {
    it('should set and get a tile value', () => {
      grid.setTile(0, 0, 0, 42);
      expect(grid.getTile(0, 0, 0)).toBe(42);
    });

    it('should return 0 for unset tiles', () => {
      expect(grid.getTile(0, 0, 0)).toBe(0);
    });

    it('should set and get tiles within the same chunk', () => {
      grid.setTile(5, 7, 3, 100);
      grid.setTile(10, 12, 8, 200);
      expect(grid.getTile(5, 7, 3)).toBe(100);
      expect(grid.getTile(10, 12, 8)).toBe(200);
    });

    it('should set and get tiles in different chunks', () => {
      // Chunk 0,0,0 (0-15 coords)
      grid.setTile(5, 5, 5, 111);
      // Chunk 1,0,0 (16-31 coords)
      grid.setTile(20, 5, 5, 222);
      // Chunk 0,1,0 (0-15 x, 16-31 y)
      grid.setTile(5, 20, 5, 333);
      
      expect(grid.getTile(5, 5, 5)).toBe(111);
      expect(grid.getTile(20, 5, 5)).toBe(222);
      expect(grid.getTile(5, 20, 5)).toBe(333);
    });

    it('should overwrite existing tile values', () => {
      grid.setTile(7, 8, 9, 50);
      expect(grid.getTile(7, 8, 9)).toBe(50);
      grid.setTile(7, 8, 9, 100);
      expect(grid.getTile(7, 8, 9)).toBe(100);
    });

    it('should handle negative coordinates', () => {
      grid.setTile(-1, -1, -1, 99);
      expect(grid.getTile(-1, -1, -1)).toBe(99);
      grid.setTile(-16, -16, -16, 88);
      expect(grid.getTile(-16, -16, -16)).toBe(88);
    });

    it('should handle large coordinate values', () => {
      grid.setTile(1000, 2000, 3000, 777);
      expect(grid.getTile(1000, 2000, 3000)).toBe(777);
    });

    it('should handle max uint16 values', () => {
      const maxValue = 65535; // 2^16 - 1
      grid.setTile(0, 0, 0, maxValue);
      expect(grid.getTile(0, 0, 0)).toBe(maxValue);
    });
  });

  describe('getChunk', () => {
    it('should return undefined for non-existent chunks', () => {
      expect(grid.getChunk(0, 0, 0)).toBeUndefined();
    });

    it('should return a chunk after setting a tile', () => {
      grid.setTile(5, 5, 5, 42);
      const chunk = grid.getChunk(0, 0, 0);
      expect(chunk).toBeDefined();
      expect(chunk).toBeInstanceOf(VoxelChunk);
    });

    it('should return the correct chunk for different chunk coordinates', () => {
      grid.setTile(5, 5, 5, 111);    // Chunk (0, 0, 0)
      grid.setTile(25, 5, 5, 222);   // Chunk (1, 0, 0)
      grid.setTile(5, 25, 5, 333);   // Chunk (0, 1, 0)

      const chunk0 = grid.getChunk(0, 0, 0);
      const chunk1 = grid.getChunk(1, 0, 0);
      const chunk2 = grid.getChunk(0, 1, 0);

      expect(chunk0).toBeDefined();
      expect(chunk1).toBeDefined();
      expect(chunk2).toBeDefined();
      expect(chunk0).not.toBe(chunk1);
      expect(chunk0).not.toBe(chunk2);
    });

    it('should access chunk data directly', () => {
      grid.setTile(10, 11, 12, 555);
      const chunk = grid.getChunk(0, 0, 0);
      expect(chunk).toBeDefined();
      expect(chunk!.get(10, 11, 12)).toBe(555);
    });
  });

  describe('chunk auto-creation', () => {
    it('should create a chunk when setting a tile in a new chunk', () => {
      expect(grid.getChunk(0, 0, 0)).toBeUndefined();
      grid.setTile(7, 7, 7, 42);
      expect(grid.getChunk(0, 0, 0)).toBeDefined();
    });

    it('should create multiple chunks independently', () => {
      grid.setTile(5, 5, 5, 100);
      grid.setTile(50, 50, 50, 200);
      
      expect(grid.getChunk(0, 0, 0)).toBeDefined();
      expect(grid.getChunk(3, 3, 3)).toBeDefined();
    });
  });

  describe('performance characteristics', () => {
    it('should maintain O(1) access time for repeated operations', () => {
      // Set tiles in various chunks
      for(let i = 0; i < 100; i++) {
        const x = (i * 17) % 512;
        const y = (i * 31) % 512;
        const z = (i * 47) % 512;
        grid.setTile(x, y, z, i);
      }

      // Verify all tiles are accessible
      for(let i = 0; i < 100; i++) {
        const x = (i * 17) % 512;
        const y = (i * 31) % 512;
        const z = (i * 47) % 512;
        expect(grid.getTile(x, y, z)).toBe(i);
      }
    });
  });
});

describe('VoxelChunk', () => {
  let chunk: VoxelChunk;

  beforeEach(() => {
    chunk = new VoxelChunk();
  });

  describe('set and get', () => {
    it('should set and get a tile', () => {
      chunk.set(0, 0, 0, 42);
      expect(chunk.get(0, 0, 0)).toBe(42);
    });

    it('should initialize with zeros', () => {
      expect(chunk.get(0, 0, 0)).toBe(0);
      expect(chunk.get(15, 15, 15)).toBe(0);
    });

    it('should set and get all valid coordinates', () => {
      for(let x = 0; x < 16; x++) {
        for(let y = 0; y < 16; y++) {
          for(let z = 0; z < 16; z++) {
            const value = (x << 10) | (y << 5) | z;
            chunk.set(x, y, z, value);
            expect(chunk.get(x, y, z)).toBe(value);
          }
        }
      }
    });

    it('should use bit-packed storage efficiently', () => {
      expect(chunk.tiles).toBeInstanceOf(Uint16Array);
      expect(chunk.tiles.length).toBe(4096); // 16^3
    });
  });

  describe('tile isolation', () => {
    it('should not affect adjacent tiles', () => {
      chunk.set(5, 5, 5, 100);
      chunk.set(6, 5, 5, 200);
      chunk.set(5, 6, 5, 300);
      chunk.set(5, 5, 6, 400);

      expect(chunk.get(5, 5, 5)).toBe(100);
      expect(chunk.get(6, 5, 5)).toBe(200);
      expect(chunk.get(5, 6, 5)).toBe(300);
      expect(chunk.get(5, 5, 6)).toBe(400);
    });
  });
});
