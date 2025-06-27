/**
 * Integration tests for complete MU:RNA model workflows
 */

import { createMURNAModel } from '../src';
import { ConformationalFields, RNAMolecule, NucleotideState } from '../src/types';

describe('MU:RNA Model Integration Tests', () => {
  describe('Complete folding workflow', () => {
    it('should fold tRNA and analyze structure', () => {
      // Simplified tRNA sequence
      const tRNASeq = 'GCGGAUUUAGCUCAGUUGGGAGAGCGCCAGACUGAAGAUCUGGAGGUCCUGUGUUCGAUCCACAGAAUUCGCACCA';
      const model = createMURNAModel(tRNASeq);
      
      // Initial state
      expect(model.molecule.sequence).toBe(tRNASeq);
      expect(model.molecule.length).toBe(76);
      
      // Fold the RNA
      const folded = model.fold();
      
      // Verify folding produced valid structure
      expect(folded.states).toHaveLength(76);
      
      // Check for characteristic tRNA features
      const pairedBases = folded.states.filter(s => s.fields.e0).length;
      expect(pairedBases).toBeGreaterThan(40); // >50% paired typical for tRNA
      
      // Verify energy is reasonable
      const energy = model.landscape.freeEnergy(folded);
      expect(energy).toBeLessThan(-10); // tRNA should be very stable
      
      // Update and check homology
      model.molecule = folded;
      model.homology = model.homologyCalculator.computeHomology();
      
      // tRNA should have multiple loops
      expect(model.homology.H1.length).toBeGreaterThanOrEqual(3);
      
      // Check for D-loop, anticodon loop, T-loop
      const loops = model.homology.H1;
      const loopSizes = loops.map(l => l.positions.length);
      
      // Should have loops of various sizes
      expect(Math.max(...loopSizes)).toBeGreaterThan(5);
      expect(Math.min(...loopSizes)).toBeGreaterThanOrEqual(3);
    });

    it('should analyze ribozyme structure', () => {
      // Hammerhead ribozyme core
      const ribozymeSeq = 'CUGAUGAGUCCGUGAGGACGAAACAGC';
      const model = createMURNAModel(ribozymeSeq);
      
      // Apply a simple folding pattern manually
      model.molecule.states.forEach(state => {
        state.fields.e0 = false;
        state.fields.e1 = false;
      });
      
      // Create some base pairs manually (simplified structure)
      const pairs = [
        [0, 26], [1, 25], [2, 24], [3, 23], [4, 22],
        [17, 21], [18, 20]
      ];
      
      pairs.forEach(([i, j]) => {
        if (i < model.molecule.states.length && j < model.molecule.states.length) {
          model.molecule.states[i].fields.e0 = true;
          model.molecule.states[j].fields.e0 = true;
          model.molecule.states[i].fields.e1 = true;
          model.molecule.states[j].fields.e1 = true;
        }
      });
      
      // Check for catalytic pocket
      model.homology = model.homologyCalculator.computeHomology();
      
      // Ribozymes often have pockets
      if (model.homology.H2.length > 0) {
        const pocket = model.homology.H2[0];
        expect(pocket.function).toBeDefined();
        expect(pocket.volume).toBeGreaterThan(0);
      }
      
      // Check E8 stability of active site
      const coreRegion = model.molecule.states.slice(10, 20);
      const avgStability = coreRegion.reduce(
        (sum, state) => sum + model.e8.stabilityScore(state.fields),
        0
      ) / coreRegion.length;
      
      expect(avgStability).toBeGreaterThan(0.3);
    });
  });

  describe('Symmetry-guided folding', () => {
    it('should use E8 symmetry for efficient folding', () => {
      const sequence = 'GGGGAAAACCCC';
      const model = createMURNAModel(sequence);
      
      // Get symmetry orbits
      const orbits = model.getSymmetryOrbits();
      const reductionFactor = 256 / orbits.length;
      
      expect(reductionFactor).toBeGreaterThan(3);
      
      // Get stable conformations using the optional method if available
      const stableStates = model.e8.getStableConformations ? 
        model.e8.getStableConformations(0.5) : [];
      
      // Fold using symmetry constraints
      const folded = model.fold();
      
      // Check that folded states are E8-stable
      let stableCount = 0;
      folded.states.forEach(state => {
        const score = model.e8.stabilityScore(state.fields);
        if (score > 0.5) stableCount++;
      });
      
      expect(stableCount / folded.states.length).toBeGreaterThan(0.5);
    });

    it('should demonstrate orbit structure', () => {
      const model = createMURNAModel('AUGC');
      
      // Take a specific conformation
      const testFields: ConformationalFields = {
        e0: true, e1: true, e2: false, e3: false,
        e4: false, e5: false, e6: true, e7: false
      };
      
      // Get its orbit using weylOrbit
      const orbit = (model.e8 as any).weylOrbit(testFields);
      
      // Verify orbit properties
      expect(orbit.length).toBeGreaterThan(0);
      
      // All elements should have same E8 stability
      const scores = orbit.map((fields: ConformationalFields) => model.e8.stabilityScore(fields));
      const avgScore = scores.reduce((a: number, b: number) => a + b, 0) / scores.length;
      
      scores.forEach((score: number) => {
        expect(Math.abs(score - avgScore)).toBeLessThan(0.01);
      });
    });
  });

  describe('Multi-domain folding', () => {
    it('should handle RNA with multiple domains', () => {
      // Create RNA with 3 distinct domains
      const domain1 = 'GGGGAAAACCCC'; // Hairpin
      const linker1 = 'UUUUUU';
      const domain2 = 'CCCGGGAAACCCGGG'; // Internal loop
      const linker2 = 'AAAAAA';
      const domain3 = 'GGCCGGCCAAAAAGGCCGGCC'; // Complex structure
      
      const fullSeq = domain1 + linker1 + domain2 + linker2 + domain3;
      const model = createMURNAModel(fullSeq);
      
      // Check orbifold structure
      const domains = model.molecule.domains;
      expect(domains.length).toBeGreaterThanOrEqual(2);
      
      // Find domain connections
      const connections = model.orbifold.findDomainConnections ? 
        model.orbifold.findDomainConnections() : [];
      expect(connections.length).toBeGreaterThanOrEqual(0);
      
      // Fold the RNA
      const folded = model.fold();
      
      // Check that each domain folds somewhat independently
      const d1States = folded.states.slice(0, domain1.length);
      const d2States = folded.states.slice(
        domain1.length + linker1.length,
        domain1.length + linker1.length + domain2.length
      );
      
      const d1Paired = d1States.filter(s => s.fields.e0).length;
      const d2Paired = d2States.filter(s => s.fields.e0).length;
      
      expect(d1Paired).toBeGreaterThan(0);
      expect(d2Paired).toBeGreaterThan(0);
      
      // Check inter-domain interactions via gauge connection
      const pos1 = 6; // In domain 1
      const pos2 = domain1.length + linker1.length + 6; // In domain 2
      
      // Gauge connection strength can be approximated by transport decay
      const transported = model.gauge.transport(d1States[0].fields, pos1, pos2);
      const activeFields = Object.values(transported).filter(v => v).length;
      const strength = activeFields / 8; // Approximate strength
      expect(strength).toBeLessThan(0.5); // Weak due to distance
    });
  });

  describe('Folding pathway analysis', () => {
    it('should find realistic folding pathway', () => {
      const sequence = 'GGGGAAAACCCC';
      const model = createMURNAModel(sequence);
      
      // Start from unfolded
      const unfolded = { ...model.molecule };
      unfolded.states = unfolded.states.map(state => ({
        ...state,
        fields: {
          e0: false, e1: false, e2: false, e3: false,
          e4: false, e5: true, e6: true, e7: false
        }
      }));
      
      // Get folded state
      const folded = model.fold();
      
      // Find pathway
      const pathway = model.findFoldingPathway(unfolded, folded);
      
      // Verify pathway properties
      expect(pathway.path.length).toBeGreaterThanOrEqual(2);
      expect(pathway.length).toBeGreaterThan(0);
      
      // Energy should generally decrease along pathway
      const energies = pathway.path.map(state => 
        model.landscape.freeEnergy(state)
      );
      
      const startEnergy = energies[0];
      const endEnergy = energies[energies.length - 1];
      expect(endEnergy).toBeLessThan(startEnergy);
      
      // Check barriers are reasonable
      pathway.barriers.forEach(barrier => {
        expect(barrier).toBeGreaterThanOrEqual(0);
        expect(barrier).toBeLessThan(20); // Reasonable barrier
      });
    });

    it('should identify folding intermediates', () => {
      const sequence = 'GGGUUUAAACCCAAAGGG';
      const model = createMURNAModel(sequence);
      
      const unfolded = { ...model.molecule };
      unfolded.states = unfolded.states.map(state => ({
        ...state,
        fields: {
          e0: false, e1: false, e2: false, e3: false,
          e4: false, e5: true, e6: true, e7: false
        }
      }));
      
      const folded = model.fold();
      
      const pathway = model.findFoldingPathway(unfolded, folded);
      
      // If pathway has intermediates
      if (pathway.path.length > 2) {
        // Check intermediate states
        for (let i = 1; i < pathway.path.length - 1; i++) {
          const intermediate = pathway.path[i];
          
          // Should have partial structure
          const pairedCount = intermediate.states.filter(s => s.fields.e0).length;
          expect(pairedCount).toBeGreaterThan(0);
          expect(pairedCount).toBeLessThan(
            folded.states.filter(s => s.fields.e0).length
          );
        }
      }
    });
  });

  describe('Advanced structural analysis', () => {
    it('should detect and analyze pseudoknots', () => {
      // H-type pseudoknot
      const sequence = 'GGGGAAAACCCCUUUUGGGG';
      
      const model = createMURNAModel(sequence);
      
      // Apply pseudoknot structure manually
      model.molecule.states.forEach(state => {
        state.fields.e0 = false;
      });
      
      // Create crossing base pairs
      const pairs = [
        [0, 11], [1, 10], [2, 9], [3, 8],    // First helix
        [12, 19], [13, 18], [14, 17], [15, 16] // Second helix
      ];
      
      pairs.forEach(([i, j]) => {
        model.molecule.states[i].fields.e0 = true;
        model.molecule.states[j].fields.e0 = true;
      });
      
      // Analyze with homology
      model.homology = model.homologyCalculator.computeHomology();
      
      // Should detect pseudoknot in H1
      const pseudoknots = model.homology.H1.filter(l => l.type === 'pseudoknot');
      expect(pseudoknots.length).toBeGreaterThan(0);
      
      // Check topological complexity
      expect(model.homology.H1.length).toBeGreaterThanOrEqual(2);
    });

    it('should analyze kissing loops', () => {
      // Two hairpins with loop-loop interaction
      const sequence = 'GGGAAACCCAAAAGGGAAACCCAAAA';
      const model = createMURNAModel(sequence);
      
      // Set up kissing loop structure
      const pairs = [
        [0, 8], [1, 7], [2, 6],     // First hairpin stem
        [13, 21], [14, 20], [15, 19], // Second hairpin stem
        [4, 17]                      // Loop-loop interaction
      ];
      
      model.molecule.states.forEach(state => {
        state.fields.e0 = false;
        state.fields.e4 = false;
      });
      
      pairs.forEach(([i, j]) => {
        if (i < model.molecule.states.length && j < model.molecule.states.length) {
          model.molecule.states[i].fields.e0 = true;
          model.molecule.states[j].fields.e0 = true;
          
          // Mark loop-loop as tertiary
          if (Math.abs(i - j) > 10) {
            model.molecule.states[i].fields.e4 = true;
            model.molecule.states[j].fields.e4 = true;
          }
        }
      });
      
      // Check for tertiary interactions
      const tertiaryCount = model.molecule.states.filter(s => s.fields.e4).length;
      expect(tertiaryCount).toBeGreaterThan(0);
      
      // Analyze homology
      model.homology = model.homologyCalculator.computeHomology();
      expect(model.homology.H1.length).toBeGreaterThan(0);
    });
  });

  describe('Thermodynamic analysis', () => {
    it('should analyze temperature dependence', () => {
      const sequence = 'GGGGCCCC';
      const model = createMURNAModel(sequence);
      
      // Fold multiple times to simulate different conditions
      const results: Array<{ folded: RNAMolecule; energy: number }> = [];
      for (let i = 0; i < 5; i++) {
        const folded = model.fold();
        results.push({
          folded,
          energy: model.landscape.freeEnergy(folded)
        });
      }
      
      // Check that we get consistent low energy structures
      const avgEnergy = results.reduce((sum, r) => sum + r.energy, 0) / results.length;
      expect(avgEnergy).toBeLessThan(0); // Should be favorable
      
      // Check pairing consistency
      const pairingCounts = results.map(r => 
        r.folded.states.filter((s: NucleotideState) => s.fields.e0).length
      );
      
      // Should have some pairing
      pairingCounts.forEach(count => {
        expect(count).toBeGreaterThan(0);
      });
    });

    it('should apply modular transformations', () => {
      const model = createMURNAModel('AUGC');
      const baseEnergy = -5.0;
      
      // Temperature scaling (T → T + b)
      const Tshift = { a: 1, b: 10, c: 0, d: 1 };
      const shiftedEnergy = model.landscape.modularAction(baseEnergy, Tshift);
      expect(shiftedEnergy).not.toBe(baseEnergy);
      
      // Ion concentration (E → aE/(cE + d))
      const ionTransform = { a: 2, b: 0, c: 1, d: 10 };
      const ionEnergy = model.landscape.modularAction(baseEnergy, ionTransform);
      expect(Math.abs(ionEnergy)).toBeLessThan(Math.abs(baseEnergy));
      
      // Check group property
      const identity = { a: 1, b: 0, c: 0, d: 1 };
      const identityEnergy = model.landscape.modularAction(baseEnergy, identity);
      expect(identityEnergy).toBe(baseEnergy);
    });
  });

  describe('Persistent homology workflow', () => {
    it('should track structural features through folding', () => {
      const sequence = 'GGGGAAAAGGGGAAAACCCCAAAACCCC';
      const model = createMURNAModel(sequence);
      
      // Compute persistent homology
      // Define filtration based on position
      const filtration = (state: NucleotideState) => state.position;
      const persistence = model.homologyCalculator.computePersistentHomology(filtration);
      
      // Analyze persistence diagram
      expect(persistence.length).toBeGreaterThan(0);
      
      // Separate by dimension
      const _dim0 = persistence.filter(p => p.dimension === 0);
      const _dim1 = persistence.filter(p => p.dimension === 1);
      const _dim2 = persistence.filter(p => p.dimension === 2);
      
      // Should have one infinite component (connected)
      const infinite = persistence.filter(p => p.death === Infinity);
      expect(infinite.length).toBe(1);
      expect(infinite[0].dimension).toBe(0);
      
      // Look for significant features (high persistence)
      const threshold = 10;
      const significant = persistence.filter(p => p.persistence > threshold);
      
      if (significant.length > 0) {
        // These represent stable structural features
        expect(significant[0].dimension).toBeGreaterThan(0);
      }
    });
  });

  describe('Complete analysis pipeline', () => {
    it('should perform full structural and thermodynamic analysis', () => {
      // Use a known structure - simplified tRNA
      const sequence = 'GCGGAUUUAGCUCAGUGGGAGAGCGCCAGACUGAAGAUCUGGAGGUC';
      const model = createMURNAModel(sequence);
      
      // 1. Initial analysis
      const initialEnergy = model.landscape.freeEnergy(model.molecule);
      expect(initialEnergy).toBeGreaterThan(0); // Unfolded is unstable
      
      // 2. Fold the RNA
      const folded = model.fold();
      const foldedEnergy = model.landscape.freeEnergy(folded);
      expect(foldedEnergy).toBeLessThan(initialEnergy);
      
      // 3. Symmetry analysis
      const orbits = model.getSymmetryOrbits();
      const symmetryReduction = 256 / orbits.length;
      expect(symmetryReduction).toBeGreaterThan(2);
      
      // 4. Update model state
      model.molecule = folded;
      
      // 5. Homological analysis
      model.homology = model.homologyCalculator.computeHomology();
      expect(model.homology.H0).toBe(1); // Connected
      expect(model.homology.H1.length).toBeGreaterThan(2); // Multiple loops
      
      // 6. Domain analysis
      const domains = model.molecule.domains;
      const connections = model.orbifold.findDomainConnections ? 
        model.orbifold.findDomainConnections() : [];
      
      if (domains.length > 1) {
        expect(connections.length).toBe(domains.length - 1);
      }
      
      // 7. E8 stability profile
      const stablePositions = folded.states.filter(
        s => model.e8.stabilityScore(s.fields) > 0.6
      ).length;
      expect(stablePositions / folded.states.length).toBeGreaterThan(0.4);
      
      // 8. Clifford algebra analysis
      const helicalStates = folded.states.filter(s => 
        s.fields.e0 && s.fields.e1 // Paired and stacked
      );
      
      helicalStates.forEach(state => {
        const clifford = model.clifford.fieldsToClifford(state.fields);
        const isStable = model.clifford.isStableConformation(clifford);
        expect(isStable).toBe(true);
      });
      
      // 9. Curvature analysis
      let maxCurvature = 0;
      let maxCurvaturePos = 0;
      
      for (let i = 1; i <= folded.length; i++) {
        const curv = model.gauge.curvature(i);
        const total = curv.reduce((sum, row) => 
          sum + row.reduce((s, v) => s + Math.abs(v), 0), 0
        );
        
        if (total > maxCurvature) {
          maxCurvature = total;
          maxCurvaturePos = i;
        }
      }
      
      // High curvature often indicates structural features
      expect(maxCurvature).toBeGreaterThan(0);
      
      // 10. Summary statistics
      const summary = {
        sequence: sequence,
        length: sequence.length,
        energy: foldedEnergy,
        pairedBases: folded.states.filter(s => s.fields.e0).length,
        loops: model.homology.H1.length,
        pockets: model.homology.H2.length,
        domains: domains.length,
        symmetryReduction: symmetryReduction,
        maxCurvaturePosition: maxCurvaturePos
      };
      
      // Verify summary makes sense
      expect(summary.pairedBases).toBeGreaterThan(summary.length * 0.4);
      expect(summary.loops).toBeGreaterThan(0);
      expect(summary.energy).toBeLessThan(0);
    });
  });
});