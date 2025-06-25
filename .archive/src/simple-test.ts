import { MathematicalUniverse } from '@uor-foundation/math-ts-core';

console.log('Testing MathematicalUniverse initialization...');

try {
  console.log('Creating universe...');
  const universe = new MathematicalUniverse();
  console.log('Universe created successfully');
  
  // Test basic operation
  console.log('Testing analyze function...');
  const result = universe.analyze(42n);
  console.log('Analysis result:', {
    fields: result.fields,
    resonance: result.resonance,
    isPrime: result.isPrime
  });
  
} catch (error) {
  console.error('Error:', error);
}

console.log('Test complete');