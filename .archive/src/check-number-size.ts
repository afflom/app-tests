import { createHash } from 'crypto';

// Simulate the dataToNumber function
function dataToNumber(data: Uint8Array, dataHash: string): bigint {
  const hashBytes = Buffer.from(dataHash, 'hex');
  const hashNumber = bytesToBigInt(new Uint8Array(hashBytes));
  
  const lengthComponent = BigInt(data.length) << 32n;
  const structureComponent = analyzeDataStructure(data);
  
  return hashNumber + lengthComponent + structureComponent;
}

function bytesToBigInt(bytes: Uint8Array): bigint {
  let result = 0n;
  for (let i = 0; i < bytes.length; i++) {
    result = (result << 8n) | BigInt(bytes[i]);
  }
  return result || 1n;
}

function analyzeDataStructure(data: Uint8Array): bigint {
  let structure = 0n;
  const samples = Math.min(8, data.length);
  for (let i = 0; i < samples; i++) {
    const pos = Math.floor((i * data.length) / samples);
    structure = (structure << 8n) | BigInt(data[pos]);
  }
  return structure;
}

// Test with small data
const data = new Uint8Array([1, 2, 3]);
const dataHash = createHash('sha256').update(data).digest('hex');

console.log('Data:', data);
console.log('Hash:', dataHash);

const dataNumber = dataToNumber(data, dataHash);

console.log('DataNumber:', dataNumber);
console.log('DataNumber (hex):', dataNumber.toString(16));
console.log('DataNumber bit length:', dataNumber.toString(2).length);
console.log('DataNumber decimal digits:', dataNumber.toString().length);

// Check components
const hashBytes = Buffer.from(dataHash, 'hex');
const hashNumber = bytesToBigInt(new Uint8Array(hashBytes));
console.log('\nHash number:', hashNumber);
console.log('Hash number bits:', hashNumber.toString(2).length);

const lengthComponent = BigInt(data.length) << 32n;
console.log('\nLength component:', lengthComponent);
console.log('Length component bits:', lengthComponent.toString(2).length);

const structureComponent = analyzeDataStructure(data);
console.log('\nStructure component:', structureComponent);
console.log('Structure component bits:', structureComponent.toString(2).length);