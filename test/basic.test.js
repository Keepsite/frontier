const { assert } = require('chai');
const Frontier = require('../src');
const Model = require('../src/Model');
const InMemoryAdapter = require('../src/adapters/InMemoryAdapter');
const Datastore = require('../src/Datastore');
const Repository = require('../src/Repository');

// const H = require('./harness');
// const frontier = H.lib;

describe('Models', () => {
  //   // Add long timeout in case of slow response on CI build servers.
  //   this.timeout(10000);

  it('should fail to register two models with the same name', () => {
    class TestModel extends Model {
      static schema() {}
    }

    assert.throws(
      () => new Frontier({ models: [TestModel, TestModel] }),
      Error
    );
  });

  it('should fail with an invalid type specified', () => {
    class TestModel extends Model {
      static schema() {
        return { test: 'stringxxxx' };
      }
    }

    assert.throws(() => new Frontier({ models: [TestModel] }), TypeError);
  });

  it('should fail with an invalid type specified in array', () => {
    class TestModel extends Model {
      static schema() {
        return { testArray: ['stringxxxx'] };
      }
    }

    assert.throws(() => new Frontier({ models: [TestModel] }), TypeError);
  });

  it('should fail when an array type has more than one member', () => {
    class TestModel extends Model {
      static schema() {
        return { someField: ['string', 'string'] };
      }
    }

    assert.throws(() => new Frontier({ models: [TestModel] }), TypeError);
  });

  it('should understand all basic types', () => {
    class TestModel extends Model {
      static schema() {
        return {
          str: 'string',
          num: 'number',
          int: 'integer',
          bool: 'boolean',
        };
      }
    }

    const frontier = new Frontier({ models: [TestModel] });
    assert.instanceOf(frontier, Frontier);
  });

  it('should understand all basic types in both schema formats, flat and object', () => {
    const types = ['string', 'number', 'integer', 'boolean'];
    const models = types.reduce((classes, type) => {
      const PlainClass = class extends Model {
        static schema() {
          return { Field: type };
        }
      };
      Object.defineProperty(PlainClass, 'name', {
        value: `Plain_${type}_Model`,
      });

      const ObjectClass = class extends Model {
        static schema() {
          return { ObjectField: { type } };
        }
      };
      Object.defineProperty(ObjectClass, 'name', {
        value: `Object_${type}_Model`,
      });

      const ArrayClass = class extends Model {
        static schema() {
          return { ArrayField: [type] };
        }
      };
      Object.defineProperty(ArrayClass, 'name', {
        value: `Array_${type}_Model`,
      });

      const ArrayObjectClass = class extends Model {
        static schema() {
          return { ArrayObjectField: [{ type }] };
        }
      };
      Object.defineProperty(ArrayObjectClass, 'name', {
        value: `ArrayObject_${type}_Model`,
      });

      return [
        ...classes,
        PlainClass,
        ObjectClass,
        ArrayClass,
        ArrayObjectClass,
      ];
    }, []);

    // eslint-disable-next-line no-new
    new Frontier({ models });
  });

  it('should serialize basic types properly', () => {
    class TestModel extends Model {
      static schema() {
        return { name: 'string' };
      }
    }

    const x = new TestModel();
    const xJson = x.toJSON();

    assert.typeOf(xJson.meta, 'object');
    assert.typeOf(xJson.meta.type, 'string');
    assert.equal(xJson.meta.type, 'TestModel');
    assert.typeOf(xJson.id, 'string');
    assert.equal(xJson.id, x.id);
    assert.isUndefined(xJson.name);
  });

  it('should serialize string types properly', () => {
    class TestModel extends Model {
      static schema() {
        return { name: 'string' };
      }
    }

    const x = new TestModel();
    x.name = 'Frank';
    const xJson = x.toJSON();

    assert.equal(xJson.name, 'Frank');
  });

  it('should round-trip Models properly', () => {
    class TestModel extends Model {
      static schema() {
        return { name: 'string' };
      }
    }

    const frontier = new Frontier({ models: [TestModel] });
    const x = new TestModel();
    x.name = 'Frank';
    const xJson = x.toJSON(x);
    const xObj = frontier.fromJSON(xJson);

    assert.instanceOf(xObj, TestModel);
    assert.equal(x.name, xObj.name);
  });

  it('should fail to deserialize a type with incorrect explicit type', () => {
    class TestModel extends Model {
      static schema() {
        return { name: 'string' };
      }
    }

    const frontier = new Frontier({ models: [TestModel] });
    const x = new TestModel();
    x.name = 'Frank';
    const xJson = x.toJSON(x);

    assert.throw(() => frontier.fromJSON(xJson, 'InvalidType'), TypeError);
  });

  it('should deserialize a type with correct explicit type', () => {
    class TestModel extends Model {
      static schema() {
        return { name: 'string' };
      }
    }

    const frontier = new Frontier({ models: [TestModel] });
    const x = new TestModel();
    x.name = 'Frank';
    const xCoo = x.toJSON(x);
    const xObj = frontier.fromJSON(xCoo, x.constructor.name);

    assert.instanceOf(xObj, TestModel);
    assert.equal(x.name, xObj.name);
  });

  it('should fail to deserialize JSON without meta.type or explicit type', () => {
    const data = { name: 'Frank' };
    const frontier = new Frontier({ models: [] });

    assert.throw(() => frontier.fromJSON(data), Error);
  });

  it('should deserialize with an explicit type', () => {
    class TestModel extends Model {
      static schema() {
        return { name: 'string' };
      }
    }
    const frontier = new Frontier({ models: [TestModel] });
    const data = { name: 'Frank' };

    const x = frontier.fromJSON(data, TestModel.name);
    assert.instanceOf(x, TestModel);
    assert.equal(x.name, 'Frank');
  });

  it('should fail to deserialize an unregistered type', () => {
    const frontier = new Frontier({ models: [] });
    const data = {
      name: 'Frank',
      meta: { type: 'InvalidType' },
    };
    assert.throw(() => frontier.fromJSON(data), Error);
  });

  describe('Strings', () => {
    it('should serialize string types properly', () => {
      class TestModel extends Model {
        static schema() {
          return { str: 'string' };
        }
      }
      const x = new TestModel();
      x.str = 'Bob';
      const xJson = x.toJSON();

      assert.typeOf(xJson.str, 'string');
      assert.equal(xJson.str, 'Bob');
    });

    it('should serialize mixed string types properly', () => {
      class TestModel extends Model {
        static schema() {
          return { str: 'Mixed' };
        }
      }
      const x = new TestModel();
      x.str = 'Bob';
      const xJson = x.toJSON();

      assert.typeOf(xJson.str, 'string');
      assert.equal(xJson.str, 'Bob');
    });
  });

  describe('Numbers', () => {
    it('should serialize numbers types properly', () => {
      class TestModel extends Model {
        static schema() {
          return { num: 'integer' };
        }
      }
      const x = new TestModel();
      x.num = 44.4;
      const xJson = x.toJSON();

      assert.typeOf(xJson.num, 'number');
      assert.equal(xJson.num, 44.4);
    });

    it('should serialize mixed numbers types properly', () => {
      class TestModel extends Model {
        static schema() {
          return { num: 'Mixed' };
        }
      }
      const x = new TestModel();
      x.num = 44.4;
      const xJson = x.toJSON();

      assert.typeOf(xJson.num, 'number');
      assert.equal(xJson.num, 44.4);
    });
  });

  describe('Integers', () => {
    it('should serialize integer types properly', () => {
      class TestModel extends Model {
        static schema() {
          return { int: 'integer' };
        }
      }
      const x = new TestModel();
      x.int = 44;
      const xJson = x.toJSON();

      assert.typeOf(xJson.int, 'number');
      assert.equal(xJson.int, 44);
    });

    it('should serialize mixed integer types properly', () => {
      class TestModel extends Model {
        static schema() {
          return { int: 'Mixed' };
        }
      }
      const x = new TestModel();
      x.int = 44;
      const xJson = x.toJSON();

      assert.typeOf(xJson.int, 'number');
      assert.equal(xJson.int, 44);
    });
  });

  describe('Booleans', () => {
    it('should serialize boolean types properly', () => {
      class TestModel extends Model {
        static schema() {
          return { bool: 'boolean' };
        }
      }
      const x = new TestModel();
      x.bool = true;
      const xJson = x.toJSON();

      assert.typeOf(xJson.bool, 'boolean');
      assert.equal(xJson.bool, true);
    });

    it('should serialize mixed boolean types properly', () => {
      class TestModel extends Model {
        static schema() {
          return { bool: 'Mixed' };
        }
      }
      const x = new TestModel();
      x.bool = true;
      const xJson = x.toJSON();

      assert.typeOf(xJson.bool, 'boolean');
      assert.equal(xJson.bool, true);
    });
  });

  describe('Dates', () => {
    it('should serialize date types properly', () => {
      class TestModel extends Model {
        static schema() {
          return { when: 'Date' };
        }
      }
      const x = new TestModel();
      x.when = new Date();
      const xJson = x.toJSON();

      assert.typeOf(xJson.when, 'string');
      assert.equal(xJson.when, x.when.toISOString());
    });

    it('should serialize mixed date types properly', () => {
      class TestModel extends Model {
        static schema() {
          return { when: 'Mixed' };
        }
      }
      const x = new TestModel();
      x.when = new Date();
      const xJson = x.toJSON();

      assert.equal(xJson.when, x.when.toISOString());
    });
  });

  describe('Groups', () => {
    it('should serialize groups properly', () => {
      class TestModel extends Model {
        static schema() {
          return {
            who: { name: 'string' },
          };
        }
      }
      const x = new TestModel();
      x.who.name = 'George';
      const xJson = x.toJSON();
      assert.instanceOf(xJson.who, Object);
      assert.equal(xJson.who.name, 'George');
    });
  });

  describe('Types', () => {
    it('should use Model types properly', () => {
      class Address extends Model {
        static schema() {
          return {
            number: 'number',
            street: 'string',
            city: 'string',
          };
        }
      }
      class TestModel extends Model {
        static schema() {
          return {
            address: { type: Address },
          };
        }
      }

      const x = new TestModel();
      x.address = new Address({
        number: 123,
        street: 'George St',
        city: 'Wellington',
      });
      const xJson = x.toJSON();
      assert.typeOf(xJson.address.street, 'string');
    });

    it('should use thunk Model types properly', () => {
      class Address extends Model {
        static schema() {
          return {
            number: 'number',
            street: 'string',
            city: 'string',
          };
        }
      }
      class TestModel extends Model {
        static schema() {
          return {
            address: { type: () => Address },
          };
        }
      }

      const x = new TestModel();
      x.address = new Address({
        number: 123,
        street: 'George St',
        city: 'Wellington',
      });
      const xJson = x.toJSON();
      assert.typeOf(xJson.address.street, 'string');
    });

    it('should handle circular references for Model types properly', () => {
      class TestModelA extends Model {
        static schema() {
          return {
            name: 'string',
            // eslint-disable-next-line no-use-before-define
            modelB: { type: () => TestModelB },
          };
        }
      }
      class TestModelB extends Model {
        static schema() {
          return {
            name: 'string',
            modelA: { type: () => TestModelA },
          };
        }
      }

      const x = new TestModelA({ name: 'ModelA' });
      x.modelB = new TestModelB({ name: 'ModelB', modelA: x });
      const xJson = x.toJSON();
      assert.equal(xJson.modelB.name, 'ModelB');
      assert.equal(xJson.modelB.modelA.name, 'ModelA');
      assert.equal(xJson.modelB.modelA.modelB.name, 'ModelB');
    });

    // TODO: Maybe?
    // it('should use support custom types', () => {
    //   const typeId = H.uniqueId('type');
    //   const modelId = H.uniqueId('model');
    //   const TestType = frontier.type(typeId, 'string');
    //   const TestMdl = frontier.model(modelId, {
    //     name: TestType,
    //   });
    //   const x = new TestMdl();
    //   x.name = 'George';
    //   const xJson = x.toJSON();
    //   assert.typeOf(xJson.name, 'string');
    // });
  });

  describe('Defaults', () => {
    it('should work with default string values', () => {
      class TestModel extends Model {
        static schema() {
          return {
            name: { type: 'string', default: 'Frank' },
          };
        }
      }
      const x = new TestModel();
      const xJson = x.toJSON();

      assert.typeOf(xJson.name, 'string');
      assert.equal(xJson.name, 'Frank');
    });

    it('should work with default number values', () => {
      class TestModel extends Model {
        static schema() {
          return {
            num: { type: 'number', default: 14.4 },
          };
        }
      }
      const x = new TestModel();
      const xJson = x.toJSON();
      assert.typeOf(xJson.num, 'number');
      assert.equal(xJson.num, 14.4);
    });

    it('should work with default date values', () => {
      class TestModel extends Model {
        static schema() {
          return {
            when: { type: 'Date', default: new Date() },
          };
        }
      }
      const x = new TestModel();
      const xJson = x.toJSON();

      assert.typeOf(xJson.when, 'string');
      assert.equal(xJson.when, x.when.toISOString());
    });

    it('should work with default value functions', () => {
      class TestModel extends Model {
        static schema() {
          return {
            num: { type: 'number', default: () => 19.3 },
          };
        }
      }
      const x = new TestModel();
      const xJson = x.toJSON();

      assert.typeOf(xJson.num, 'number');
      assert.equal(xJson.num, 19.3);
    });

    it('should work with default falsy value', () => {
      class TestModel extends Model {
        static schema() {
          return {
            num: { type: 'number', default: 0 },
            bool: { type: 'boolean', default: false },
          };
        }
      }
      const x = new TestModel();
      const xJson = x.toJSON();

      assert.typeOf(xJson.num, 'number');
      assert.equal(xJson.num, 0);
      assert.typeOf(xJson.bool, 'boolean');
      assert.equal(xJson.bool, false);
    });
  });

  describe('Special Fields', () => {
    it('should fail if the model defines an id property', () => {
      class TestModel extends Model {
        static schema() {
          return { id: { type: 'string' } };
        }
      }
      assert.throws(() => new TestModel());
    });

    // TODO: no modelName field

    // it('should accept custom id properties', () => {
    //   const modelId = H.uniqueId('model');
    //   const TestMdl = frontier.model(
    //     modelId,
    //     {
    //       customId: { type: 'string', auto: 'uuid', readonly: true },
    //     },
    //     {
    //       id: 'customId',
    //     },
    //   );
    //   const x = new TestMdl();
    //   const xJson = x.toJSON();

    //   assert.notProperty(xJson, '_id');
    //   assert.equal(xJson.customId, x.customId);
    // });

    // it('should accept custom id properties inside groups', () => {
    //   const modelId = H.uniqueId('model');
    //   const TestMdl = frontier.model(
    //     modelId,
    //     {
    //       test: {
    //         customId: { type: 'string', auto: 'uuid', readonly: true },
    //       },
    //     },
    //     {
    //       id: 'test.customId',
    //     },
    //   );
    //   const x = new TestMdl();
    //   const xJson = x.toJSON();

    //   assert.notProperty(xJson, '_id');
    //   assert.equal(xJson.test.customId, x.test.customId);
    // });
  });

  it('should support model instance with id reference', () => {
    class TestModel extends Model {
      static schema() {
        return {
          name: 'string',
          test: {
            child: 'string',
          },
        };
      }
    }
    const x = new TestModel();
    x.toJSON();

    const y = TestModel.ref('11');
    y.toJSON();
  });

  describe('Repositories', () => {
    it('should save and load an object with Repository reference in Model instance options', async () => {
      class TestModel extends Model {
        static schema() {
          return {
            name: 'string',
            test: {
              child: 'string',
            },
          };
        }
      }

      const datastore = new Datastore({ Adapter: InMemoryAdapter });
      const repository = new Repository({ models: [], datastore });
      const x = new TestModel({ name: 'George' }, { repository });
      await x.save();

      const y = TestModel.ref(x.id, { repository });
      await y.load();
      assert.instanceOf(y, TestModel);
      assert.equal(x.id, y.id);
      assert.equal(x.name, y.name);
    });

    it('should save and load an object with Repository reference in function call options', async () => {
      class TestModel extends Model {
        static schema() {
          return {
            name: 'string',
            test: {
              child: 'string',
            },
          };
        }
      }

      const datastore = new Datastore({ Adapter: InMemoryAdapter });
      const repository = new Repository({ models: [], datastore });
      const x = new TestModel({ name: 'George' });
      await x.save({ repository });

      const y = TestModel.ref(x.id);
      await y.load({ repository });
      assert.instanceOf(y, TestModel);
      assert.equal(x.id, y.id);
      assert.equal(x.name, y.name);
    });

    it('should save and load an object with Model reference from Repository', async () => {
      class TestModel extends Model {
        static schema() {
          return {
            name: 'string',
            test: { child: 'string' },
          };
        }
      }

      const datastore = new Datastore({ Adapter: InMemoryAdapter });
      const repo = new Repository({ models: [TestModel], datastore });
      assert.isUndefined(TestModel.prototype.repository);
      const x = new repo.models.TestModel({ name: 'George' });
      await x.save();

      const y = repo.models.TestModel.ref(x.id);
      await y.load();
      assert.instanceOf(y, TestModel);
      assert.equal(x.id, y.id);
      assert.equal(x.name, y.name);
    });
  });

  it('should successfully update an object', async () => {
    class TestModel extends Model {
      static schema() {
        return { name: 'string' };
      }
    }

    const datastore = new Datastore({ Adapter: InMemoryAdapter });
    const repo = new Repository({ models: [TestModel], datastore });
    const x = new repo.models.TestModel({ name: 'George' });
    await x.save();

    const y = repo.models.TestModel.ref(x.id);
    await y.load();
    assert.instanceOf(y, repo.models.TestModel);
    assert.equal(x.id, y.id);
    assert.equal(x.name, y.name);

    y.name = 'Not George';
    await y.save();

    const z = repo.models.TestModel.ref(x.id);
    await z.load();
    assert.instanceOf(y, repo.models.TestModel);
    assert.equal(y.id, z.id);
    assert.equal(y.name, z.name);
  });

  it('should correctly manage Model.loaded', async () => {
    class TestModel extends Model {
      static schema() {
        return { name: 'string' };
      }
    }

    const datastore = new Datastore({ Adapter: InMemoryAdapter });
    const repo = new Repository({ models: [TestModel], datastore });
    const x = new repo.models.TestModel({ name: 'George' });
    assert.isTrue(x.loaded);
    await x.save();
    assert.isTrue(x.loaded);

    const y = repo.models.TestModel.ref(x.id);
    assert.isFalse(y.loaded);
    await y.load();
    assert.isTrue(y.loaded);
  });

  it('should successfully load object with getById', async () => {
    class TestModel extends Model {
      static schema() {
        return { name: 'string' };
      }
    }

    const datastore = new Datastore({ Adapter: InMemoryAdapter });
    const repository = new Repository({ models: [TestModel], datastore });

    const x = new repository.models.TestModel({ name: 'George' });
    await x.save();

    const y = await repository.models.TestModel.getById(x.id);
    assert.instanceOf(y, TestModel);
    assert.equal(x.id, y.id);
    assert.equal(x.name, y.name);
  });

  it('should successfully remove objects', async () => {
    class TestModel extends Model {
      static schema() {
        return { name: 'string' };
      }
    }

    const datastore = new Datastore({ Adapter: InMemoryAdapter });
    const repository = new Repository({ models: [TestModel], datastore });
    const x = new repository.models.TestModel({ name: 'George' });
    await x.save();

    await repository.models.TestModel.getById(x.id);
    await x.remove();

    let error = null;
    await TestModel.getById(x.id).catch(e => {
      error = e;
    });
    assert.isNotNull(error);
  });

  // it('should successfully remove objects with refdoc indices', async () => {
  //   class TestModel extends Model {
  //     static schema() {
  //       return { name: 'string' };
  //     }

  //     // TODO: think about the best name (views/index/indices)
  //     static views() {
  //       return {
  //         findByName: {
  //           type: 'refdoc',
  //           by: 'name',
  //         },
  //       };
  //     }
  //   }

  //   const datastore = new Datastore({ Adapter: InMemoryAdapter });
  //   const repository = new Repository({ models: [TestModel], datastore });
  //   const x = new repository.models.TestModel({ name: 'George' });
  //   await x.save();

  //   await TestModel.findByName(x.name);
  //   await x.remove();

  //   const z = await TestModel.findByName(x.name);
  //   assert.lengthOf(z, 0);
  // });

  it('should fail to load an invalid id', async () => {
    class TestModel extends Model {
      static schema() {
        return { name: 'string' };
      }
    }

    const datastore = new Datastore({ Adapter: InMemoryAdapter });
    const repository = new Repository({ models: [TestModel], datastore });

    const y = repository.models.TestModel.ref('INVALID ID');
    let error = null;
    await y.load().catch(e => {
      error = e;
    });
    assert.isNotNull(error);
  });

  it('should fail getById with invalid id', async () => {
    class TestModel extends Model {
      static schema() {
        return { name: 'string' };
      }
    }

    const datastore = new Datastore({ Adapter: InMemoryAdapter });
    const repository = new Repository({ models: [TestModel], datastore });

    let error = null;
    await repository.models.TestModel.getById('INVALID ID').catch(e => {
      error = e;
    });
    assert.isNotNull(error);
  });

  it('should allow constructor options', () => {
    class TestModel extends Model {
      static schema() {
        return { name: 'string' };
      }
    }

    const x = new TestModel({ name: 'Joseph' });
    assert.equal(x.name, 'Joseph');
  });

  describe('Validation', () => {
    it('should validate a new model instance with validator', async () => {
      let called = false;
      class TestModel extends Model {
        static schema() {
          return {
            name: {
              type: 'string',
              validator: value => {
                called = true;
                if (value !== 'Joseph') throw new Error('Bad Data');
              },
            },
          };
        }
      }

      // eslint-disable-next-line no-new
      new TestModel({ name: 'Joseph' });
      assert.equal(called, true);

      assert.throws(() => new TestModel({ name: 'Frank' }));
    });

    it('should raise an error when validator criteria not met', async () => {
      let called = false;
      class TestModel extends Model {
        static schema() {
          return {
            name: {
              type: 'string',
              validator: value => {
                called = true;
                if (value !== 'Joseph') throw new Error('Bad Data');
              },
            },
          };
        }
      }

      assert.throws(() => new TestModel({ name: 'Frank' }));
      assert.equal(called, true);
    });

    // TODO:
    // it('should support async functions as validators', async () => {
    //   let called = false;
    //   const sleep = duration =>
    //     new Promise(resolve => setTimeout(resolve, duration));

    //   class TestModel extends Model {
    //     static schema() {
    //       return {
    //         name: {
    //           type: 'string',
    //           validator: async value => {
    //             called = true;
    //             await sleep(10);
    //             if (value !== 'Joseph') throw new Error('Bad Data');
    //           },
    //         },
    //       };
    //     }
    //   }

    //   assert.throws(() => new TestModel({ name: 'Frank' }));
    //   assert.equal(called, true);
    // });

    it('should validate a model with validator when its parameteres change', async () => {
      let called = false;
      class TestModel extends Model {
        static schema() {
          return {
            name: {
              type: 'string',
              validator: value => {
                called = true;
                if (value !== 'Joseph') throw new Error('Bad Data');
              },
            },
          };
        }
      }

      // eslint-disable-next-line no-new
      const testModel = new TestModel({ name: 'Joseph' });
      assert.equal(called, true);

      assert.throws(() => {
        testModel.name = 'Frank';
      });
    });
  });

  //   it('should validate a model to all depths', done => {
  //     const modelId = H.uniqueId('model');
  //     const called = false;
  //     const TestMdl = frontier.model(modelId, {
  //       person: {
  //         name: {
  //           type: 'string',
  //           validator: value => {
  //             if (typeof value !== 'string') {
  //               throw new Error('bad data');
  //             } else {
  //               called = true;
  //             }
  //           },
  //         },
  //       },
  //     });

  //     const x = new TestMdl({ person: { name: 'Joseph' } });
  //     frontier.validate(x, err => {
  //       assert.isNull(err);
  //       assert.equal(called, true);
  //       done();
  //     });
  //   });

  //   // null subdocs without a validator should pass through unharmed
  //   it('should validate a model to all depths unless null subdocs have no validator', done => {
  //     const modelId = H.uniqueId('model');
  //     const TestMdl = frontier.model(modelId, {
  //       person: {
  //         notes: { type: 'string' },
  //         info: {
  //           name: {
  //             type: 'string',
  //           },
  //         },
  //       },
  //     });
  //     // leaving off the person.info.name bit should be ok in this case
  //     const x = new TestMdl({ person: { notes: 'goes by joe' } });
  //     frontier.validate(x, err => {
  //       assert.isNull(err);
  //       done();
  //     });
  //   });

  //   // A model instance may have a null subdoc that needs to be validated
  //   it('should validate a model to all depths and handle null subdocs', done => {
  //     const modelId = H.uniqueId('model');
  //     const called = false;
  //     const TestMdl = frontier.model(modelId, {
  //       person: {
  //         notes: { type: 'string' },
  //         info: {
  //           name: {
  //             type: 'string',
  //             validator: value => {
  //               if (typeof value !== 'string') {
  //                 called = true;
  //                 throw new Error('bad data');
  //               }
  //             },
  //           },
  //         },
  //       },
  //     });
  //     // leaving off the name field is not ok here because info is null
  //     const x = new TestMdl({ person: { notes: 'goes by joe' } });
  //     frontier.validate(x, err => {
  //       assert.isNotNull(err);
  //       assert.equal(called, true);
  //       done();
  //     });
  //   });
});
