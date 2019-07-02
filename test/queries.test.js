const { assert } = require('chai');
const Frontier = require('../src');
const Model = require('../src/Model');
const Datastore = require('../src/Datastore');
const InMemoryAdapter = require('../src/adapters/InMemoryAdapter');

describe('Model Queries', async () => {
  beforeEach(async () => {
    class User extends Model {
      static schema() {
        return {
          name: 'string',
          address: {
            number: 'number',
            street: 'string',
            city: 'string',
            country: 'string',
            location: { lat: 'number', long: 'number' },
          },
          emails: ['string'],
        };
      }
    }

    class Post extends Model {
      static schema() {
        return {
          creator: { ref: User },
          message: 'string',
        };
      }
    }

    class Board extends Model {
      static schema() {
        return {
          name: 'string',
          creator: { ref: User },
          posts: [{ ref: Post }],
        };
      }
    }

    const defaultStore = new Datastore({ Adapter: InMemoryAdapter });
    await defaultStore.flush();
    this.frontier = new Frontier({
      models: [User, Post, Board],
      options: { defaultStore },
    });
    await this.frontier.ensureIndices();
    const repository = this.frontier.defaultRepository;

    const user1 = new User(
      {
        name: 'Sarah',
        address: {
          number: 123,
          street: 'Cuba St',
          city: 'Wellington',
          country: 'NZ',
          location: { lat: 1, long: 1 },
        },
        emails: ['sarah@work.com'],
      },
      { repository }
    );
    const user2 = new User(
      {
        name: 'Joe',
        address: {
          number: 456,
          street: '7th Ave',
          city: 'New York',
          country: 'USA',
          location: { lat: 2, long: 2 },
        },
        emails: ['joe@home.com'],
      },
      { repository }
    );
    const user3 = new User(
      {
        name: 'Hamish',
        address: {
          street: 'Oxford St',
          city: 'London',
          country: 'UK',
          location: { lat: 3, long: 3 },
        },
        emails: ['hamish@thegym.com'],
      },
      { repository }
    );

    const post1 = new Post(
      {
        creator: user1,
        message: "Sarah's First Post",
      },
      { repository }
    );
    const post2 = new Post(
      {
        creator: user1,
        message: "Sarah's Second Post",
      },
      { repository }
    );
    const post3 = new Post(
      {
        creator: user2,
        message: "Joe's First Post",
      },
      { repository }
    );
    const post4 = new Post(
      {
        creator: user3,
        message: "Hamish's First Post",
      },
      { repository }
    );
    const board = new Board(
      {
        name: 'Message Board 1',
        creator: user1,
        posts: [post1, post2, post4],
      },
      { repository }
    );

    await Promise.all(
      [user1, user2, user3, post1, post2, post3, post4, board].map(m =>
        m.save()
      )
    );
  });

  it('should perform type query with no params', async () => {
    const {
      models: { User, Board },
    } = this.frontier.defaultRepository;
    const users = await User.find();
    assert.equal(users.length, 3);

    const boards = await Board.find();
    assert.equal(boards.length, 1);
  });

  it('should support basic queries', async () => {
    const {
      models: { User },
    } = this.frontier.defaultRepository;
    const results = await User.find({ name: 'Hamish' });
    assert.equal(results.length, 1);

    const noResults = await User.find({ name: 'Daniel' });
    assert.equal(noResults.length, 0);
  });

  it('should support nested queries', async () => {
    const {
      models: { User },
    } = this.frontier.defaultRepository;
    const results = await User.find({ address: { country: 'NZ' } });
    assert.equal(results.length, 1);
    assert.equal(results[0].name, 'Sarah');

    const noResults = await User.find({ address: { country: 'AUS' } });
    assert.equal(noResults.length, 0);
  });

  it('should support queries with multiple where clauses', async () => {
    const {
      models: { User },
    } = this.frontier.defaultRepository;

    const results = await User.find({
      name: 'Sarah',
      address: { country: 'NZ', city: 'Wellington' },
    });
    assert.equal(results.length, 1);
    assert.equal(results[0].name, 'Sarah');

    const noResults1 = await User.find({
      name: 'Joe',
      address: { country: 'NZ', city: 'Wellington' },
    });
    assert.equal(noResults1.length, 0);

    const noResults2 = await User.find({
      address: { country: 'NZ', city: 'London' },
    });
    assert.equal(noResults2.length, 0);
  });

  it('should support deeply nested queries', async () => {
    const {
      models: { User },
    } = this.frontier.defaultRepository;

    const results = await User.find({
      address: { location: { lat: 2, long: 2 } },
    });
    assert.equal(results.length, 1);
    assert.equal(results[0].name, 'Joe');

    const noResults = await User.find({
      address: { location: { lat: -1, long: -1 } },
    });
    assert.equal(noResults.length, 0);
  });

  it('should support $CONTAINS queries', async () => {
    const {
      models: { User },
    } = this.frontier.defaultRepository;

    const results = await User.find({
      emails: { $contains: 'joe@home.com' },
    });
    assert.equal(results.length, 1);
    assert.equal(results[0].name, 'Joe');

    const noResults1 = await User.find({
      name: 'Tom',
      emails: { $contains: 'joe@home.com' },
    });
    assert.equal(noResults1.length, 0);

    const noResults2 = await User.find({
      emails: { $contains: 'joe@work.com' },
    });
    assert.equal(noResults2.length, 0);
  });

  it('should support $CONTAINS queries with models', async () => {
    const {
      models: { User, Post, Board },
    } = this.frontier.defaultRepository;

    const hamish = await User.findOne({ name: 'Hamish' });
    const hamishPost = await Post.findOne({ creator: hamish });
    const results1 = await Board.find({
      posts: { $contains: hamishPost },
    });
    assert.equal(results1.length, 1);
    assert.equal(results1[0].name, 'Message Board 1');

    const sarah = await User.findOne({ name: 'Sarah' });
    const sarahPost = await Post.findOne({ creator: sarah });
    const results2 = await Board.find({
      posts: { $contains: sarahPost },
    });
    assert.equal(results2.length, 1);
    assert.equal(results2[0].name, 'Message Board 1');

    const joe = await User.findOne({ name: 'Joe' });
    const joePost = await Post.findOne({ creator: joe });
    const noResults = await Board.find({ posts: { $contains: joePost } });
    assert.equal(noResults.length, 0);
  });

  it('should support $LIKE queries', async () => {
    const {
      models: { User },
    } = this.frontier.defaultRepository;

    const test1 = await User.find({
      name: { $like: 'JOE' },
    });
    assert.equal(test1.length, 1);
    assert.equal(test1[0].name, 'Joe');

    const test2 = await User.find({
      name: { $like: 'sarah' },
    });
    assert.equal(test2.length, 1);
    assert.equal(test2[0].name, 'Sarah');

    const test3 = await User.find({
      name: { $like: '%mish' },
    });
    assert.equal(test3.length, 1);
    assert.equal(test3[0].name, 'Hamish');

    const test4 = await User.find({
      name: { $like: '%a%' },
    });
    assert.equal(test4.length, 2);

    const noResults = await User.find({
      name: { $like: '%q%' },
    });
    assert.equal(noResults.length, 0);
  });

  it('should support $CONTAINS and $LIKE queries together', async () => {
    const {
      models: { User },
    } = this.frontier.defaultRepository;

    const test1 = await User.find({
      emails: { $contains: { $like: '%@home.com' } },
    });
    assert.equal(test1.length, 1);
    assert.equal(test1[0].name, 'Joe');

    const test2 = await User.find({
      emails: { $contains: { $like: 'sarah%' } },
    });
    assert.equal(test2.length, 1);
    assert.equal(test2[0].name, 'Sarah');

    const noResults = await User.find({
      name: 'Sarah',
      emails: { $contains: { $like: '%@home.com' } },
    });
    assert.equal(noResults.length, 0);
  });

  it('should support $EXISTS and $MISSING queries', async () => {
    const {
      models: { User },
    } = this.frontier.defaultRepository;

    const test1 = await User.find({
      address: {
        number: { $missing: true },
      },
    });
    assert.equal(test1.length, 1);
    assert.equal(test1[0].name, 'Hamish');

    const test2 = await User.find({
      address: {
        number: { $exists: true },
      },
    });
    assert.equal(test2.length, 2);

    const noResult = await User.find({
      address: {
        number: { $exists: true, $missing: true },
      },
    });
    assert.equal(noResult.length, 0);
  });

  it('should support $OR queries', async () => {
    const {
      models: { User },
    } = this.frontier.defaultRepository;

    const test1 = await User.find({
      address: {
        $or: {
          city: 'London',
          country: 'NZ',
        },
      },
    });
    assert.equal(test1.length, 2);
    assert.isOk(test1.find(u => u.name === 'Sarah'));

    const test2 = await User.find({
      address: {
        $or: [{ country: 'UK' }, { country: 'NZ' }],
      },
    });
    assert.equal(test2.length, 2);
    assert.isOk(test2.find(u => u.name === 'Hamish'));
  });

  it('should support $NOT queries', async () => {
    const {
      models: { User },
    } = this.frontier.defaultRepository;

    const test1 = await User.find({
      address: {
        $not: {
          city: 'London',
          country: 'NZ',
        },
      },
    });
    assert.equal(test1.length, 1);
    assert.equal(test1[0].name, 'Joe');

    const test2 = await User.find({
      address: {
        $not: [{ country: 'UK' }, { country: 'NZ' }],
      },
    });
    assert.equal(test2.length, 1);
    assert.equal(test2[0].name, 'Joe');
  });

  it('should support model ref queries', async () => {
    const {
      models: { User, Post },
    } = this.frontier.defaultRepository;

    const [creator] = await User.find({ name: 'Sarah' });
    const test1 = await Post.find({ creator });
    assert.equal(test1.length, 2);

    const test2 = await Post.find({
      creator,
      message: "Sarah's First Post",
    });
    assert.equal(test2.length, 1);
  });

  // it('should support graph queries', async () => {
  //   const {
  //     models: { Post },
  //   } = this.frontier.defaultRepository;

  //   const results = await Post.find({
  //     user: { name: 'Sarah' },
  //   });
  //   assert.equal(results.length, 1);
  //   assert.equal(results[0].message, "Sarah's First Post");

  //   const noResults = await Post.find({
  //     user: { name: 'David' },
  //   });
  //   assert.equal(noResults.length, 0);
  // });
});
