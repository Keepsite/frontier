const { assert, expect } = require('chai');
const uuid = require('uuid');
const Frontier = require('../src');
const Model = require('../src/Model');
const InMemoryAdapter = require('../src/adapters/InMemoryAdapter');
const Datastore = require('../src/Datastore');
const Repository = require('../src/Repository');

describe('Model Instances', () => {
  class TestModel extends Model {
    static schema() {
      return {
        name: 'string',
      };
    }
  }
  const frontier = new Frontier({ models: [TestModel] });
  const repository = frontier.createRepository();
  const testInstance = new TestModel({ name: 'Joe Blow' });

  before(async () => {
    await frontier.ensureIndices();
    // Guarantee at least one saved.
    await testInstance.save({ repository });
  });

  class IdTestModel extends Model {
    static idKey() {
      return 'myId';
    }
    static schema() {
      return {
        myId: { type: 'string', default: uuid, readonly: true },
        name: 'string',
      };
    }
  }

  const testIdInstance = new IdTestModel({ name: 'Jane Smith' });

  it('should know its id', () => {
    const id = testInstance.id();
    assert.isOk(id);
  });

  it('should respect user setting a different ID fields', () => {
    const id = testIdInstance.id();
    assert.isOk(id);
    assert.equal(id, testIdInstance.myId);
  });

  it('should have a working find function', async () => {
    const items = await TestModel.find({ name: 'Joe Blow' }, { repository });
    assert.typeOf(items, 'Array');
  });

  it('should have a working count function', async () => {
    const count = await TestModel.count({ name: 'Joe Blow' }, { repository });
    assert.typeOf(count, 'number');
  });

  it('should have a toJSON function', () => {
    const json = testInstance.toJSON();

    assert.isOk(json);
    assert.equal(json.name, 'Joe Blow');

    // Should have an ID and a name field only.
    expect(Object.keys(json).length).to.equal(3);
  });

  it('should permit using ModelInstance.create', async () => {
    const modelInst = await TestModel.create(
      { name: 'Jack Sparrow' },
      { repository }
    );
    assert.isOk(modelInst);
    assert.equal(modelInst.name, 'Jack Sparrow');
  });

  it('should support loadAll', async () => {
    const testData = [...Array(10)].map(
      n => new TestModel({ name: `Test ${n}` })
    );
    await Promise.all(testData.map(m => m.save({ repository })));

    const toLoad = testData.map(m => TestModel.ref(m.id()));
    const results = await TestModel.loadAll(toLoad, { repository });

    assert.equal(toLoad.length, testData.length);
    assert.equal(results.length, testData.length);

    toLoad.forEach(v => {
      assert.typeOf(v, 'object');
      assert.isOk(v.name);
    });

    results.forEach(v => {
      assert.typeOf(v, 'object');
      assert.isOk(v.name);
    });
  });
});
