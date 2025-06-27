/**
 * MU:RNA Model - Visualization Example
 *
 * Generates visual representations of RNA structure using the model
 */

import { createMURNAModel, ConformationalFields, NucleotideState } from '../src';

/**
 * Convert conformational fields to ASCII representation
 */
function fieldsToASCII(fields: ConformationalFields): string {
  if (fields.e0 && fields.e1) return '='; // Paired and stacked (strong helix)
  if (fields.e0) return '-'; // Paired only
  if (fields.e1) return '|'; // Stacked only
  if (fields.e4) return '*'; // Tertiary interaction
  if (fields.e7) return '+'; // Ion coordinated
  return '.'; // Unpaired, flexible
}

/**
 * Generate secondary structure notation
 */
function generateSecondaryStructure(states: NucleotideState[]): string {
  const pairs = new Map<number, number>();

  // Find pairs
  for (let i = 0; i < states.length; i++) {
    for (let j = i + 4; j < states.length; j++) {
      if (states[i].fields.e0 && states[j].fields.e0) {
        // Both in pairing state - check if compatible
        const base1 = states[i].base;
        const base2 = states[j].base;

        if (isComplementary(base1, base2)) {
          pairs.set(i, j);
          pairs.set(j, i);
          break; // Each base pairs with at most one other
        }
      }
    }
  }

  // Generate dot-bracket notation
  let structure = '';
  const processed = new Set<number>();

  for (let i = 0; i < states.length; i++) {
    if (pairs.has(i) && !processed.has(i)) {
      const j = pairs.get(i)!;
      if (j > i) {
        structure += '(';
        processed.add(i);
      } else {
        structure += ')';
        processed.add(i);
      }
    } else if (!pairs.has(i)) {
      structure += '.';
    }
  }

  return structure;
}

/**
 * Check if bases are complementary
 */
function isComplementary(base1: string, base2: string): boolean {
  return (
    (base1 === 'A' && base2 === 'U') ||
    (base1 === 'U' && base2 === 'A') ||
    (base1 === 'G' && base2 === 'C') ||
    (base1 === 'C' && base2 === 'G') ||
    (base1 === 'G' && base2 === 'U') ||
    (base1 === 'U' && base2 === 'G')
  );
}

/**
 * Create field pattern visualization
 */
function visualizeFieldPatterns(states: NucleotideState[]): string {
  const fieldNames = ['e0', 'e1', 'e2', 'e3', 'e4', 'e5', 'e6', 'e7'];
  const fieldLabels = ['Pair', 'Stack', "C3'", 'Tor', 'Tert', 'Edge', 'Back', 'Ion'];

  let viz = 'Field Patterns:\n';
  viz += '    Pos: ';
  for (let i = 1; i <= Math.min(states.length, 50); i++) {
    viz += (i % 10).toString();
  }
  viz += '\n';

  for (let f = 0; f < 8; f++) {
    viz += `${fieldLabels[f].padEnd(7)}: `;

    for (let i = 0; i < Math.min(states.length, 50); i++) {
      const fieldKey = fieldNames[f] as keyof ConformationalFields;
      viz += states[i].fields[fieldKey] ? '█' : '·';
    }

    viz += '\n';
  }

  return viz;
}

/**
 * Visualize domain structure
 */
function visualizeDomains(model: ReturnType<typeof createMURNAModel>): string {
  let viz = 'Domain Structure:\n';
  const domains = model.molecule.domains;

  for (const domain of domains) {
    const length = domain.end - domain.start + 1;
    viz += `Page ${domain.pageNumber}: [${domain.start}-${domain.end}] `;
    viz += '═'.repeat(Math.min(length, 48));

    if (domain.boundaryType === 'singular') {
      viz += '╪'; // Singularity marker
    }
    viz += '\n';
  }

  return viz;
}

/**
 * Create E8 stability heatmap
 */
function visualizeE8Stability(model: ReturnType<typeof createMURNAModel>): string {
  let viz = 'E8 Stability Score:\n';
  viz += '    Pos: ';

  const states = model.molecule.states;
  for (let i = 1; i <= Math.min(states.length, 50); i++) {
    viz += (i % 10).toString();
  }
  viz += '\n    E8:  ';

  for (let i = 0; i < Math.min(states.length, 50); i++) {
    const stability = model.e8.stabilityScore(states[i].fields);

    // Convert to grayscale
    if (stability > 0.9) viz += '█';
    else if (stability > 0.7) viz += '▓';
    else if (stability > 0.5) viz += '▒';
    else if (stability > 0.3) viz += '░';
    else viz += '·';
  }
  viz += '\n';

  return viz;
}

/**
 * Visualize homological features
 */
