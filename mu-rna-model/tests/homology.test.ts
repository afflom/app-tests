/**
 * Exhaustive tests for Homology computation implementation
 */

import { RNAHomology } from '../src/homology';
import { RNAMolecule, NucleotideState, ConformationalFields, Loop, Pocket } from '../src/types';

describe('RNAHomology', () => {
  // Helper function to create test molecule
  function createTestMolecule(sequence: string, pairings: [number, number][] = []): RNAMolecule {
    const states: NucleotideState[] = [];
    const domains = [];
    
    // Create pairing map for exact pairs
    const pairMap = new Map<number, number>();
    for (const [a, b] of pairings) {
      pairMap.set(a, b);
      pairMap.set(b, a);
    }
    
    // Create states
    for (let i = 0; i < sequence.length; i++) {
      const position = i + 1;
      const isPaired = pairMap.has(position);
      const pairedWith = isPaired ? pairMap.get(position)! : 0;
      
      const fields: ConformationalFields = {
        e0: isPaired,
        e1: isPaired, // Stacked if paired
        e2: isPaired, // C3'-endo if paired
        e3: isPaired, // Canonical if paired
        e4: false,
        e5: !isPaired,
        e6: !isPaired,
        e7: false
      };
      
      const state: any = {
        position: position,
        base: sequence[i] as 'A' | 'U' | 'G' | 'C',
        fields,
        cliffordIndex: 0
      };
      
      // Store pairing info for debugging (as a non-typed property)
      if (isPaired) {
        state._pairedWith = pairedWith;
      }
      
      states.push(state);
    }
    
    // Create domains
    const pageSize = 48;
    for (let i = 0; i < sequence.length; i += pageSize) {
      domains.push({
        start: i + 1,
        end: Math.min(i + pageSize, sequence.length),
        pageNumber: Math.floor(i / pageSize) + 1,
        boundaryType: 'smooth' as const
      });
    }
    
    return {
      sequence,
      length: sequence.length,
      states,
      domains
    };
  }

  describe('initialization', () => {
    it('should create homology calculator', () => {
      const molecule = createTestMolecule('AUGC');
      const homology = new RNAHomology(molecule);
      
      expect(homology).toBeDefined();
    });

    it('should handle empty molecule', () => {
      const molecule = createTestMolecule('');
      const homology = new RNAHomology(molecule);
      
      const result = homology.computeHomology();
      expect(result.H0).toBe(0);
      expect(result.H1).toHaveLength(0);
      expect(result.H2).toHaveLength(0);
    });
  });

  describe('computeHomology', () => {
    it('should compute H0 = 1 for connected molecule', () => {
      const molecule = createTestMolecule('AUGC');
      const homology = new RNAHomology(molecule);
      
      const result = homology.computeHomology();
      expect(result.H0).toBe(1);
    });

    it('should identify simple hairpin loop', () => {
      // Hairpin: 1-12, 2-11, 3-10
      const molecule = createTestMolecule('GGGAAAAAACCC', [
        [1, 12], [2, 11], [3, 10]
      ]);
      const homology = new RNAHomology(molecule);
      
      const result = homology.computeHomology();
      expect(result.H1).toHaveLength(1);
      expect(result.H1[0].type).toBe('hairpin');
      expect(result.H1[0].positions).toContain(6);
      expect(result.H1[0].positions).toContain(7);
    });

    it('should identify internal loop', () => {
      // Internal loop with unpaired regions on both sides
      const molecule = createTestMolecule('GGGAAACCCUUUGGG', [
        [1, 15], [2, 14], [3, 13],  // Outer stem
        [7, 10], [8, 9]              // Inner stem
      ]);
      const homology = new RNAHomology(molecule);
      
      const result = homology.computeHomology();
      
      // Debug: log all loops found
      console.log('All loops found:', result.H1.map(l => ({ type: l.type, positions: l.positions })));
      
      // Should find internal loop with unpaired positions 4-6 and 11-12
      const internalLoops = result.H1.filter(l => l.type === 'internal');
      expect(internalLoops.length).toBeGreaterThan(0);
      expect(internalLoops[0].positions).toContain(4);
      expect(internalLoops[0].positions).toContain(11);
    });

    it('should identify pseudoknot', () => {
      // Classic H-type pseudoknot
      const molecule = createTestMolecule('AAAABBBBCCCCDDDD', [
        [1, 9], [2, 10], [3, 11], [4, 12],  // First helix
        [5, 13], [6, 14], [7, 15], [8, 16]  // Second helix (crossing)
      ]);
      const homology = new RNAHomology(molecule);
      
      const result = homology.computeHomology();
      
      const pseudoknots = result.H1.filter(l => l.type === 'pseudoknot');
      expect(pseudoknots.length).toBeGreaterThan(0);
    });

    it('should identify multi-branch loop', () => {
      // Three-way junction
      const sequence = 'G'.repeat(3) + 'A'.repeat(3) + 'C'.repeat(3) + 
                      'A'.repeat(3) + 'G'.repeat(3) + 'A'.repeat(3) + 
                      'C'.repeat(3) + 'A'.repeat(3) + 'G'.repeat(3);
      
      const molecule = createTestMolecule(sequence, [
        [1, 27], [2, 26], [3, 25],   // Stem 1
        [7, 15], [8, 14], [9, 13],   // Stem 2
        [19, 21], [20, 22]           // Stem 3
      ]);
      
      const homology = new RNAHomology(molecule);
      const result = homology.computeHomology();
      
      const multiLoops = result.H1.filter(l => l.type === 'junction');
      expect(multiLoops.length).toBeGreaterThan(0);
    });

    it('should find pockets in complex structures', () => {
      // Create a structure with a pocket
      const molecule = createTestMolecule('G'.repeat(30), [
        // Create a cage-like structure
        [1, 10], [2, 9], [3, 8], [4, 7],
        [11, 20], [12, 19], [13, 18], [14, 17],
        [21, 30], [22, 29], [23, 28], [24, 27],
        // Cross connections
        [5, 15], [6, 16], [25, 26]
      ]);
      
      const homology = new RNAHomology(molecule);
      const result = homology.computeHomology();
      
      expect(result.H2.length).toBeGreaterThan(0);
      expect(result.H2[0].volume).toBeGreaterThan(0);
    });
  });

  describe('persistent homology', () => {
    it('should compute persistence over distance filtration', () => {
      const molecule = createTestMolecule('GGGAAACCC', [
        [1, 9], [2, 8], [3, 7]
      ]);
      const homology = new RNAHomology(molecule);
      
      // Define a simple filtration based on position
      const filtration = (state: NucleotideState) => state.position;
      const persistence = homology.computePersistentHomology(filtration);
      
      expect(persistence).toBeDefined();
      expect(persistence.length).toBeGreaterThan(0);
      
      // Check structure of persistence pairs
      persistence.forEach(pair => {
        expect(pair.dimension).toBeGreaterThanOrEqual(0);
        expect(pair.dimension).toBeLessThanOrEqual(2);
        expect(pair.birth).toBeGreaterThanOrEqual(0);
        expect(pair.death).toBeGreaterThan(pair.birth);
        expect(pair.persistence).toBeCloseTo(pair.death - pair.birth, 10);
      });
    });

    it('should identify stable features with high persistence', () => {
      const molecule = createTestMolecule('GGGGAAAACCCC', [
        [1, 12], [2, 11], [3, 10], [4, 9]
      ]);
      const homology = new RNAHomology(molecule);
      
      // Define a simple filtration based on position
      const filtration = (state: NucleotideState) => state.position;
      const persistence = homology.computePersistentHomology(filtration);
      
      // Hairpin loop should have high persistence
      const highPersistence = persistence.filter(p => p.persistence > 10);
      expect(highPersistence.length).toBeGreaterThan(0);
    });

    it('should track feature birth and death', () => {
      const molecule = createTestMolecule('A'.repeat(20));
      const homology = new RNAHomology(molecule);
      
      // Define a simple filtration based on position
      const filtration = (state: NucleotideState) => state.position;
      const persistence = homology.computePersistentHomology(filtration);
      
      // All features should eventually die (except possibly H0)
      const immortal = persistence.filter(p => p.death === Infinity);
      expect(immortal.length).toBeLessThanOrEqual(1); // Only connected component
      
      if (immortal.length === 1) {
        expect(immortal[0].dimension).toBe(0);
      }
    });
  });

  describe('boundary computation', () => {
    it('should compute correct boundary matrices', () => {
      const molecule = createTestMolecule('AUGC');
      const homology = new RNAHomology(molecule);
      
      // Access private method through any
      const complex = (homology as any).buildSimplicialComplex();
      
      // Check 0-simplices have no boundary
      complex.simplices.get(0).forEach((simplex: any) => {
        const boundary = complex.boundary(simplex);
        expect(boundary).toHaveLength(0);
      });
      
      // Check 1-simplices have correct boundary
      const edges = complex.simplices.get(1);
      edges.forEach((edge: any) => {
        const boundary = complex.boundary(edge);
        expect(boundary).toHaveLength(2); // Two vertices
        
        // Check orientation
        const signs = boundary.map((s: any) => s.orientation);
        expect(signs).toContain(1);
        expect(signs).toContain(-1);
      });
    });

    it('should satisfy boundary of boundary = 0', () => {
      const molecule = createTestMolecule('GGGCCC', [[1, 6], [2, 5], [3, 4]]);
      const homology = new RNAHomology(molecule);
      
      const complex = (homology as any).buildSimplicialComplex();
      
      // For each 2-simplex, boundary of boundary should be empty
      const faces = complex.simplices.get(2) || [];
      faces.forEach((face: any) => {
        const boundary1 = complex.boundary(face);
        
        // Compute boundary of boundary
        const boundary2: any[] = [];
        boundary1.forEach((edge: any) => {
          const edgeBoundary = complex.boundary(edge);
          edgeBoundary.forEach((vertex: any) => {
            // Account for orientation
            const newVertex = {
              ...vertex,
              orientation: vertex.orientation * edge.orientation
            };
            
            // Check if this vertex cancels with existing
            const existing = boundary2.findIndex(v => 
              v.vertices[0] === newVertex.vertices[0]
            );
            
            if (existing >= 0) {
              if (boundary2[existing].orientation + newVertex.orientation === 0) {
                boundary2.splice(existing, 1);
              }
            } else {
              boundary2.push(newVertex);
            }
          });
        });
        
        expect(boundary2).toHaveLength(0);
      });
    });
  });

  describe('loop classification', () => {
    it('should correctly classify hairpin loops', () => {
      const molecule = createTestMolecule('GGGAAAACCC', [
        [1, 10], [2, 9], [3, 8]
      ]);
      const homology = new RNAHomology(molecule);
      
      const result = homology.computeHomology();
      const hairpins = result.H1.filter(l => l.type === 'hairpin');
      
      expect(hairpins).toHaveLength(1);
      expect(hairpins[0].positions.length).toBeGreaterThanOrEqual(4); // Min loop size
    });

    it('should detect bulge loops', () => {
      const molecule = createTestMolecule('GGGAACCCGGG', [
        [1, 11], [2, 10], [3, 9],
        [6, 8], [7, 7] // This creates asymmetry
      ]);
      const homology = new RNAHomology(molecule);
      
      const result = homology.computeHomology();
      expect(result.H1.length).toBeGreaterThan(0);
    });

    it('should handle nested structures', () => {
      // Nested hairpins
      const molecule = createTestMolecule('GGGGAAACCCCGGGGAAAACCCC', [
        [1, 11], [2, 10], [3, 9], [4, 8],    // Outer stem
        [12, 23], [13, 22], [14, 21], [15, 20] // Inner stem
      ]);
      const homology = new RNAHomology(molecule);
      
      const result = homology.computeHomology();
      expect(result.H1.length).toBeGreaterThanOrEqual(2); // Two loops
    });

    it('should identify kissing loops', () => {
      // Two hairpins with loop-loop interaction
      const sequence = 'GGGAAACCCAAAGGGAAACCCAAA';
      const molecule = createTestMolecule(sequence, [
        [1, 9], [2, 8], [3, 7],     // First hairpin stem
        [13, 21], [14, 20], [15, 19], // Second hairpin stem
        [5, 17]                      // Loop-loop interaction
      ]);
      const homology = new RNAHomology(molecule);
      
      const result = homology.computeHomology();
      const pseudoknots = result.H1.filter(l => l.type === 'pseudoknot');
      expect(pseudoknots.length).toBeGreaterThan(0);
    });
  });

  describe('pocket analysis', () => {
    it('should compute pocket volumes', () => {
      const molecule = createTestMolecule('G'.repeat(20), [
        [1, 10], [2, 9], [3, 8],
        [11, 20], [12, 19], [13, 18]
      ]);
      const homology = new RNAHomology(molecule);
      
      const result = homology.computeHomology();
      
      result.H2.forEach(pocket => {
        expect(pocket.volume).toBeGreaterThan(0);
        expect(pocket.volume).toBeLessThan(10000); // Reasonable upper bound
      });
    });

    it('should classify pocket functions', () => {
      const molecule = createTestMolecule('G'.repeat(30));
      const homology = new RNAHomology(molecule);
      
      // Set up specific pocket-like structure
      molecule.states[10].fields.e4 = true; // Tertiary interaction
      molecule.states[11].fields.e4 = true;
      molecule.states[12].fields.e7 = true; // Ion coordination
      
      const result = homology.computeHomology();
      
      if (result.H2.length > 0) {
        const functions = result.H2.map(p => p.function);
        expect(functions).toBeDefined();
        
        // Should identify based on local properties
        const validFunctions = ['binding', 'catalytic', 'structural', 'unknown'];
        functions.forEach(f => {
          expect(validFunctions).toContain(f);
        });
      }
    });

    it('should identify pocket boundaries', () => {
      const molecule = createTestMolecule('G'.repeat(15), [
        [1, 5], [6, 10], [11, 15]
      ]);
      const homology = new RNAHomology(molecule);
      
      const result = homology.computeHomology();
      
      result.H2.forEach(pocket => {
        expect(pocket.boundary).toBeDefined();
        expect(pocket.boundary.length).toBeGreaterThan(0);
        
        // Boundary should be closed loop
        pocket.boundary.forEach(pos => {
          expect(pos).toBeGreaterThanOrEqual(1);
          expect(pos).toBeLessThanOrEqual(molecule.length);
        });
      });
    });
  });

  describe('structural loop finding', () => {
    it('should find hairpin loops correctly', () => {
      // Simple hairpin: GGGG....CCCC
      const molecule = createTestMolecule('GGGGAAAACCCC', [
        [1, 12], [2, 11], [3, 10], [4, 9]
      ]);
      const homology = new RNAHomology(molecule);
      const result = homology.computeHomology();
      
      // Should find one hairpin loop with positions 5-8
      const hairpins = result.H1.filter(l => l.type === 'hairpin');
      expect(hairpins).toHaveLength(1);
      expect(hairpins[0].positions).toEqual([5, 6, 7, 8]);
    });

    it('should find bulge loops correctly', () => {
      // Bulge on one side: GGG...CCC
      const molecule = createTestMolecule('GGGAAACCC', [
        [1, 9], [2, 8], [3, 7]
      ]);
      const homology = new RNAHomology(molecule);
      const result = homology.computeHomology();
      
      // Should find bulge with unpaired positions 4-6
      const bulges = result.H1.filter(l => l.type === 'bulge');
      expect(bulges).toHaveLength(1);
      expect(bulges[0].positions).toEqual([4, 5, 6]);
    });

    it('should find internal loops with unpaired on both sides', () => {
      // True internal loop: unpaired regions on both sides
      const molecule = createTestMolecule('GGGAAACCCAAAGGG', [
        [1, 15], [2, 14], [3, 13],  // Outer stem
        [6, 12], [7, 11], [8, 10]   // Inner stem
      ]);
      const homology = new RNAHomology(molecule);
      const result = homology.computeHomology();
      
      // Should find internal loop with positions 4,5 and 9
      const internal = result.H1.filter(l => l.type === 'internal');
      expect(internal).toHaveLength(1);
      expect(internal[0].positions).toEqual([4, 5, 9]);
    });

    it('should identify multi-loops correctly', () => {
      // Three-way junction
      const molecule = createTestMolecule('GGAAACCAAAGGGAAACCC', [
        [1, 19], [2, 18],     // Outer stem
        [5, 9], [6, 8],       // First inner stem
        [11, 16], [12, 15]    // Second inner stem
      ]);
      const homology = new RNAHomology(molecule);
      const result = homology.computeHomology();
      
      // Should find junction with unpaired regions
      const junctions = result.H1.filter(l => l.type === 'junction');
      expect(junctions.length).toBeGreaterThan(0);
    });

    it('should detect simple pseudoknots', () => {
      // H-type pseudoknot: two crossing stems
      const molecule = createTestMolecule('GGGGAAAACCCCUUUUGGGG', [
        [1, 12], [2, 11], [3, 10], [4, 9],     // First stem
        [13, 20], [14, 19], [15, 18], [16, 17] // Second stem (crossing)
      ]);
      const homology = new RNAHomology(molecule);
      const result = homology.computeHomology();
      
      // Should find pseudoknot
      const pseudoknots = result.H1.filter(l => l.type === 'pseudoknot');
      expect(pseudoknots.length).toBeGreaterThan(0);
    });

    it('should handle empty loops gracefully', () => {
      // Adjacent stems with no unpaired between
      const molecule = createTestMolecule('GGGGCCCC', [
        [1, 8], [2, 7], [3, 6], [4, 5]
      ]);
      const homology = new RNAHomology(molecule);
      const result = homology.computeHomology();
      
      // Should not find any loops (no unpaired regions)
      expect(result.H1).toHaveLength(0);
    });

    it('should remove duplicate loops', () => {
      // Structure that might generate duplicate loops
      const molecule = createTestMolecule('GGAAACCAAAGGG', [
        [1, 13], [2, 12], // Outer stem
        [5, 10], [6, 9]   // Inner stem
      ]);
      const homology = new RNAHomology(molecule);
      const result = homology.computeHomology();
      
      // Check that no duplicate loops exist
      const loopKeys = result.H1.map(l => l.positions.join(','));
      const uniqueKeys = new Set(loopKeys);
      expect(loopKeys.length).toBe(uniqueKeys.size);
    });
  });

  describe('edge cases', () => {
    it('should handle single nucleotide', () => {
      const molecule = createTestMolecule('A');
      const homology = new RNAHomology(molecule);
      
      const result = homology.computeHomology();
      expect(result.H0).toBe(1);
      expect(result.H1).toHaveLength(0);
      expect(result.H2).toHaveLength(0);
    });

    it('should handle fully paired molecule', () => {
      const molecule = createTestMolecule('GGGGCCCC', [
        [1, 8], [2, 7], [3, 6], [4, 5]
      ]);
      const homology = new RNAHomology(molecule);
      
      const result = homology.computeHomology();
      expect(result.H0).toBe(1);
      expect(result.H1).toHaveLength(0); // No loops in perfect duplex
    });

    it('should handle completely unpaired molecule', () => {
      const molecule = createTestMolecule('AAAAAAAA');
      const homology = new RNAHomology(molecule);
      
      const result = homology.computeHomology();
      expect(result.H0).toBe(1);
      expect(result.H1).toHaveLength(0);
      expect(result.H2).toHaveLength(0);
    });

    it('should handle very long molecules', () => {
      const molecule = createTestMolecule('A'.repeat(1000));
      const homology = new RNAHomology(molecule);
      
      const startTime = Date.now();
      const result = homology.computeHomology();
      const endTime = Date.now();
      
      expect(endTime - startTime).toBeLessThan(5000); // Should complete in 5s
      expect(result.H0).toBe(1);
    });
  });

  describe('matrix operations', () => {
    it('should compute rank correctly', () => {
      const molecule = createTestMolecule('AUGC');
      const homology = new RNAHomology(molecule);
      
      // Test rank computation on known matrices
      const testMatrix = [
        [1, 0, 0],
        [0, 1, 0],
        [0, 0, 1]
      ];
      
      const rank = (homology as any).computeRank(testMatrix);
      expect(rank).toBe(3);
    });

    it('should handle zero matrix', () => {
      const molecule = createTestMolecule('AUGC');
      const homology = new RNAHomology(molecule);
      
      const zeroMatrix = [
        [0, 0, 0],
        [0, 0, 0],
        [0, 0, 0]
      ];
      
      const rank = (homology as any).computeRank(zeroMatrix);
      expect(rank).toBe(0);
    });

    it('should compute kernel basis', () => {
      const molecule = createTestMolecule('AUGC');
      const homology = new RNAHomology(molecule);
      
      // Matrix with non-trivial kernel
      const matrix = [
        [1, 2, 3],
        [2, 4, 6],
        [1, 2, 3]
      ];
      
      const rank = (homology as any).computeRank(matrix);
      const kernel = (homology as any).computeKernelBasis(matrix, rank, 3, 3);
      
      expect(kernel.length).toBe(2); // 3 - rank(1) = 2
      
      // Verify kernel vectors
      kernel.forEach((v: number[]) => {
        // Av should be zero
        for (let i = 0; i < 3; i++) {
          let sum = 0;
          for (let j = 0; j < 3; j++) {
            sum += matrix[i][j] * v[j];
          }
          expect(Math.abs(sum)).toBeLessThan(1e-10);
        }
      });
    });
  });

  describe('performance', () => {
    it('should scale well with molecule size', () => {
      const sizes = [10, 50, 100, 200];
      const times: number[] = [];
      
      sizes.forEach(size => {
        const molecule = createTestMolecule('A'.repeat(size));
        const homology = new RNAHomology(molecule);
        
        const start = Date.now();
        homology.computeHomology();
        const end = Date.now();
        
        times.push(end - start);
      });
      
      // Check that time doesn't grow too rapidly
      for (let i = 1; i < times.length; i++) {
        const ratio = times[i] / times[i-1];
        expect(ratio).toBeLessThan(10); // Sub-exponential growth
      }
    });
  });
});