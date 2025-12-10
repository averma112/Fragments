// tests/unit/conversions.test.js
const {
  getMimeTypeForExtension,
  isValidConversion,
  convertFragment,
} = require('../../src/model/conversions');

describe('conversions', () => {
  describe('getMimeTypeForExtension()', () => {
    test('returns correct mime type for .txt', () => {
      expect(getMimeTypeForExtension('.txt')).toBe('text/plain');
    });

    test('returns correct mime type for .md', () => {
      expect(getMimeTypeForExtension('.md')).toBe('text/markdown');
    });

    test('returns correct mime type for .html', () => {
      expect(getMimeTypeForExtension('.html')).toBe('text/html');
    });

    test('returns correct mime type for .json', () => {
      expect(getMimeTypeForExtension('.json')).toBe('application/json');
    });

    test('returns correct mime type for .yaml', () => {
      expect(getMimeTypeForExtension('.yaml')).toBe('application/yaml');
    });

    test('returns correct mime type for .png', () => {
      expect(getMimeTypeForExtension('.png')).toBe('image/png');
    });

    test('returns correct mime type for .jpg', () => {
      expect(getMimeTypeForExtension('.jpg')).toBe('image/jpeg');
    });

    test('returns correct mime type for .webp', () => {
      expect(getMimeTypeForExtension('.webp')).toBe('image/webp');
    });

    test('returns correct mime type for .gif', () => {
      expect(getMimeTypeForExtension('.gif')).toBe('image/gif');
    });

    test('returns correct mime type for .avif', () => {
      expect(getMimeTypeForExtension('.avif')).toBe('image/avif');
    });

    test('returns correct mime type for .csv', () => {
      expect(getMimeTypeForExtension('.csv')).toBe('text/csv');
    });

    test('returns undefined for unsupported extension', () => {
      expect(getMimeTypeForExtension('.xyz')).toBeUndefined();
    });
  });

  describe('isValidConversion()', () => {
    test('allows markdown to html conversion', () => {
      expect(isValidConversion('text/markdown', '.html')).toBe(true);
    });

    test('allows markdown to txt conversion', () => {
      expect(isValidConversion('text/markdown', '.txt')).toBe(true);
    });

    test('allows html to txt conversion', () => {
      expect(isValidConversion('text/html', '.txt')).toBe(true);
    });

    test('allows csv to json conversion', () => {
      expect(isValidConversion('text/csv', '.json')).toBe(true);
    });

    test('allows csv to txt conversion', () => {
      expect(isValidConversion('text/csv', '.txt')).toBe(true);
    });

    test('allows json to yaml conversion', () => {
      expect(isValidConversion('application/json', '.yaml')).toBe(true);
    });

    test('allows json to txt conversion', () => {
      expect(isValidConversion('application/json', '.txt')).toBe(true);
    });



    test('allows png to jpeg conversion', () => {
      expect(isValidConversion('image/png', '.jpg')).toBe(true);
    });

    test('allows png to webp conversion', () => {
      expect(isValidConversion('image/png', '.webp')).toBe(true);
    });

    test('allows png to gif conversion', () => {
      expect(isValidConversion('image/png', '.gif')).toBe(true);
    });

    test('allows png to avif conversion', () => {
      expect(isValidConversion('image/png', '.avif')).toBe(true);
    });

    test('allows jpeg to png conversion', () => {
      expect(isValidConversion('image/jpeg', '.png')).toBe(true);
    });

    test('allows webp to png conversion', () => {
      expect(isValidConversion('image/webp', '.png')).toBe(true);
    });

    test('allows gif to png conversion', () => {
      expect(isValidConversion('image/gif', '.png')).toBe(true);
    });

    test('rejects invalid conversion', () => {
      expect(isValidConversion('text/plain', '.json')).toBe(false);
    });

    test('rejects conversion to unsupported extension', () => {
      expect(isValidConversion('text/markdown', '.xyz')).toBe(false);
    });

    test('rejects conversion from unsupported type', () => {
      expect(isValidConversion('application/pdf', '.txt')).toBe(false);
    });
  });

  describe('convertFragment()', () => {
    describe('Markdown conversions', () => {
      test('converts markdown to html', async () => {
        const data = Buffer.from('# Hello\n\nThis is a test.');
        const result = await convertFragment(data, 'text/markdown', '.html');
        
        expect(result.contentType).toBe('text/html; charset=utf-8');
        expect(result.data.toString()).toContain('<h1>Hello</h1>');
        expect(result.data.toString()).toContain('<p>This is a test.</p>');
      });

      test('converts markdown to txt', async () => {
        const data = Buffer.from('# Hello\n\nThis is a test.');
        const result = await convertFragment(data, 'text/markdown', '.txt');
        
        expect(result.contentType).toBe('text/plain; charset=utf-8');
        expect(result.data.toString()).toBe('# Hello\n\nThis is a test.');
      });

      test('keeps markdown as markdown', async () => {
        const data = Buffer.from('# Hello');
        const result = await convertFragment(data, 'text/markdown', '.md');
        
        expect(result.contentType).toBe('text/markdown; charset=utf-8');
        expect(result.data).toBe(data);
      });
    });

    describe('HTML conversions', () => {
      test('keeps html as html', async () => {
        const data = Buffer.from('<h1>Hello</h1>');
        const result = await convertFragment(data, 'text/html', '.html');
        
        expect(result.contentType).toBe('text/html; charset=utf-8');
        expect(result.data).toBe(data);
      });

      test('converts html to txt (strips tags)', async () => {
        const data = Buffer.from('<h1>Hello</h1><p>World</p>');
        const result = await convertFragment(data, 'text/html', '.txt');
        
        expect(result.contentType).toBe('text/plain; charset=utf-8');
        expect(result.data.toString()).toBe('HelloWorld');
      });
    });

    describe('Plain text conversions', () => {
      test('keeps txt as txt', async () => {
        const data = Buffer.from('Hello World');
        const result = await convertFragment(data, 'text/plain', '.txt');
        
        expect(result.contentType).toBe('text/plain; charset=utf-8');
        expect(result.data).toBe(data);
      });
    });

    describe('CSV conversions', () => {
      test('keeps csv as csv', async () => {
        const data = Buffer.from('name,age\nJohn,30');
        const result = await convertFragment(data, 'text/csv', '.csv');
        
        expect(result.contentType).toBe('text/csv; charset=utf-8');
        expect(result.data).toBe(data);
      });

      test('converts csv to txt', async () => {
        const data = Buffer.from('name,age\nJohn,30');
        const result = await convertFragment(data, 'text/csv', '.txt');
        
        expect(result.contentType).toBe('text/plain; charset=utf-8');
        expect(result.data).toBe(data);
      });

      test('converts csv to json', async () => {
        const data = Buffer.from('name,age\nJohn,30\nJane,25');
        const result = await convertFragment(data, 'text/csv', '.json');
        
        expect(result.contentType).toBe('application/json');
        const json = JSON.parse(result.data.toString());
        expect(json).toEqual([
          { name: 'John', age: '30' },
          { name: 'Jane', age: '25' }
        ]);
      });

      test('handles empty csv', async () => {
        const data = Buffer.from('');
        const result = await convertFragment(data, 'text/csv', '.json');
        
        expect(result.contentType).toBe('application/json');
        expect(result.data.toString()).toBe('[]');
      });

      test('handles csv with missing values', async () => {
        const data = Buffer.from('name,age\nJohn,\n,25');
        const result = await convertFragment(data, 'text/csv', '.json');
        
        const json = JSON.parse(result.data.toString());
        expect(json).toEqual([
          { name: 'John', age: '' },
          { name: '', age: '25' }
        ]);
      });
    });

    describe('JSON conversions', () => {
      test('keeps json as json', async () => {
        const data = Buffer.from('{"name":"John"}');
        const result = await convertFragment(data, 'application/json', '.json');
        
        expect(result.contentType).toBe('application/json');
        expect(result.data).toBe(data);
      });

      test('converts json to yaml', async () => {
        const data = Buffer.from('{"name":"John","age":30}');
        const result = await convertFragment(data, 'application/json', '.yaml');
        
        expect(result.contentType).toBe('application/yaml');
        expect(result.data.toString()).toContain('name: John');
        expect(result.data.toString()).toContain('age: 30');
      });

      test('converts json to txt', async () => {
        const data = Buffer.from('{"name":"John","age":30}');
        const result = await convertFragment(data, 'application/json', '.txt');
        
        expect(result.contentType).toBe('text/plain; charset=utf-8');
        expect(result.data.toString()).toContain('"name"');
        expect(result.data.toString()).toContain('"John"');
      });

      test('converts json array to yaml', async () => {
        const data = Buffer.from('[{"id":1},{"id":2}]');
        const result = await convertFragment(data, 'application/json', '.yaml');
        
        expect(result.contentType).toBe('application/yaml');
        expect(result.data.toString()).toContain('- id: 1');
        expect(result.data.toString()).toContain('- id: 2');
      });
    });



    describe('Error handling', () => {
      test('throws error for unsupported conversion', async () => {
        const data = Buffer.from('test');
        await expect(
          convertFragment(data, 'text/plain', '.json')
        ).rejects.toThrow('Unsupported conversion');
      });

      test('handles invalid JSON gracefully', async () => {
        const data = Buffer.from('not valid json');
        await expect(
          convertFragment(data, 'application/json', '.yaml')
        ).rejects.toThrow();
      });


    });
  });
});
