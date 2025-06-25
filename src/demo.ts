/**
 * Demo script for 3D RNA folding
 */

import { foldRNA, RNAFolder, ValidationUtils, VisualizationUtils } from './index';
import { DiagnosticUtils } from './utils/DiagnosticUtils';
import * as fs from 'fs';
import * as path from 'path';

async function demo() {
  console.log('🧬 3D RNA FOLDING DEMO');
  console.log('=' + '='.repeat(60));
  
  // Test sequences
  const testSequences = [
    {
      name: 'Small hairpin',
      sequence: 'GGGCUUUUGCCC'
    },
    {
      name: 'tRNA fragment',
      sequence: 'GCGGAUUUAGCUCAGUUGGGAGAGCGCCAGACUGAAGAUCUGGAGGUCCUGUGUUCGAUCCACAGAAUUCGCACCA'
    },
    {
      name: 'Riboswitch aptamer',
      sequence: 'GGCGCUGGUUUCCCGACGGGGAGUCGAUGAGCAAUAUGCCGCAUGGAUAUGGCACGCAAAUUUCGAAAGAGGCAGGUGAU'
    }
  ];
  
  for (const test of testSequences) {
    console.log(`\n\n📝 ${test.name} (${test.sequence.length} bases)`);
    console.log(`Sequence: ${test.sequence.substring(0, 50)}${test.sequence.length > 50 ? '...' : ''}`);
    console.log('-'.repeat(70));
    
    try {
      // Fold the RNA
      const startTime = Date.now();
      const result = await foldRNA(test.sequence);
      const foldTime = Date.now() - startTime;
      
      console.log(`\n✅ Folding completed in ${foldTime}ms`);
      console.log(`Secondary structure: ${result.secondary}`);
      console.log(`Base pairs: ${result.pairs.length}`);
      console.log(`Energy: ${result.energy.toFixed(2)} kcal/mol`);
      
      // Validate structure
      const qualityScore = ValidationUtils.calculateQualityScore(result);
      const isPlausible = ValidationUtils.isBiologicallyPlausible(result);
      
      console.log(`\n📊 Validation:`);
      console.log(`Quality score: ${(qualityScore * 100).toFixed(1)}%`);
      console.log(`Biologically plausible: ${isPlausible ? '✅ Yes' : '❌ No'}`);
      
      // Get statistics
      const stats = VisualizationUtils.getStatistics(result);
      console.log(`\n📈 Statistics:`);
      console.log(`GC content: ${(stats.gcContent * 100).toFixed(1)}%`);
      console.log(`Stems: ${stats.stems}`);
      console.log(`Loops: ${stats.loops}`);
      
      // Save outputs
      const outputDir = path.join(__dirname, '..', 'output');
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }
      
      // Save PDB
      const pdbPath = path.join(outputDir, `${test.name.replace(/\s+/g, '_')}.pdb`);
      fs.writeFileSync(pdbPath, VisualizationUtils.toPDB(result));
      console.log(`\n💾 Saved PDB: ${pdbPath}`);
      
      // Save SVG
      const svgPath = path.join(outputDir, `${test.name.replace(/\s+/g, '_')}.svg`);
      fs.writeFileSync(svgPath, VisualizationUtils.toSVG(result));
      console.log(`💾 Saved SVG: ${svgPath}`);
      
      // Save validation report
      const reportPath = path.join(outputDir, `${test.name.replace(/\s+/g, '_')}_report.txt`);
      fs.writeFileSync(reportPath, ValidationUtils.generateReport(result));
      console.log(`💾 Saved report: ${reportPath}`);
      
      // Save diagnostic report
      DiagnosticUtils.saveDiagnosticReport(result, outputDir, test.name.replace(/\s+/g, '_'));
      console.log(`💾 Saved diagnostics: ${test.name.replace(/\s+/g, '_')}_diagnostics.json`);
      
    } catch (error) {
      console.error(`❌ Error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  // Advanced demo: Custom parameters
  console.log('\n\n🔧 ADVANCED: Custom Parameters');
  console.log('-'.repeat(70));
  
  const customFolder = new RNAFolder({
    fieldCoupling: 0.1,
    entanglementThreshold: 0.2,
    harmonicStrength: 2.5,
    annealingSteps: 300
  });
  
  const customResult = await customFolder.fold('AUGCAUGCAUGC');
  console.log(`Custom folding completed`);
  console.log(`Energy: ${customResult.energy.toFixed(2)} kcal/mol`);
  console.log(`Secondary: ${customResult.secondary}`);
  
  console.log('\n\n✨ Demo completed!');
}

// Run demo
if (require.main === module) {
  demo().catch(console.error);
}