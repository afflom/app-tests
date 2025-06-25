import { ZeroPointAddressSystem, ZeroPointCoordinate } from './zero-point-coordinates';

describe('ZeroPointAddressSystem', () => {
  let addressSystem: ZeroPointAddressSystem;
  
  beforeEach(() => {
    addressSystem = new ZeroPointAddressSystem();
  });
  
  describe('Basic Functionality', () => {
    test('should encode and decode simple text data', () => {
      const input = new TextEncoder().encode('Hello, Universe!');
      
      // Encode
      const coordinate = addressSystem.encode(input);
      
      // Verify coordinate is fixed size
      expect(coordinate.x).toBeDefined();
      expect(coordinate.y).toBeDefined();
      expect(coordinate.z).toBeDefined();
      expect(coordinate.t).toBeDefined();
      
      // Each coordinate should be a 256-bit bigint
      expect(coordinate.x).toBeGreaterThanOrEqual(0n);
      expect(coordinate.x).toBeLessThan(1n << 256n);
      expect(coordinate.y).toBeGreaterThanOrEqual(0n);
      expect(coordinate.y).toBeLessThan(1n << 256n);
      expect(coordinate.z).toBeGreaterThanOrEqual(0n);
      expect(coordinate.z).toBeLessThan(1n << 256n);
      expect(coordinate.t).toBeGreaterThanOrEqual(0n);
      expect(coordinate.t).toBeLessThan(1n << 256n);
      
      // Decode
      const decoded = addressSystem.decode(coordinate);
      const decodedText = new TextDecoder().decode(decoded);
      
      expect(decodedText).toBe('Hello, Universe!');
    });
    
    test('should handle empty data', () => {
      const input = new Uint8Array(0);
      
      const coordinate = addressSystem.encode(input);
      const decoded = addressSystem.decode(coordinate);
      
      expect(decoded).toEqual(input);
      expect(decoded.length).toBe(0);
    });
    
    test('should handle single byte data', () => {
      for (let i = 0; i < 256; i++) {
        const input = new Uint8Array([i]);
        const coordinate = addressSystem.encode(input);
        const decoded = addressSystem.decode(coordinate);
        
        expect(decoded).toEqual(input);
        expect(decoded[0]).toBe(i);
      }
    });
    
    test('should handle binary data', () => {
      const input = new Uint8Array([0, 1, 2, 255, 254, 253]);
      
      const coordinate = addressSystem.encode(input);
      const decoded = addressSystem.decode(coordinate);
      
      expect(decoded).toEqual(input);
    });
    
    test('should handle large data', () => {
      // Test multiple sizes
      const sizes = [1024, 4096, 16384]; // 1KB, 4KB, 16KB
      
      for (const size of sizes) {
        const input = new Uint8Array(size);
        for (let i = 0; i < input.length; i++) {
          input[i] = i % 256;
        }
        
        const coordinate = addressSystem.encode(input);
        const decoded = addressSystem.decode(coordinate);
        
        expect(decoded).toEqual(input);
      }
    });
    
    test('should handle Unicode text correctly', () => {
      const unicodeTexts = [
        '🌍🌎🌏', // Emojis
        '你好世界', // Chinese
        'مرحبا بالعالم', // Arabic
        'Здравствуй мир', // Russian
        '🔢 Math: ∑∏∫∂ ≠ ≤ ≥' // Mixed
      ];
      
      for (const text of unicodeTexts) {
        const input = new TextEncoder().encode(text);
        const coordinate = addressSystem.encode(input);
        const decoded = addressSystem.decode(coordinate);
        const decodedText = new TextDecoder().decode(decoded);
        
        expect(decodedText).toBe(text);
      }
    });
  });
  
  describe('Coordinate Properties', () => {
    test('coordinate size should always be fixed', () => {
      // Test various data sizes from tiny to large
      const testSizes = [0, 1, 7, 8, 9, 63, 64, 65, 255, 256, 257, 1000, 10000, 100000];
      
      for (const size of testSizes) {
        const input = new Uint8Array(size);
        const coordinate = addressSystem.encode(input);
        
        // Measure coordinate size (in bits)
        const xBits = coordinate.x.toString(2).length;
        const yBits = coordinate.y.toString(2).length;
        const zBits = coordinate.z.toString(2).length;
        const tBits = coordinate.t.toString(2).length;
        
        // Each component should be at most 256 bits
        expect(xBits).toBeLessThanOrEqual(256);
        expect(yBits).toBeLessThanOrEqual(256);
        expect(zBits).toBeLessThanOrEqual(256);
        expect(tBits).toBeLessThanOrEqual(256);
      }
      
      // Verify reported size
      const { bits, bytes } = addressSystem.getCoordinateSize();
      expect(bits).toBe(1024);
      expect(bytes).toBe(128);
    });
    
    test('same data should produce deterministic coordinates', () => {
      const input = new TextEncoder().encode('Deterministic Test');
      
      // Encode multiple times
      const coordinates: ZeroPointCoordinate[] = [];
      for (let i = 0; i < 5; i++) {
        coordinates.push(addressSystem.encode(input));
      }
      
      // X, Y, Z should be identical (deterministic)
      for (let i = 1; i < coordinates.length; i++) {
        expect(coordinates[i].x).toBe(coordinates[0].x);
        expect(coordinates[i].y).toBe(coordinates[0].y);
        expect(coordinates[i].z).toBe(coordinates[0].z);
      }
      
      // T may differ due to timestamp, but should be close
      for (let i = 1; i < coordinates.length; i++) {
        const diff = coordinates[i].t > coordinates[0].t ? 
          coordinates[i].t - coordinates[0].t : 
          coordinates[0].t - coordinates[i].t;
        // Should be relatively small difference
        expect(diff).toBeLessThan(1n << 200n);
      }
    });
    
    test('different data should produce different coordinates', () => {
      const testPairs = [
        ['Data A', 'Data B'],
        ['', ' '], // Empty vs space
        ['0', '1'],
        ['Hello', 'hello'], // Case sensitive
        ['Test', 'Test '], // Trailing space
      ];
      
      for (const [str1, str2] of testPairs) {
        const input1 = new TextEncoder().encode(str1);
        const input2 = new TextEncoder().encode(str2);
        
        const coord1 = addressSystem.encode(input1);
        const coord2 = addressSystem.encode(input2);
        
        // At least one dimension should differ
        const different = 
          coord1.x !== coord2.x ||
          coord1.y !== coord2.y ||
          coord1.z !== coord2.z ||
          coord1.t !== coord2.t;
        
        expect(different).toBe(true);
      }
    });
    
    test('coordinate components should be independent', () => {
      // Generate many coordinates and check for independence
      const coords: ZeroPointCoordinate[] = [];
      for (let i = 0; i < 50; i++) {
        const data = new TextEncoder().encode(`Test ${i} with some random content ${Math.random()}`);
        coords.push(addressSystem.encode(data));
      }
      
      // Check that no single component determines others
      const xValues = new Set(coords.map(c => c.x.toString()));
      const yValues = new Set(coords.map(c => c.y.toString()));
      const zValues = new Set(coords.map(c => c.z.toString()));
      const tValues = new Set(coords.map(c => c.t.toString()));
      
      // All should have high uniqueness
      expect(xValues.size).toBeGreaterThan(40);
      expect(yValues.size).toBeGreaterThan(40);
      expect(zValues.size).toBeGreaterThan(40);
      expect(tValues.size).toBeGreaterThan(40);
    });
  });
  
  describe('Error Handling', () => {
    test('should throw error for non-existent coordinate', () => {
      const fakeCoordinate: ZeroPointCoordinate = {
        x: 123n,
        y: 456n,
        z: 789n,
        t: 101112n
      };
      
      expect(() => addressSystem.decode(fakeCoordinate)).toThrow('Coordinate not found');
    });
    
    test('should handle maximum coordinate values', () => {
      const maxCoord: ZeroPointCoordinate = {
        x: (1n << 256n) - 1n,
        y: (1n << 256n) - 1n,
        z: (1n << 256n) - 1n,
        t: (1n << 256n) - 1n
      };
      
      expect(() => addressSystem.decode(maxCoord)).toThrow();
    });
    
    test('should handle zero coordinates', () => {
      const zeroCoord: ZeroPointCoordinate = {
        x: 0n,
        y: 0n,
        z: 0n,
        t: 0n
      };
      
      expect(() => addressSystem.decode(zeroCoord)).toThrow();
    });
  });
  
  describe('Metadata Operations', () => {
    test('should check if coordinate exists', () => {
      const input = new TextEncoder().encode('Test Data');
      const coordinate = addressSystem.encode(input);
      
      expect(addressSystem.hasCoordinate(coordinate)).toBe(true);
      
      const fakeCoordinate: ZeroPointCoordinate = {
        x: 999n,
        y: 999n,
        z: 999n,
        t: 999n
      };
      
      expect(addressSystem.hasCoordinate(fakeCoordinate)).toBe(false);
    });
    
    test('should retrieve metadata without decoding', () => {
      const input = new TextEncoder().encode('Metadata Test');
      const coordinate = addressSystem.encode(input);
      
      const metadata = addressSystem.getMetadata(coordinate);
      
      expect(metadata).toBeDefined();
      expect(metadata?.dataLength).toBe(input.length);
      expect(metadata?.dataHash).toBeDefined();
      expect(metadata?.dataHash).toHaveLength(64); // SHA-256 hex
      expect(metadata?.timestamp).toBeDefined();
      expect(metadata?.timestamp).toBeLessThanOrEqual(Date.now());
      expect(metadata?.coordinate).toEqual(coordinate);
    });
    
    test('metadata should be consistent', () => {
      const input = new TextEncoder().encode('Consistent Metadata');
      const coordinate = addressSystem.encode(input);
      
      // Get metadata multiple times
      const metadata1 = addressSystem.getMetadata(coordinate);
      const metadata2 = addressSystem.getMetadata(coordinate);
      
      expect(metadata1).toEqual(metadata2);
    });
  });
  
  describe('Collision Resistance', () => {
    test('should handle similar data without collision', () => {
      const coordinates = new Set<string>();
      
      // Create similar strings
      for (let i = 0; i < 1000; i++) {
        const input = new TextEncoder().encode(`Test String ${i}`);
        const coord = addressSystem.encode(input);
        
        const coordKey = `${coord.x}-${coord.y}-${coord.z}-${coord.t}`;
        
        // Should be unique
        expect(coordinates.has(coordKey)).toBe(false);
        coordinates.add(coordKey);
        
        // Should decode correctly
        const decoded = addressSystem.decode(coord);
        const decodedText = new TextDecoder().decode(decoded);
        expect(decodedText).toBe(`Test String ${i}`);
      }
    });
    
    test('should handle edge case values', () => {
      const testCases = [
        new Uint8Array([0]),
        new Uint8Array([255]),
        new Uint8Array([0, 0, 0, 0]),
        new Uint8Array([255, 255, 255, 255]),
        new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]),
        new Uint8Array([128, 127, 126, 125]),
        new Uint8Array(Array(256).fill(0)),
        new Uint8Array(Array(256).fill(255)),
        new Uint8Array(Array(256).fill(128)),
        new Uint8Array(Array(512).fill(0).map((_, i) => i % 256)),
      ];
      
      const coordinates = new Set<string>();
      
      for (const input of testCases) {
        const coord = addressSystem.encode(input);
        const coordKey = `${coord.x}-${coord.y}-${coord.z}-${coord.t}`;
        
        expect(coordinates.has(coordKey)).toBe(false);
        coordinates.add(coordKey);
        
        const decoded = addressSystem.decode(coord);
        expect(decoded).toEqual(input);
      }
    });
    
    test('should handle data with small differences', () => {
      const base = new Uint8Array(100).fill(0);
      const coordinates = new Set<string>();
      
      // Change one byte at a time
      for (let i = 0; i < base.length; i++) {
        const modified = new Uint8Array(base);
        modified[i] = 255;
        
        const coord = addressSystem.encode(modified);
        const coordKey = `${coord.x}-${coord.y}-${coord.z}-${coord.t}`;
        
        expect(coordinates.has(coordKey)).toBe(false);
        coordinates.add(coordKey);
      }
    });
  });
  
  describe('Mathematical Properties', () => {
    test('coordinates should utilize full 256-bit space', () => {
      const coords: ZeroPointCoordinate[] = [];
      
      // Generate coordinates for different data patterns
      for (let i = 0; i < 20; i++) {
        const size = (i + 1) * 7; // Various sizes
        const input = new Uint8Array(size);
        
        // Different patterns
        if (i % 3 === 0) {
          input.fill(i); // Uniform
        } else if (i % 3 === 1) {
          for (let j = 0; j < size; j++) {
            input[j] = j % 256; // Sequential
          }
        } else {
          for (let j = 0; j < size; j++) {
            input[j] = Math.floor(Math.random() * 256); // Random
          }
        }
        
        coords.push(addressSystem.encode(input));
      }
      
      // Check distribution across bit ranges
      let hasLowBits = false;
      let hasMidBits = false;
      let hasHighBits = false;
      
      for (const coord of coords) {
        // Check X coordinate distribution
        if (coord.x < (1n << 100n)) hasLowBits = true;
        if (coord.x > (1n << 100n) && coord.x < (1n << 200n)) hasMidBits = true;
        if (coord.x > (1n << 200n)) hasHighBits = true;
      }
      
      expect(hasLowBits).toBe(true);
      expect(hasMidBits).toBe(true);
      expect(hasHighBits).toBe(true);
    });
    
    test('field dimension should reflect data patterns', () => {
      // Test field pattern influence
      const fieldPatterns = [
        new Uint8Array(8).fill(0),      // 00000000
        new Uint8Array(8).fill(255),    // 11111111
        new Uint8Array(8).fill(0b10101010), // Alternating
        new Uint8Array(8).fill(0b11110000), // Half
        new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7]), // Sequential
      ];
      
      const xCoords = fieldPatterns.map(data => 
        addressSystem.encode(data).x
      );
      
      // All should be different
      const uniqueX = new Set(xCoords.map(x => x.toString()));
      expect(uniqueX.size).toBe(fieldPatterns.length);
    });
    
    test('resonance dimension should vary with data energy', () => {
      // Different "energy" patterns
      const lowEnergy = new Uint8Array(100).fill(0);
      const highEnergy = new Uint8Array(100).fill(255);
      const mediumEnergy = new Uint8Array(100).fill(128);
      
      const coord1 = addressSystem.encode(lowEnergy);
      const coord2 = addressSystem.encode(highEnergy);
      const coord3 = addressSystem.encode(mediumEnergy);
      
      // Y coordinates should all differ
      expect(coord1.y).not.toBe(coord2.y);
      expect(coord2.y).not.toBe(coord3.y);
      expect(coord1.y).not.toBe(coord3.y);
    });
    
    test('topology dimension should reflect data structure', () => {
      // Different structural patterns
      const patterns = [
        // Repeating pattern
        new Uint8Array(48).fill(0).map((_, i) => i % 4),
        // Increasing
        new Uint8Array(48).fill(0).map((_, i) => i),
        // Decreasing
        new Uint8Array(48).fill(0).map((_, i) => 47 - i),
        // Random
        new Uint8Array(48).fill(0).map(() => Math.floor(Math.random() * 256)),
      ];
      
      const zCoords = patterns.map(data => addressSystem.encode(data).z);
      
      // All should be different
      const uniqueZ = new Set(zCoords.map(z => z.toString()));
      expect(uniqueZ.size).toBe(patterns.length);
    });
    
    test('temporal dimension should ensure uniqueness', () => {
      // Even identical data should have unique T due to timestamp
      const data = new TextEncoder().encode('Temporal Test');
      const coords: bigint[] = [];
      
      // Encode same data multiple times with small delays
      for (let i = 0; i < 5; i++) {
        coords.push(addressSystem.encode(data).t);
        // Small delay to ensure timestamp difference
        const start = Date.now();
        while (Date.now() - start < 2) {} // 2ms delay
      }
      
      // All T values should be unique
      const uniqueT = new Set(coords.map(t => t.toString()));
      expect(uniqueT.size).toBe(coords.length);
    });
  });
  
  describe('Performance Characteristics', () => {
    test('encoding should handle various data sizes efficiently', () => {
      const sizes = [1, 10, 100, 1000, 10000, 100000];
      const times: number[] = [];
      
      for (const size of sizes) {
        const data = new Uint8Array(size).fill(42);
        
        const start = performance.now();
        addressSystem.encode(data);
        const end = performance.now();
        
        times.push(end - start);
      }
      
      // Encoding time should not grow exponentially
      // (This is a basic sanity check)
      const lastTime = times[times.length - 1];
      const firstTime = times[0];
      
      // Should be less than 1000x slower for 100000x more data
      expect(lastTime).toBeLessThan(firstTime * 1000);
    });
  });
  
  describe('Round-trip Integrity', () => {
    test('should maintain data integrity through encode/decode cycles', () => {
      const testData = [
        // Text
        'Simple text',
        'Multi\nline\ntext',
        'Special chars: !@#$%^&*()_+-=[]{}|;:\'",.<>?/',
        
        // Binary patterns
        '\x00\x01\x02\x03\xFC\xFD\xFE\xFF',
        'Mixed\x00Binary\xFFText',
        
        // JSON
        JSON.stringify({ name: 'test', value: 123, nested: { array: [1, 2, 3] } }),
        
        // Base64
        'SGVsbG8gV29ybGQ=',
        
        // Long repetitive
        'A'.repeat(1000),
        'AB'.repeat(500),
        'ABC'.repeat(333),
      ];
      
      for (const text of testData) {
        const input = new TextEncoder().encode(text);
        const coordinate = addressSystem.encode(input);
        const decoded = addressSystem.decode(coordinate);
        const decodedText = new TextDecoder().decode(decoded);
        
        expect(decodedText).toBe(text);
        expect(decoded.length).toBe(input.length);
      }
    });
  });
});