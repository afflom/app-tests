import { ZeroPointAddressSystem } from './zero-point-coordinates';

console.log('Starting debug...');

const addressSystem = new ZeroPointAddressSystem();
console.log('System created');

const data = new Uint8Array([1, 2, 3]);
console.log('Test data:', data);

try {
  console.log('Calling encode...');
  const coordinate = addressSystem.encode(data);
  console.log('Encode complete!');
  console.log('Coordinate:', {
    x: coordinate.x.toString(16).substring(0, 16) + '...',
    y: coordinate.y.toString(16).substring(0, 16) + '...',
    z: coordinate.z.toString(16).substring(0, 16) + '...',
    t: coordinate.t.toString(16).substring(0, 16) + '...'
  });
} catch (error) {
  console.error('Error during encode:', error);
}

console.log('Debug complete');