function visualizeHomology(model: ReturnType<typeof createMURNAModel>): string {
  let viz = 'Homological Features:\n\n';

  // H0 - Connected components
  viz += `H0 (Connected Components): ${model.homology.H0}\n\n`;

  // H1 - Loops
  viz += `H1 (Loops): ${model.homology.H1.length}\n`;
  for (const loop of model.homology.H1) {
    viz += `  ${loop.type}: `;

    // Show loop on sequence
    const maxPos = Math.max(...loop.positions);
    const minPos = Math.min(...loop.positions);

    for (let i = minPos; i <= maxPos; i++) {
      if (loop.positions.includes(i)) {
        viz += '◯';
      } else {
        viz += '-';
      }
    }
    viz += '\n';
  }

  // H2 - Pockets
  viz += `\nH2 (Pockets): ${model.homology.H2.length}\n`;
  for (const pocket of model.homology.H2) {
    viz += `  ${pocket.function} (${pocket.volume.toFixed(0)} Å³): `;
    viz += `boundary size = ${pocket.boundary.length}\n`;
  }

  return viz;
}

// Main visualization
console.log('=== MU:RNA Model Visualization ===\n');

// Example RNA: Hammerhead ribozyme core
const sequence = 'CUGAUGAGUCCGUGAGGACGAAACUCGCGAAACUCCC';
console.log(`Sequence: ${sequence}`);
console.log(`Length: ${sequence.length}\n`);

// Create and fold model
const model = createMURNAModel(sequence);
const folded = model.fold();

// Show conformational state
console.log('Conformational Representation:');
let confRep = '';
for (const state of folded.states) {
  confRep += fieldsToASCII(state.fields);
}
console.log(confRep);
console.log('Key: = (helix), - (pair), | (stack), * (tertiary), + (ion), . (flexible)\n');

// Show secondary structure
const secondary = generateSecondaryStructure(folded.states);
console.log('Secondary Structure:');
console.log(secondary);
console.log();

// Show field patterns
console.log(visualizeFieldPatterns(folded.states));

// Show E8 stability
console.log(visualizeE8Stability(model));

// Show domain structure
console.log(visualizeDomains(model));

// Show homology
console.log(visualizeHomology(model));

// Energy landscape
console.log('Energy Landscape:');
console.log(`Free Energy: ${model.landscape.freeEnergy(folded).toFixed(2)} kcal/mol`);
console.log(`Resonance: ${model.landscape.resonance(folded).toFixed(3)}`);

// Orbifold characteristics
console.log(
  `\nOrbifold Euler Characteristic: ${model.orbifold.eulerCharacteristic?.()?.toFixed(4) || 'N/A'}`
);
console.log(`Fundamental Group: ${model.orbifold.getFundamentalGroup?.() || 'N/A'}`);

// Show curvature profile
console.log('\nCurvature Profile:');
console.log('    Pos: 12345678901234567890');
console.log('    Cur: ');
for (let i = 1; i <= Math.min(sequence.length, 20); i++) {
  const curv = model.gauge.curvature(i);
  const totalCurv = curv.reduce(
    (sum: number, row: number[]) =>
      sum + row.reduce((rowSum: number, val: number) => rowSum + Math.abs(val), 0),
    0
  );

  // Convert to single digit
  const digit = Math.min(9, Math.floor(totalCurv * 10));
  process.stdout.write(digit.toString());
}
console.log('\n');

// Folding pathway visualization
console.log('=== Folding Pathway ===\n');

// Create unfolded state
const unfolded = { ...model.molecule };
unfolded.states = unfolded.states.map((state: NucleotideState) => ({
  ...state,
  fields: {
    e0: false,
    e1: false,
    e2: false,
    e3: false,
    e4: false,
    e5: true,
    e6: true,
    e7: false
  },
  cliffordIndex: 0b01100000
}));

// Find pathway
const pathway = model.findFoldingPathway(unfolded, folded);
console.log(`Path length: ${pathway.length.toFixed(1)} field changes`);
console.log(
  `Energy barriers: ${pathway.barriers.map((b: number) => b.toFixed(1)).join(' → ')} kcal/mol`
);

// Show key steps
console.log('\nKey folding steps:');
const steps = [
  0,
  Math.floor(pathway.path.length / 3),
  Math.floor((2 * pathway.path.length) / 3),
  pathway.path.length - 1
];

for (const step of steps) {
  const state = pathway.path[step];
  const progress = ((step / (pathway.path.length - 1)) * 100).toFixed(0);

  console.log(`\nStep ${step} (${progress}% folded):`);

  let rep = '';
  for (const s of state.states) {
    rep += fieldsToASCII(s.fields);
  }
  console.log(rep);
}

console.log('\n=== Visualization Complete ===');
