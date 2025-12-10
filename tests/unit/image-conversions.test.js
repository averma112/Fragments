// tests/unit/image-conversions.test.js
const { convertFragment, isValidConversion } = require('../../src/model/conversions');
const sharp = require('sharp');

describe('Image Conversions', () => {
  // Create a simple test image buffer (1x1 red pixel PNG)
  const createTestImage = async (format = 'png') => {
    return await sharp({
      create: {
        width: 10,
        height: 10,
        channels: 3,
        background: { r: 255, g: 0, b: 0 }
      }
    })[format]().toBuffer();
  };

  describe('PNG conversions', () => {
    test('converts PNG to PNG (no-op)', async () => {
      const pngData = await createTestImage('png');
      const result = await convertFragment(pngData, 'image/png', '.png');
      
      expect(result.contentType).toBe('image/png');
      expect(Buffer.isBuffer(result.data)).toBe(true);
    });

    test('converts PNG to JPEG', async () => {
      const pngData = await createTestImage('png');
      const result = await convertFragment(pngData, 'image/png', '.jpg');
      
      expect(result.contentType).toBe('image/jpeg');
      expect(Buffer.isBuffer(result.data)).toBe(true);
      
      // Verify it's actually a JPEG
      const metadata = await sharp(result.data).metadata();
      expect(metadata.format).toBe('jpeg');
    });

    test('converts PNG to WebP', async () => {
      const pngData = await createTestImage('png');
      const result = await convertFragment(pngData, 'image/png', '.webp');
      
      expect(result.contentType).toBe('image/webp');
      
      const metadata = await sharp(result.data).metadata();
      expect(metadata.format).toBe('webp');
    });

    test('converts PNG to GIF', async () => {
      const pngData = await createTestImage('png');
      const result = await convertFragment(pngData, 'image/png', '.gif');
      
      expect(result.contentType).toBe('image/gif');
      
      const metadata = await sharp(result.data).metadata();
      expect(metadata.format).toBe('gif');
    });
  });

  describe('JPEG conversions', () => {
    test('converts JPEG to JPEG (no-op)', async () => {
      const jpegData = await createTestImage('jpeg');
      const result = await convertFragment(jpegData, 'image/jpeg', '.jpg');
      
      expect(result.contentType).toBe('image/jpeg');
      expect(Buffer.isBuffer(result.data)).toBe(true);
    });

    test('converts JPEG to PNG', async () => {
      const jpegData = await createTestImage('jpeg');
      const result = await convertFragment(jpegData, 'image/jpeg', '.png');
      
      expect(result.contentType).toBe('image/png');
      
      const metadata = await sharp(result.data).metadata();
      expect(metadata.format).toBe('png');
    });

    test('converts JPEG to WebP', async () => {
      const jpegData = await createTestImage('jpeg');
      const result = await convertFragment(jpegData, 'image/jpeg', '.webp');
      
      expect(result.contentType).toBe('image/webp');
      
      const metadata = await sharp(result.data).metadata();
      expect(metadata.format).toBe('webp');
    });

    test('converts JPEG to GIF', async () => {
      const jpegData = await createTestImage('jpeg');
      const result = await convertFragment(jpegData, 'image/jpeg', '.gif');
      
      expect(result.contentType).toBe('image/gif');
    });
  });

  describe('WebP conversions', () => {
    test('converts WebP to PNG', async () => {
      const webpData = await createTestImage('webp');
      const result = await convertFragment(webpData, 'image/webp', '.png');
      
      expect(result.contentType).toBe('image/png');
      
      const metadata = await sharp(result.data).metadata();
      expect(metadata.format).toBe('png');
    });

    test('converts WebP to JPEG', async () => {
      const webpData = await createTestImage('webp');
      const result = await convertFragment(webpData, 'image/webp', '.jpg');
      
      expect(result.contentType).toBe('image/jpeg');
    });

    test('converts WebP to WebP (no-op)', async () => {
      const webpData = await createTestImage('webp');
      const result = await convertFragment(webpData, 'image/webp', '.webp');
      
      expect(result.contentType).toBe('image/webp');
    });
  });

  describe('GIF conversions', () => {
    test('converts GIF to PNG', async () => {
      const gifData = await createTestImage('gif');
      const result = await convertFragment(gifData, 'image/gif', '.png');
      
      expect(result.contentType).toBe('image/png');
      
      const metadata = await sharp(result.data).metadata();
      expect(metadata.format).toBe('png');
    });

    test('converts GIF to JPEG', async () => {
      const gifData = await createTestImage('gif');
      const result = await convertFragment(gifData, 'image/gif', '.jpg');
      
      expect(result.contentType).toBe('image/jpeg');
    });

    test('converts GIF to WebP', async () => {
      const gifData = await createTestImage('gif');
      const result = await convertFragment(gifData, 'image/gif', '.webp');
      
      expect(result.contentType).toBe('image/webp');
    });

    test('converts GIF to GIF (no-op)', async () => {
      const gifData = await createTestImage('gif');
      const result = await convertFragment(gifData, 'image/gif', '.gif');
      
      expect(result.contentType).toBe('image/gif');
    });
  });

  describe('AVIF conversions', () => {
    test('attempts PNG to AVIF conversion (may fallback to WebP)', async () => {
      const pngData = await createTestImage('png');
      const result = await convertFragment(pngData, 'image/png', '.avif');
      
      // Accept either AVIF or WebP (fallback)
      expect(['image/avif', 'image/webp']).toContain(result.contentType);
      expect(Buffer.isBuffer(result.data)).toBe(true);
    });
  });

  describe('Image conversion validation', () => {
    test('validates all PNG to image conversions', () => {
      expect(isValidConversion('image/png', '.jpg')).toBe(true);
      expect(isValidConversion('image/png', '.jpeg')).toBe(true);
      expect(isValidConversion('image/png', '.webp')).toBe(true);
      expect(isValidConversion('image/png', '.gif')).toBe(true);
      expect(isValidConversion('image/png', '.avif')).toBe(true);
      expect(isValidConversion('image/png', '.png')).toBe(true);
    });

    test('validates all JPEG to image conversions', () => {
      expect(isValidConversion('image/jpeg', '.png')).toBe(true);
      expect(isValidConversion('image/jpeg', '.jpg')).toBe(true);
      expect(isValidConversion('image/jpeg', '.webp')).toBe(true);
      expect(isValidConversion('image/jpeg', '.gif')).toBe(true);
      expect(isValidConversion('image/jpeg', '.avif')).toBe(true);
    });

    test('validates all WebP to image conversions', () => {
      expect(isValidConversion('image/webp', '.png')).toBe(true);
      expect(isValidConversion('image/webp', '.jpg')).toBe(true);
      expect(isValidConversion('image/webp', '.webp')).toBe(true);
      expect(isValidConversion('image/webp', '.gif')).toBe(true);
      expect(isValidConversion('image/webp', '.avif')).toBe(true);
    });

    test('validates all GIF to image conversions', () => {
      expect(isValidConversion('image/gif', '.png')).toBe(true);
      expect(isValidConversion('image/gif', '.jpg')).toBe(true);
      expect(isValidConversion('image/gif', '.webp')).toBe(true);
      expect(isValidConversion('image/gif', '.gif')).toBe(true);
      expect(isValidConversion('image/gif', '.avif')).toBe(true);
    });

    test('rejects invalid image conversions', () => {
      expect(isValidConversion('image/png', '.txt')).toBe(false);
      expect(isValidConversion('image/png', '.json')).toBe(false);
      expect(isValidConversion('image/jpeg', '.html')).toBe(false);
    });
  });

  describe('Image conversion error handling', () => {
    test('throws error for invalid image data', async () => {
      const invalidData = Buffer.from('not an image');
      
      await expect(
        convertFragment(invalidData, 'image/png', '.jpg')
      ).rejects.toThrow();
    });

    test('throws error for corrupted image', async () => {
      const corruptedData = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x00, 0x00]); // Incomplete PNG header
      
      await expect(
        convertFragment(corruptedData, 'image/png', '.jpg')
      ).rejects.toThrow();
    });
  });
});
