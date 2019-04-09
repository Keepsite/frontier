const { assert } = require('chai');
const Frontier = require('../src');
const Model = require('../src/Model');
const InMemoryAdapter = require('../src/adapters/InMemoryAdapter');
const Datastore = require('../src/Datastore');
const Repository = require('../src/Repository');

describe('Model References', () => {
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

  class MultiAccountUser extends Model {
    static schema() {
      return {
        username: 'string',
        accounts: [{ ref: Account }],
      };
    }
  }

  class MixedRefModel extends Model {
    static schema() {
      return {
        anyRef: { ref: 'Mixed' },
        anyRefEmbedded: { type: 'Mixed' },
      };
    }
  }

  const store = new Datastore({ Adapter: InMemoryAdapter });
  const repository = new Repository({
    models: [Account, User, MultiAccountUser, MixedRefModel],
    store,
  });

  it('should allow mixed references', () => {
    const frontier = new Frontier({ models: [MixedRefModel] });

    [...Array(10)].forEach((_, i) => {
      class M extends Model {
        static schema() {
          return {
            name: 'string',
          };
        }
      }

      Object.defineProperty(M, 'name', {
        value: `${M.name}${i}`,
      });

      frontier.addModel(M);

      const instance = new M({ name: 'Frank' });
      const mixer = new MixedRefModel({
        anyRef: instance,
        anyRefEmbedded: instance,
      });
      const frozen = mixer.toJSON();

      assert.typeOf(frozen.anyRefEmbedded, 'object');
      assert.equal(frozen.anyRefEmbedded.name, 'Frank');

      // Demonstrate that when we bring it back from coo, the reference is
      // intact, and doesn't throw an error related to unknown types.
      const thawed = frontier.fromJSON(frozen, MixedRefModel.name);
      assert.isOk(thawed.anyRef);

      // Naturally it will be an unloaded reference, but this proves that
      // the ref has a 'loaded' function, meaning it's actually a reference.
      assert.isFalse(thawed.anyRef.loaded());
    });
  });

  it('should disallow non-reference values in mixed references', () => {
    // Frank is a string not a reference.
    assert.throw(() => new MixedRefModel({ anyRef: 'Frank' }));
  });

  it("shouldn't require reference to be present", async () => {
    const notLinked = new User({ username: 'foo' });

    await notLinked.save({ repository });
    assert.isOk(notLinked.username);
  });

  it('should permit referencing two models together', async () => {
    const account = new Account({
      email: 'danlan@fakemail.com',
      name: 'Daniel Landers',
    });

    const user = new User({ username: 'danlan', account });

    await account.save({ repository });
    await user.save({ repository });

    const myUser = await User.findOne({ username: 'danlan' }, { repository });
    assert.isFalse(myUser.account.loaded());

    await myUser.load(['account'], { repository });
    assert.equal(myUser.account.email, 'danlan@fakemail.com');
  });

  it('should store reference objects for child model refs', async () => {
    const account = new Account({
      email: 'jb@fakemail.com',
      name: 'Jason Bourne',
    });
    await User.create({ id: 123, username: 'jb', account }, { repository });

    const user = await User.getById(123, { repository });
    assert.isOk(user);
    const jsonUser = user.toJSON();

    assert.equal(Object.keys(jsonUser.account).length, 2);
    assert.equal(jsonUser.account.$ref, account.id());
    assert.equal(jsonUser.account.$type, account.modelName);
  });

  it('should allow re-linking of models', async () => {
    const notLinked = new User({ username: 'relink' });
    await notLinked.save({ repository });
    assert.isOk(notLinked.username);

    const newLinkage = new Account({
      email: 'foo@bar.com',
      name: 'Foobar',
    });
    await newLinkage.save({ repository });

    notLinked.account = newLinkage;
    await notLinked.save({ repository });

    const relinked = await User.findOne({ username: 'relink' }, { repository });
    assert.isFalse(relinked.account.loaded());
    assert.isOk(relinked.account);

    await relinked.account.load();
    assert.equal(relinked.account.email, 'foo@bar.com');
  });

  it('should allow one-to-many linkages', async () => {
    const account1 = new Account({
      email: 'account1@fake.com',
      name: 'Account1',
    });

    const account2 = new Account({
      email: 'account2@fake.com',
      name: 'Account2',
    });

    const myUser = new MultiAccountUser(
      {
        username: 'multi-account',
        accounts: [account1, account2],
      },
      { repository }
    );

    await Promise.all(
      [account1, account2, myUser].map(model => model.save({ repository }))
    );
    const multiUser = await MultiAccountUser.findOne(
      {
        username: 'multi-account',
      },
      { repository }
    );

    assert.typeOf(multiUser.accounts, 'array');
    assert.equal(multiUser.accounts.length, 2);
    multiUser.accounts.forEach(a => assert.isFalse(a.loaded()));
    multiUser.accounts.forEach(a => assert.isUndefined(a.email));
  });
});
