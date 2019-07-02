const { assert } = require('chai');
const { performance } = require('perf_hooks');
const ottoman = require('ottoman');

const Model = require('../src/Model');
const Interface = require('../src/Interface');

function classPerformanceBaseline() {
  class F {
    constructor(value) {
      this.value = value;
    }
  }
  class E {
    constructor(data) {
      const schema = this.constructor.schema();
      this.value = this.getValue({ schema, data });
    }

    getValue({ schema, data }) {
      Object.entries(schema).forEach(([key, value]) => {
        if (data[key].constructor.name === value) {
          this[key] = new F(data[key]);
        } else {
          throw new TypeError('Invalid Field Type');
        }
      });
      // Object.assign(this, data);
    }
  }
  class C extends E {
    static schema() {
      return {
        string: 'String',
        integer: 'Number',
        boolean: 'Boolean',
        object: 'Object',
      };
    }
  }
  const start = performance.now();
  [...Array(1000)].forEach((_, i) => {
    return new C({
      string: '',
      integer: i,
      boolean: false,
      object: { a: 1, b: 2 },
    });
  });
  const finish = performance.now();
  return finish - start;
}

function ottomanPerformanceBaseline() {
  const Email = ottoman.model('Email', {
    address: 'string',
    verified: 'boolean',
  });

  const Record1 = ottoman.model('Record1', {
    name: 'string',
    value: 'string',
  });

  const Record2 = ottoman.model('Record2', {
    name: 'string',
    value: 'string',
    checked: 'boolean',
  });

  const User = ottoman.model('User', {
    name: 'string',
    number: 'integer',
    archived: 'boolean',
    email: { ref: 'Email' },
    records: [{ ref: 'Mixed' }],
  });

  const start = performance.now();
  [...Array(1000)].forEach((_, i) => {
    return new User({
      name: `User ${i}`,
      number: i,
      archived: false,
      email: new Email({ address: 'me@home.com', verified: false }),
      records: [
        new Record1({ name: 'record1', value: `record${i}.1 value` }),
        new Record2({
          name: 'record2',
          value: `record${i}.2 value`,
          checked: true,
        }),
      ],
    });
  });
  const finish = performance.now();
  return finish - start;
}

describe('Performance', () => {
  class Account extends Model {
    static schema() {
      return {
        email: 'string',
        name: 'string',
      };
    }
  }

  class User extends Model {
    static schema() {
      return {
        username: 'string',
        account: { ref: Account },
      };
    }
  }

  class Record extends Interface {
    static schema() {
      return {
        name: 'string',
        number: 'integer',
      };
    }
  }

  class Document extends Record {
    static schema() {
      return {
        name: 'string',
        number: 'integer',
        url: 'string',
      };
    }
  }

  class MultiAccountUser extends Model {
    static schema() {
      return {
        username: 'string',
        accounts: [{ ref: Account }],
        documents: [{ ref: Document }],
      };
    }
  }

  const classBaseline = classPerformanceBaseline();
  const ottomanBaseline = ottomanPerformanceBaseline();

  it('should create 1000 simple models in less time than baselines (ms)', () => {
    const start = performance.now();
    [...Array(1000)].forEach((_, i) => {
      return new Account({ email: `${i}@domain.com`, name: `User_${i}` });
    });
    const finish = performance.now();
    const duration = finish - start;
    assert.isBelow(duration, classBaseline * 15);
    assert.isBelow(duration, ottomanBaseline);
  });

  it('should create 1000 models with child model in less time than baselines (ms)', () => {
    const start = performance.now();
    [...Array(1000)].forEach((_, i) => {
      return new User({
        username: `User_${i}`,
        account: new Account({ email: `${i}@domain.com`, name: `User_${i}` }),
      });
    });
    const finish = performance.now();
    const duration = finish - start;
    assert.isBelow(duration, classBaseline * 15);
    assert.isBelow(duration, ottomanBaseline);
  });

  it('should create 1000 models with model list fields in less time than baselines (ms)', () => {
    const start = performance.now();
    [...Array(1000)].forEach((_, i) => {
      return new MultiAccountUser({
        username: `User_${i}`,
        accounts: [
          new Account({ email: `${i}@domain.com`, name: `User_${i}.1` }),
          new Account({ email: `${i}@domain.com`, name: `User_${i}.2` }),
        ],
      });
    });
    const finish = performance.now();
    const duration = finish - start;
    assert.isBelow(duration, classBaseline * 15);
    assert.isBelow(duration, ottomanBaseline);
  });

  it('should create 1000 interface models with model list fields in less time than baslines (ms)', () => {
    const start = performance.now();
    [...Array(1000)].forEach((_, i) => {
      return new MultiAccountUser({
        username: `User_${i}`,
        documents: [
          new Document({
            name: `document_${i}_1`,
            number: i + 1000,
            url: `https://cloud.storage.com/${i}_1`,
          }),
          new Document({
            name: `document_${i}_2`,
            number: i + 2000,
            url: `https://cloud.storage.com/${i}_2`,
          }),
          new Document({
            name: `document_${i}_3`,
            number: i + 3000,
            url: `https://cloud.storage.com/${i}_3`,
          }),
        ],
      });
    });
    const finish = performance.now();
    const duration = finish - start;
    assert.isBelow(duration, classBaseline * 15);
    assert.isBelow(duration, ottomanBaseline);
  });
});
