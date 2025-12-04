// src/model/fragment.js
// Simple in-memory implementation of the Fragment class expected by the unit tests.
// - Exports a class (export default Fragment)
// - Static methods: isSupportedType, byUser, byId
// - Instance methods: save, setData, getData, delete
//
// Note: this implementation uses in-memory Maps (not filesystem). That's ideal for unit tests
// and keeps tests deterministic. If you need filesystem persistence later, we can adapt it.

const { randomUUID } = require('crypto');
const store = require('./data');

const SUPPORTED_TYPES = [
  'text/plain',
  'text/markdown',
  'text/html',
  'text/csv',
  'application/json',
  'application/yaml',
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
  'image/avif',
];

class Fragment {
  constructor({ id = null, ownerId, created = null, updated = null, type, size = 0 }) {
    if (!ownerId) throw new Error('ownerId required');
    if (!type) throw new Error('type required');
    if (typeof size !== 'number' || isNaN(size) || size < 0) {
      throw new Error('size must be a non-negative number');
    }
    if (!Fragment.isSupportedType(type)) {
      throw new Error('Unsupported type');
    }

    this.id = id || randomUUID();
    this.ownerId = ownerId;
    this.type = type;
    const now = new Date().toISOString();
    this.created = created || now;
    this.updated = updated || now;
    this.size = size;
  }

  // Returns the mime type without any charset (e.g. 'text/plain' from 'text/plain; charset=utf-8')
  get mimeType() {
    if (!this.type) return '';
    return this.type.split(';')[0].trim().toLowerCase();
  }

  // whether the fragment is a "text" type (tests usually expect text/* and application/json to be "text-like")
  get isText() {
    const mt = this.mimeType;
    return mt.startsWith('text/') || mt === 'application/json';
  }

  // possible formats conversions (basic and safe)
  formats() {
    const mt = this.mimeType;
    // common conversions used by tests: return a small useful set for text/json
    if (mt === 'text/plain') {
      return ['text/plain', 'text/markdown', 'text/html'];
    }
    if (mt === 'application/json') {
      return ['application/json', 'text/plain'];
    }
    if (mt === 'text/markdown') {
      return ['text/markdown', 'text/html', 'text/plain'];
    }
    // images - return same type and jpeg/png/gif as allowed
    if (mt.startsWith('image/')) {
      return [mt];
    }
    return [mt];
  }

  // instance methods that interact with in-memory storage
  async save() {
    // store metadata in the static store
    this.updated = new Date().toISOString();
    await store.writeFragment(this);
    return;
  }

  async setData(buffer) {
    if (!Buffer.isBuffer(buffer)) {
      const err = new Error('data must be a Buffer');
      err.statusCode = 400;
      throw err;
    }
    await store.writeFragmentData(this.ownerId, this.id, buffer);
    this.size = buffer.length;
    this.updated = new Date().toISOString();
    // update stored metadata reference
    await store.writeFragment(this);
    return;
  }

  async getData() {
    const buf = await store.readFragmentData(this.ownerId, this.id);
    if (!buf) return null;
    return Buffer.isBuffer(buf) ? buf : Buffer.from(buf);
  }

  async delete() {
    await store.deleteFragment(this.ownerId, this.id);
    return;
  }

  // -----------------------
  // Static helpers / store
  // -----------------------

  // in-memory stores: Map<ownerId, Map<id, Fragment>> and Map<ownerId, Map<id, Buffer>>
  static _fragmentsByOwner = new Map();
  static _dataByOwner = new Map();

  static _ensureOwnerMap(ownerId) {
    if (!Fragment._fragmentsByOwner.has(ownerId)) {
      Fragment._fragmentsByOwner.set(ownerId, new Map());
    }
    if (!Fragment._dataByOwner.has(ownerId)) {
      Fragment._dataByOwner.set(ownerId, new Map());
    }
  }

  // Return metadata array (not the buffers). If expand=true return full fragment objects (incl. size, dates).
  // Tests generally call Fragment.byUser(ownerId) and expect [] when none exist.
  static async byUser(ownerId, expand = false) {
  const results = await store.listFragments(ownerId, expand);
  if (!results) return [];
  
  if (expand) {
    // If results are strings, parse them
    const fragments = results.map(item => 
      typeof item === 'string' ? new Fragment(JSON.parse(item)) : item
    );
    return fragments;
  }
  
  return results;
}

  // Return a Fragment instance (not a raw metadata object). If not found, throw (tests expect this in some cases).
  static async byId(ownerId, id) {
    const obj = await store.readFragment(ownerId, id);
    if (!obj) {
      const err = new Error('Fragment not found');
      err.statusCode = 404;
      throw err;
    }
    // Convert raw object into a Fragment instance
    return new Fragment(obj);
  }

  // check supported content types
  static isSupportedType(type) {
    if (!type || typeof type !== 'string') return false;
    const t = type.split(';')[0].trim().toLowerCase();
    return SUPPORTED_TYPES.includes(t);
  }

  // Static delete method to delete a fragment by ownerId and id
  static async delete(ownerId, id) {
    Fragment._ensureOwnerMap(ownerId);
    const fragment = await this.byId(ownerId, id);
    if (fragment) {
      await fragment.delete();
    }
    return Promise.resolve();
  }
}

// Export the Fragment class as default
// The static delete method is now part of the class definition

// Convert function
const convert = async (fragment, type) => {
  // Implementation for converting fragment data
  if (fragment.type === 'text/plain' && type === 'text/html') {
    return Buffer.from(`<pre>${(await fragment.getData()).toString()}</pre>`);
  } else if (fragment.type === 'application/json' && type === 'text/plain') {
    const data = JSON.parse((await fragment.getData()).toString());
    return Buffer.from(JSON.stringify(data, null, 2));
  }
  throw new Error(`Unsupported conversion: ${fragment.type} -> ${type}`);
};

module.exports = { Fragment, convert };
// Also export as a named export for better compatibility
module.exports.Fragment = Fragment;