const { assert } = require('chai');
const Model = require('../src/Model');
const InMemoryAdapter = require('../src/adapters/InMemoryAdapter');
const Datastore = require('../src/Datastore');
const Repository = require('../src/Repository');

/*
 * Tests to ensure that pre/post hooks are executed
 *
 * Concept here is to take a simple model through the entire lifecycle
 * of creation and deletion and check that a spy function was called.
 */
describe('Model Hooks', () => {
  const hooks = [
    'preSave',
    'preLoad',
    'preRemove',
    'postSave',
    'postLoad',
    'postRemove',
  ];

  function testHook(hook) {
    it(`should trigger ${hook} hook`, async () => {
      let called = false;

      async function callMeOnEvent() {
        called = true;
      }

      class TestModel extends Model {
        static schema() {
          return { name: 'string' };
        }
      }

      // Set hanlder...
      TestModel.prototype[hook] = callMeOnEvent;

      const datastore = new Datastore({ Adapter: InMemoryAdapter });
      const repository = new Repository({ models: [TestModel], datastore });

      const x = new TestModel({ name: `Hello ${Math.random()}` });

      // Now save and load to make sure all lifecycle would be covered.
      await x.save({ repository });
      if (called) return;

      // Now search for it.
      const results = await TestModel.find({ name: x.name }, { repository });
      assert.typeOf(results, 'array');
      assert.equal(results.length, 1);
      if (called) return;

      await results[0].load();
      if (called) return;

      // Finally remove it.
      await results[0].remove();
      assert.isTrue(called);
    });
  }

  hooks.forEach(testHook);
});
