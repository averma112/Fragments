const { Fragment } = require('../../src/model/fragment');

describe('Simple JSON Fragment', () => {
  test('should create a fragment with JSON data', async () => {
    const data = { test: 'data' };
    const fragment = new Fragment({
      ownerId: 'user1',
      type: 'application/json'
    });
    
    await fragment.setData(Buffer.from(JSON.stringify(data)));
    await fragment.save();
    
    expect(fragment.id).toBeDefined();
    expect(fragment.size).toBeGreaterThan(0);
    expect(fragment.updated).toBeDefined();
  });

  test('should retrieve fragment data', async () => {
    const data = { key: 'value' };
    const fragment = new Fragment({
      ownerId: 'user1',
      type: 'application/json'
    });
    
    await fragment.setData(Buffer.from(JSON.stringify(data)));
    await fragment.save();
    
    const retrievedData = await fragment.getData();
    expect(JSON.parse(retrievedData.toString())).toEqual(data);
  });

  test('should list fragments by user', async () => {
    const fragment1 = new Fragment({
      ownerId: 'user1',
      type: 'application/json'
    });
    await fragment1.setData(Buffer.from(JSON.stringify({ test: 'data1' })));
    await fragment1.save();
    
    const fragment2 = new Fragment({
      ownerId: 'user1',
      type: 'application/json'
    });
    await fragment2.setData(Buffer.from(JSON.stringify({ test: 'data2' })));
    await fragment2.save();
    
    const fragments = await Fragment.byUser('user1');
    expect(fragments.length).toBeGreaterThanOrEqual(2);
  });
});