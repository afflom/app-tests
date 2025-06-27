/**
 * MU:RNA Model - Basic Usage Example
 *
 * Demonstrates the fundamental features of the model
 */

import { createMURNAModel, ConformationalFields } from '../src';

// Example 1: Create model for a simple hairpin
console.log('=== Example 1: Simple Hairpin ===');
const hairpinSeq = 'GGGCAAAAGCCC';
const hairpinModel = createMURNAModel(hairpinSeq);

// Examine initial state
console.log(`Sequence: ${hairpinSeq}`);
console.log(`Length: ${hairpinModel.molecule.length}`);
console.log(`Domains: ${hairpinModel.molecule.domains.length}`);
console.log(`Initial H0 (components): ${hairpinModel.homology.H0}`);
console.log(`Initial H1 (loops): ${hairpinModel.homology.H1.length}`);
console.log(`Initial H2 (pockets): ${hairpinModel.homology.H2.length}`);

// Fold the RNA
console.log('\nFolding RNA...');
const foldedHairpin = hairpinModel.fold();

// Examine folded state
console.log('\nFolded state:');
console.log(`Free energy: ${hairpinModel.landscape.freeEnergy(foldedHairpin).toFixed(2)} kcal/mol`);
console.log(`Resonance: ${hairpinModel.landscape.resonance(foldedHairpin).toFixed(3)}`);

// Check conformational states
let pairedCount = 0;
let stackedCount = 0;
let e8StableCount = 0;

for (const state of foldedHairpin.states) {
  if (state.fields.e0) pairedCount++;
  if (state.fields.e1) stackedCount++;

  const stability = hairpinModel.e8.stabilityScore(state.fields);
  if (stability > 0.8) e8StableCount++;
}

console.log(`Paired nucleotides: ${pairedCount}/${hairpinSeq.length}`);
console.log(`Stacked nucleotides: ${stackedCount}/${hairpinSeq.length}`);
console.log(`E8-stable nucleotides: ${e8StableCount}/${hairpinSeq.length}`);

// Analyze loops
console.log('\nLoop analysis:');
for (const loop of hairpinModel.homology.H1) {
  console.log(`- ${loop.type} loop at positions ${loop.positions.join(',')}`);
}

// Example 2: tRNA-like structure
console.log('\n\n=== Example 2: tRNA-like Structure ===');
const tRNASeq = 'GCGGAUUUAGCUCAGUUGGGAGAGCGCCAGACUGAAGAUCUGGAGGUCCUGUGUUCGAUCCACAGAAUUCGCACCA';
const tRNAModel = createMURNAModel(tRNASeq);

console.log(`Sequence length: ${tRNASeq.length}`);
console.log(`Number of pages: ${Math.ceil(tRNASeq.length / 48)}`);

// Check orbifold singularities
console.log(`\nOrbifold singularities at: ${tRNAModel.orbifold.singularities.join(', ')}`);

// Find domain connections
const connections = tRNAModel.orbifold.findDomainConnections?.() || [];
console.log('\nDomain connections:');
for (const conn of connections) {
  console.log(
    `- Domain ${conn.from.pageNumber} → ${conn.to.pageNumber} ` +
      `at position ${conn.hinge} (flexibility: ${conn.flexibility?.toFixed(2) || 'N/A'})`
  );
}

// Example 3: Analyze E8 symmetry
console.log('\n\n=== Example 3: E8 Symmetry Analysis ===');

// Get stable conformations
const stableConformations = tRNAModel.e8.getStableConformations?.(0.2) || [];
console.log(`Number of E8-stable conformations: ${stableConformations.length}/256`);

// Get root system statistics
const stats = tRNAModel.e8.getRootSystemStats?.() || {
  totalRoots: 0,
  positiveRoots: 0,
  rootLengths: new Set<number>(),
  maximalRoot: []
};
console.log(`\nE8 root system:`);
console.log(`- Total roots: ${stats.totalRoots}`);
console.log(`- Positive roots: ${stats.positiveRoots}`);
console.log(`- Root lengths: ${Array.from(stats.rootLengths).join(', ')}`);

// Example 4: Clifford algebra operations
console.log('\n\n=== Example 4: Clifford Algebra ===');

