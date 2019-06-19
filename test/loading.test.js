const { assert } = require('chai');
const Frontier = require('../src');
const Model = require('../src/Model');
const InMemoryAdapter = require('../src/adapters/InMemoryAdapter');
const Datastore = require('../src/Datastore');

describe('Model Nesting', () => {
  class LatLong extends Model {
    static schema() {
      return {
        lat: 'number',
        long: 'number',
      };
    }
  }

  class Address extends Model {
    static schema() {
      return {
        number: 'number',
        street: 'string',
        suburb: 'string',
        postcode: 'string',
        city: 'string',
        country: 'string',
        location: { ref: LatLong },
      };
    }
  }

  class Email extends Model {
    static schema() {
      return {
        address: 'string',
        verified: { type: 'boolean', default: false },
      };
    }
  }

  class User extends Model {
    static schema() {
      return {
        username: 'string',
        emails: [{ ref: Email }],
        address: { ref: Address },
      };
    }
  }

  class Org extends Model {
    static schema() {
      return {
        name: 'string',
        address: { ref: Address },
        users: [{ ref: User }],
      };
    }
  }

  const defaultStore = new Datastore({ Adapter: InMemoryAdapter });
  const {
    defaultRepository: { models },
  } = new Frontier({
    models: [LatLong, Address, Email, User, Org],
    options: { defaultStore },
  });

  before(async () => {
    this.user1 = await models.User.create({
      username: 'user1',
      emails: [
        await models.Email.create({ address: 'user1@home.com' }),
        await models.Email.create({ address: 'user1@work.com' }),
      ],
      address: await models.Address.create({
        number: 123,
        street: '4th Ave',
        suburb: 'Plesantdale',
        postcode: '12182',
        city: 'Troy',
        country: 'USA',
        location: await models.LatLong.create({
          lat: '42.7836585',
          long: '-73.6704688',
        }),
      }),
    });
    this.user2 = await models.User.create({
      username: 'user2',
      emails: [await models.Email.create({ address: 'user2@home.com' })],
      address: await models.Address.create({
        number: 456,
        street: '7th Ave',
        suburb: 'Midtown',
        postcode: '10123',
        city: 'New York',
        country: 'USA',
        location: await models.LatLong.create({
          lat: '40.7515612',
          long: '-73.9905121',
        }),
      }),
    });
    this.org = await models.Org.create({
      name: 'ABC',
      address: await models.Address.create({
        number: 456,
        street: '7th Ave',
        suburb: 'Midtown',
        postcode: '10123',
        city: 'New York',
        country: 'USA',
        location: await models.LatLong.create({
          lat: '40.7515612',
          long: '-73.9905121',
        }),
      }),
      users: [this.user1, this.user2],
    });
  });

  it('should load model single ref', async () => {
    const user = await models.User.getById(this.user1.id());
    assert.isFalse(user.address.loaded());
    assert.isUndefined(user.address.number);
    assert.isUndefined(user.address.street);
    await user.load('address');
    assert.isTrue(user.address.loaded());
    assert.equal(user.address.number, 123);
    assert.equal(user.address.street, '4th Ave');
  });

  it('should load model ref on Model.getById', async () => {
    const org = await models.Org.getById(this.org.id(), {
      load: 'address',
    });
    assert.isTrue(org.address.loaded());
    assert.equal(org.address.number, 456);
    assert.equal(org.address.street, '7th Ave');
  });

  it('should load model ref on Model.find', async () => {
    const [org] = await models.Org.find(
      { name: 'ABC' },
      { load: ['address', 'users[*]'] }
    );
    assert.isTrue(org.address.loaded());
    org.users.forEach(u => assert.isTrue(u.loaded()));
    assert.equal(org.address.number, 456);
    assert.equal(org.address.street, '7th Ave');
  });

  it('should load multiple model refs', async () => {
    const user = await models.User.getById(this.user1.id());
    assert.isFalse(user.address.loaded());
    assert.isUndefined(user.address.number);
    assert.isFalse(user.emails[0].loaded());
    assert.isFalse(user.emails[1].loaded());
    assert.isUndefined(user.emails[0].address);
    assert.isUndefined(user.emails[1].address);
    await user.load(['address', 'emails[*]']);
    assert.isTrue(user.address.loaded());
    assert.equal(user.address.number, 123);
    assert.isTrue(user.emails[0].loaded());
    assert.isTrue(user.emails[1].loaded());
    assert.equal(user.emails[0].address, 'user1@home.com');
    assert.equal(user.emails[1].address, 'user1@work.com');
  });

  it('should load nested child models', async () => {
    const user = await models.User.getById(this.user1.id());
    assert.isFalse(user.address.loaded());
    assert.isUndefined(user.address.location);
    await user.load('address.location');
    assert.isTrue(user.address.loaded());
    assert.isTrue(user.address.location.loaded());
    assert.equal(user.address.location.lat, 42.7836585);
  });

  it("should load all array refs with wildcard '*'", async () => {
    const user = await models.User.getById(this.user1.id());
    assert.isFalse(user.emails[0].loaded());
    assert.isUndefined(user.emails[0].address);
    await user.load('emails[*]');
    assert.isTrue(user.emails[0].loaded());
    assert.equal(user.emails[0].address, 'user1@home.com');
  });

  it('should load array refs with children', async () => {
    const org = await models.Org.getById(this.org.id());
    assert.isFalse(org.users[0].loaded());
    assert.isUndefined(org.users[0].address);
    await org.load('users[*].address');
    assert.isTrue(org.users[0].loaded());
    assert.equal(org.users[0].address.number, 123);
  });

  it('should load array refs with nested children', async () => {
    const org = await models.Org.getById(this.org.id());
    assert.isFalse(org.users[0].loaded());
    assert.isUndefined(org.users[0].address);
    await org.load('users[*].address.location');
    assert.isTrue(org.users[0].loaded());
    assert.equal(org.users[0].address.number, 123);
    assert.equal(org.users[0].address.location.lat, '42.7836585');
  });

  it('should load multiple model refs with nested children', async () => {
    const org = await models.Org.getById(this.org.id());
    assert.isFalse(org.users[0].loaded());
    assert.isUndefined(org.users[0].address);
    assert.isFalse(org.address.loaded());
    assert.isUndefined(org.address.location);
    await org.load(['users[*].address.location', 'address.location']);
    assert.isTrue(org.users[0].loaded());
    assert.equal(org.users[0].address.number, 123);
    assert.equal(org.users[0].address.location.lat, '42.7836585');
    assert.equal(org.address.location.lat, '40.7515612');
  });

  it('should load array refs with nested array refs', async () => {
    const org = await models.Org.getById(this.org.id());
    assert.isFalse(org.users[0].loaded());
    assert.isUndefined(org.users[0].address);
    await org.load('users[*].emails[*]');
    assert.isTrue(org.users[0].loaded());
    assert.equal(org.users[0].emails[0].address, 'user1@home.com');
    assert.equal(org.users[0].emails[1].address, 'user1@work.com');
  });
});
