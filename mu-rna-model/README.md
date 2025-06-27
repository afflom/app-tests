# MU:RNA Model

An implementation of the Mathematical Universe RNA (MU:RNA) Model - a novel theoretical framework for understanding RNA structure and folding through algebraic and geometric structures.

## Overview

The MU:RNA Model provides a unified mathematical framework that describes RNA structure at all scales by mapping the Mathematical Universe (MU) framework onto RNA biophysics. The model represents each nucleotide's conformational state as an 8-dimensional binary vector, generating a Clifford algebra Cl(8,0) of nucleotide states.

## Key Features

### 1. **8-Dimensional Conformational Fields**
Each nucleotide is characterized by 8 binary fields:
- **e0**: Pairing State (Watson-Crick/Wobble paired vs unpaired)
- **e1**: Stacking (stacked vs unstacked)
- **e2**: Sugar Pucker (C3'-endo vs C2'-endo)
- **e3**: Backbone Torsion (canonical vs non-canonical)
- **e4**: Tertiary Interaction (involved vs not involved)
- **e5**: Edge Accessibility (accessible vs buried)
- **e6**: Backbone Exposure (exposed vs buried)
- **e7**: Ion Coordination (coordinated vs not coordinated)

### 2. **Clifford Algebra Cl(8,0)**
The 8 fields generate a 256-element Clifford algebra where:
- Grade-0: Ground state
- Grade-1: Individual properties
- Grade-2: Correlated properties (e.g., e0∧e1 = paired AND stacked)
- Higher grades: Complex multi-property correlations

### 3. **Fiber Bundle Structure**
RNA molecules are sections of a fiber bundle π: E → B where:
- Base space B: Primary sequence positions
- Fiber F: 256 possible conformational states
- Total space E: All possible conformational assignments

### 4. **E8 Symmetry**
The model hypothesizes E8 as the master symmetry of RNA folding:
- 240 non-identity roots correspond to stable conformations
- Weyl group transformations preserve global stability
- Provides exponential speedup through symmetry reduction

### 5. **Orbifold Domain Structure**
48-nucleotide pages model structural domains with:
- Smooth boundaries within domains
- Singular boundaries at flexible hinges
- Natural representation of domain organization

### 6. **Homological Analysis**
- **H0**: Connected components
- **H1**: Physical loops (hairpins, internal loops, pseudoknots)
- **H2**: Pockets and voids (binding sites, catalytic centers)

### 7. **Gauge Connection**
Biophysical forces as gauge fields enabling:
- Parallel transport of conformational states
- Curvature representing structural strain
- Holonomy around loops

## Installation

```bash
npm install
npm run build
```

## Usage

### Basic Example

```typescript
import { createMURNAModel } from 'mu-rna-model';

// Create model for an RNA sequence
const sequence = 'GGGCAAAAGCCC';
const model = createMURNAModel(sequence);

// Fold the RNA
const folded = model.fold();

// Analyze results
console.log(`Free energy: ${model.landscape.freeEnergy(folded)} kcal/mol`);
console.log(`Loops: ${model.homology.H1.length}`);
console.log(`E8 stability: ${model.e8.stabilityScore(folded.states[0].fields)}`);
```

### Advanced Features

```typescript
// Compute symmetry orbits for reduced search space
const orbits = model.getSymmetryOrbits();
console.log(`Symmetry reduction: ${256 / orbits.length}x`);

// Find folding pathway
const pathway = model.findFoldingPathway(unfolded, folded);
console.log(`Path length: ${pathway.length}`);

// Analyze domain structure
const connections = model.orbifold.findDomainConnections();
for (const conn of connections) {
  console.log(`Domain ${conn.from.pageNumber} → ${conn.to.pageNumber}`);
}
```

## Examples

Run the included examples:

```bash
# Basic usage demonstration
npm run example:basic

# Visualization of RNA structure
npm run example:viz
```

## Mathematical Background

The model is based on several advanced mathematical concepts:

1. **Clifford Algebras**: For representing conformational states
2. **Fiber Bundles**: For the sequence-conformation relationship
3. **Lie Groups (E8)**: For symmetry and stability
4. **Orbifolds**: For domain boundaries
5. **Homology**: For topological features
6. **Gauge Theory**: For force propagation

## Applications

- **Structure Prediction**: Use E8 symmetry for efficient search
- **Dynamics**: Model folding pathways as geodesics
- **Design**: Engineer sequences with desired topological properties
- **Analysis**: Classify structures by homological invariants

## Theory

The complete theoretical framework is described in:
"The MU:RNA Model: An Algebraic and Geometric Framework for RNA Folding"

Key insight: The 8 binary fields naturally give rise to E8 symmetry, suggesting that RNA exploits the same mathematical structures that appear in string theory and other fundamental physics.

## License

MIT License

## Contributing

Contributions are welcome! Please submit issues and pull requests.

## Acknowledgments

Based on the Mathematical Universe framework and inspired by the deep connections between mathematics and molecular biology.