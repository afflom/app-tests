import { ZeroPointAddressSystem } from './zero-point-coordinates';

describe('ZeroPointAddressSystem - Minimal', () => {
  let addressSystem: ZeroPointAddressSystem;
  
  beforeEach(() => {
    console.log('Creating ZeroPointAddressSystem...');
    addressSystem = new ZeroPointAddressSystem();
    console.log('ZeroPointAddressSystem created');
  });
  
  test('should initialize', () => {
    expect(addressSystem).toBeDefined();
  });
  
  test('should encode small data', () => {
    console.log('Encoding small data...');
    const input = new Uint8Array([1, 2, 3]);
    
    const startTime = Date.now();
    const coordinate = addressSystem.encode(input);
    const endTime = Date.now();
    
    console.log('Encoding took:', endTime - startTime, 'ms');
    console.log('Coordinate x bits:', coordinate.x.toString(2).length);
    
    expect(coordinate).toBeDefined();
    expect(coordinate.x).toBeDefined();
  });
});