// Use crypto.randomUUID() to create unique IDs
const { randomUUID } = require('crypto');
// Use https://www.npmjs.com/package/content-type to create/parse Content-Type headers
const contentType = require('content-type');

// Functions for working with fragment metadata/data using our DB
const {
  readFragment,
  writeFragment,
  readFragmentData,
  writeFragmentData,
  listFragments,
  deleteFragment,
} = require('./data');

class Fragment {
  constructor({ id, ownerId, created, updated, type, size = 0 }) {
    if (!ownerId) throw new Error('ownerId is required');
    if (!type) throw new Error('type is required');
    if (!Fragment.isSupportedType(type)) {
      throw new Error(`Unsupported type: ${type}`);
    }

    // Validate size
    if (typeof size !== 'number' || Number.isNaN(size)) {
      throw new Error('size must be a number');
    }
    if (size < 0) {
      throw new Error('size cannot be negative');
    }

    this.id = id || randomUUID();
    this.ownerId = ownerId;
    this.created = created || new Date().toISOString();
    this.updated = updated || new Date().toISOString();
    this.type = type;
    this.size = size;
  }

  static async byUser(ownerId, expand = false) {
    const results = await listFragments(ownerId, expand);
    if (expand) {
      return results.map((item) => new Fragment(JSON.parse(item)));
    }
    return results;
  }

  static async byId(ownerId, id) {
    const fragmentData = await readFragment(ownerId, id);
    if (!fragmentData) throw new Error('Fragment not found');
    return new Fragment(fragmentData);
  }

  static delete(ownerId, id) {
    return deleteFragment(ownerId, id);
  }

  async save() {
    this.updated = new Date().toISOString();
    return writeFragment(this);
  }

  async getData() {
    return readFragmentData(this.ownerId, this.id);
  }

  async setData(data) {
    if (!Buffer.isBuffer(data)) throw new Error('Data must be a Buffer');
    this.size = data.length;
    this.updated = new Date().toISOString();
    await writeFragmentData(this.ownerId, this.id, data);
    await writeFragment(this);
  }

  get mimeType() {
    const { type } = contentType.parse(this.type);
    return type;
  }

  get isText() {
    return this.mimeType.startsWith('text/');
  }

  get formats() {
    switch (this.mimeType) {
      case 'text/plain':
        return ['text/plain'];
      default:
        return [this.mimeType];
    }
  }

  static isSupportedType(value) {
    const { type } = contentType.parse(value);
    return ['text/plain'].includes(type);
  }
}

module.exports.Fragment = Fragment;
