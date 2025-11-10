// Import the convert function
const { convert } = require('../../src/model/fragment');

// Mock the Fragment class for testing
class MockFragment {
  constructor({ type, data }) {
    this.type = type;
    this.data = data || Buffer.from('');
  }
  
  async getData() {
    return this.data;
  }
  
  formats() {
    if (this.type === 'text/plain') return ['text/plain', 'text/html'];
    if (this.type === 'application/json') return ['application/json', 'text/plain'];
    return [this.type];
  }
}

describe('Fragment Conversion', () => {
  test('should convert text/plain to text/html', async () => {
    const fragment = {
      type: 'text/plain',
      formats: () => ['text/plain', 'text/html'],
      getData: jest.fn().mockResolvedValue(Buffer.from('Hello, world!'))
    };
    
    const result = await convert(fragment, 'text/html');
    expect(result).toBeInstanceOf(Buffer);
    expect(result.toString()).toContain('Hello, world!');
  });

  test('should convert application/json to text/plain', async () => {
    const fragment = {
      type: 'application/json',
      formats: () => ['application/json', 'text/plain'],
      getData: jest.fn().mockResolvedValue(Buffer.from(JSON.stringify({ key: 'value' })))
    };
    
    const result = await convert(fragment, 'text/plain');
    expect(result).toBeInstanceOf(Buffer);
    expect(result.toString()).toContain('{\n  "key": "value"\n}');
  });

  test('should throw error for unsupported conversion', async () => {
    const fragment = {
      type: 'text/plain',
      formats: () => ['text/plain'],
      getData: jest.fn()
    };
    
    await expect(convert(fragment, 'application/pdf'))
      .rejects
      .toThrow('Unsupported conversion: text/plain -> application/pdf');
  });
});