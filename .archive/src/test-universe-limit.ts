import { MathematicalUniverse } from '@uor-foundation/math-ts-core';

console.log('Testing MathematicalUniverse with different number sizes...\n');

const universe = new MathematicalUniverse();

// Test different sizes
const testNumbers = [
  42n,
  1234567890n,
  1n << 32n,  // 32 bits
  1n << 64n,  // 64 bits
  1n << 128n, // 128 bits
  1n << 200n, // 200 bits
  1611977240390729644300458023399274631952029403297140070248550369332861730180n // Our actual number
];

for (const num of testNumbers) {
  const bits = num.toString(2).length;
  const digits = num.toString().length;
  
  console.log(`Testing ${bits}-bit number (${digits} digits)...`);
  console.time('analyze');
  
  try {
    const result = universe.analyze(num);
    console.timeEnd('analyze');
    console.log('Success! Resonance:', result.resonance);
  } catch (error) {
    console.timeEnd('analyze');
    console.error('Error:', error);
  }
  
  console.log('---');
}