// Create a helical state (paired and stacked)
const helicalFields: ConformationalFields = {
  e0: true, // Paired
  e1: true, // Stacked
  e2: true, // C3'-endo
  e3: true, // Canonical backbone
  e4: false, // No tertiary
  e5: false, // Buried edge
  e6: false, // Buried backbone
  e7: false // No ion
};

const helicalClifford = tRNAModel.clifford.fieldsToClifford(helicalFields);
console.log(`\nHelical state Clifford index: ${helicalClifford.index}`);
console.log(`Grade: ${helicalClifford.grade}`);

// Get bivector interpretation
const bivectors = tRNAModel.clifford.getBivectorInterpretation(helicalClifford);
console.log('Bivector correlations:');
bivectors.forEach((bv: string) => console.log(`- ${bv}`));

// Check if it's stable
const isStable = tRNAModel.clifford.isStableConformation(helicalClifford);
console.log(`Is stable conformation: ${isStable}`);

// Example 5: Gauge connection and parallel transport
console.log('\n\n=== Example 5: Gauge Connection ===');

// Transport helical state along sequence
const transported5 = tRNAModel.gauge.transport(helicalFields, 10, 15);
const transported10 = tRNAModel.gauge.transport(helicalFields, 10, 20);

console.log('\nParallel transport of helical state:');
console.log(`Distance 5: ${Object.values(transported5).filter(v => v).length}/8 fields active`);
console.log(`Distance 10: ${Object.values(transported10).filter(v => v).length}/8 fields active`);

// Check curvature at different positions
console.log('\nCurvature analysis:');
for (let pos = 10; pos <= 30; pos += 10) {
  const curvature = tRNAModel.gauge.curvature(pos);
  const totalCurvature = curvature.reduce(
    (sum: number, row: number[]) =>
      sum + row.reduce((rowSum: number, val: number) => rowSum + Math.abs(val), 0),
    0
  );
  console.log(`Position ${pos}: total curvature = ${totalCurvature.toFixed(3)}`);
}

// Example 6: Homological features
console.log('\n\n=== Example 6: Homological Features ===');

// Fold the tRNA
const foldedTRNA = tRNAModel.fold();

// Recompute homology
tRNAModel.homology = tRNAModel.homologyCalculator.computeHomology();

console.log(`\nAfter folding:`);
console.log(`H0 (components): ${tRNAModel.homology.H0}`);
console.log(`H1 (loops): ${tRNAModel.homology.H1.length}`);
console.log(`H2 (pockets): ${tRNAModel.homology.H2.length}`);

// Analyze pockets
if (tRNAModel.homology.H2.length > 0) {
  console.log('\nPocket analysis:');
  for (const pocket of tRNAModel.homology.H2) {
    console.log(`- ${pocket.function} pocket: volume = ${pocket.volume.toFixed(1)} Å³`);
  }
}

// Example 7: Symmetry reduction
console.log('\n\n=== Example 7: Symmetry Reduction ===');

const orbits = tRNAModel.getSymmetryOrbits();
console.log(`\nNumber of E8 Weyl orbits: ${orbits.length}`);
console.log(`Reduction factor: ${(256 / orbits.length).toFixed(1)}x`);

// Show largest orbits
const sortedOrbits = orbits.sort(
  (a: ConformationalFields[], b: ConformationalFields[]) => b.length - a.length
);
console.log('\nLargest orbits:');
for (let i = 0; i < Math.min(5, sortedOrbits.length); i++) {
  console.log(`- Orbit ${i + 1}: ${sortedOrbits[i].length} states`);
}

// Example 8: Modular group action
console.log('\n\n=== Example 8: Modular Group Action ===');

const energy = tRNAModel.landscape.freeEnergy(foldedTRNA);
console.log(`\nOriginal free energy: ${energy.toFixed(2)} kcal/mol`);

// Apply modular transformation (temperature change)
const tempTransform = { a: 1, b: 5, c: 0, d: 1 }; // Shift by 5
const newEnergy = tRNAModel.landscape.modularAction(energy, tempTransform);
console.log(`After modular transformation: ${newEnergy.toFixed(2)} kcal/mol`);

// Apply another transformation (ion concentration)
const ionTransform = { a: 2, b: 0, c: 1, d: 1 }; // Scale by 2/(1+E)
const finalEnergy = tRNAModel.landscape.modularAction(newEnergy, ionTransform);
console.log(`After ion transformation: ${finalEnergy.toFixed(2)} kcal/mol`);

console.log('\n=== Complete ===');
