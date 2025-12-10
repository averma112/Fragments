// src/model/conversions.js
// Fragment conversion utilities

const MarkdownIt = require('markdown-it');
const sharp = require('sharp');
const yaml = require('js-yaml');

const md = new MarkdownIt();

/**
 * Get the MIME type for a given extension
 */
function getMimeTypeForExtension(ext) {
  const mimeTypes = {
    '.txt': 'text/plain',
    '.md': 'text/markdown',
    '.html': 'text/html',
    '.csv': 'text/csv',
    '.json': 'application/json',
    '.yaml': 'application/yaml',
    '.yml': 'application/yaml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
    '.gif': 'image/gif',
    '.avif': 'image/avif',
  };
  return mimeTypes[ext];
}

/**
 * Check if conversion is valid for a given fragment type
 */
function isValidConversion(fromType, toExt) {
  const baseType = fromType.split(';')[0].trim().toLowerCase();
  
  const validConversions = {
    'text/plain': ['.txt'],
    'text/markdown': ['.md', '.html', '.txt'],
    'text/html': ['.html', '.txt'],
    'text/csv': ['.csv', '.txt', '.json'],
    'application/json': ['.json', '.yaml', '.yml', '.txt'],
    'application/yaml': ['.yaml', '.yml', '.txt'],
    'image/png': ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.avif'],
    'image/jpeg': ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.avif'],
    'image/webp': ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.avif'],
    'image/gif': ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.avif'],
    'image/avif': ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.avif'],
  };

  return validConversions[baseType]?.includes(toExt) || false;
}

/**
 * Convert fragment data from one type to another
 */
async function convertFragment(data, fromType, toExt) {
  const baseType = fromType.split(';')[0].trim().toLowerCase();
  const targetType = getMimeTypeForExtension(toExt);

  // Text conversions
  if (baseType === 'text/markdown') {
    if (toExt === '.html') {
      const source = Buffer.isBuffer(data) ? data.toString('utf8') : String(data);
      const html = md.render(source);
      return { data: Buffer.from(html), contentType: 'text/html; charset=utf-8' };
    }
    if (toExt === '.txt') {
      const source = Buffer.isBuffer(data) ? data.toString('utf8') : String(data);
      return { data: Buffer.from(source), contentType: 'text/plain; charset=utf-8' };
    }
    if (toExt === '.md') {
      return { data, contentType: 'text/markdown; charset=utf-8' };
    }
  }

  if (baseType === 'text/html') {
    if (toExt === '.html') {
      return { data, contentType: 'text/html; charset=utf-8' };
    }
    if (toExt === '.txt') {
      // Simple HTML to text conversion (strip tags)
      const source = Buffer.isBuffer(data) ? data.toString('utf8') : String(data);
      const text = source.replace(/<[^>]*>/g, '');
      return { data: Buffer.from(text), contentType: 'text/plain; charset=utf-8' };
    }
  }

  if (baseType === 'text/plain') {
    if (toExt === '.txt') {
      return { data, contentType: 'text/plain; charset=utf-8' };
    }
  }

  if (baseType === 'text/csv') {
    if (toExt === '.csv') {
      return { data, contentType: 'text/csv; charset=utf-8' };
    }
    if (toExt === '.txt') {
      return { data, contentType: 'text/plain; charset=utf-8' };
    }
    if (toExt === '.json') {
      // Simple CSV to JSON conversion
      const source = Buffer.isBuffer(data) ? data.toString('utf8') : String(data);
      const lines = source.trim().split('\n');
      if (lines.length === 0) {
        return { data: Buffer.from('[]'), contentType: 'application/json' };
      }
      const headers = lines[0].split(',').map(h => h.trim());
      const rows = lines.slice(1).map(line => {
        const values = line.split(',').map(v => v.trim());
        const obj = {};
        headers.forEach((header, i) => {
          obj[header] = values[i] || '';
        });
        return obj;
      });
      return { data: Buffer.from(JSON.stringify(rows, null, 2)), contentType: 'application/json' };
    }
  }

  // JSON conversions
  if (baseType === 'application/json') {
    const source = Buffer.isBuffer(data) ? data.toString('utf8') : String(data);
    const jsonData = JSON.parse(source);

    if (toExt === '.json') {
      return { data, contentType: 'application/json' };
    }
    if (toExt === '.yaml' || toExt === '.yml') {
      const yamlStr = yaml.dump(jsonData);
      return { data: Buffer.from(yamlStr), contentType: 'application/yaml' };
    }
    if (toExt === '.txt') {
      const text = JSON.stringify(jsonData, null, 2);
      return { data: Buffer.from(text), contentType: 'text/plain; charset=utf-8' };
    }
  }

  // YAML conversions
  if (baseType === 'application/yaml') {
    if (toExt === '.yaml' || toExt === '.yml') {
      return { data, contentType: 'application/yaml' };
    }
    if (toExt === '.txt') {
      return { data, contentType: 'text/plain; charset=utf-8' };
    }
  }

  // Image conversions using sharp
  if (baseType.startsWith('image/')) {
    try {
      let sharpImage = sharp(data);
      
      if (toExt === '.png') {
        const converted = await sharpImage.png().toBuffer();
        return { data: converted, contentType: 'image/png' };
      }
      if (toExt === '.jpg' || toExt === '.jpeg') {
        const converted = await sharpImage.jpeg().toBuffer();
        return { data: converted, contentType: 'image/jpeg' };
      }
      if (toExt === '.webp') {
        const converted = await sharpImage.webp().toBuffer();
        return { data: converted, contentType: 'image/webp' };
      }
      if (toExt === '.gif') {
        const converted = await sharpImage.gif().toBuffer();
        return { data: converted, contentType: 'image/gif' };
      }
      if (toExt === '.avif') {
        // AVIF requires libheif - check if available
        try {
          const converted = await sharpImage.avif({ quality: 80 }).toBuffer();
          return { data: converted, contentType: 'image/avif' };
        } catch (avifError) {
          // Fall back to WebP if AVIF encoding fails
          const logger = require('../logger');
          logger.warn({ err: avifError }, 'AVIF encoding not available, falling back to WebP');
          const converted = await sharpImage.webp({ quality: 80 }).toBuffer();
          return { data: converted, contentType: 'image/webp' };
        }
      }
    } catch (imageError) {
      throw new Error(`Image conversion failed: ${imageError.message}`);
    }
  }

  throw new Error('Unsupported conversion');
}

module.exports = {
  getMimeTypeForExtension,
  isValidConversion,
  convertFragment,
};
