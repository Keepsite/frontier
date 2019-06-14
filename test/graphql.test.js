/* eslint-disable no-use-before-define  */
const { assert } = require('chai');
const { graphql } = require('graphql');
const {
  GraphQLBoolean,
  GraphQLID,
  GraphQLInt,
  GraphQLFloat,
  GraphQLList,
  GraphQLString,
  GraphQLObjectType,
  GraphQLSchema,
} = require('graphql');
const { GraphQLJSON } = require('graphql-type-json');

const Frontier = require('../src');
const Model = require('../src/Model');
const Interface = require('../src/Interface');

// This mocks graphql-tag allowing us to use babel-sublime gql`` syntax highlighting
const gql = ([query]) => query;

describe('GraphQL Types', () => {
  class Record extends Interface {
    static schema() {
      return {
        name: 'string',
      };
    }
  }

  class Account extends Record {
    static schema() {
      return {
        email: 'string',
        name: 'string',
      };
    }
  }

  class Address extends Model {
    static schema() {
      return {
        number: 'integer',
        street: 'string',
        suburb: 'string',
        city: 'string',
        country: 'string',
      };
    }
  }

  class User extends Record {
    static schema() {
      return {
        name: 'string',
        username: 'string',
        account: { ref: Account },
        address: { type: Address },
      };
    }

    static resolvers() {
      return {
        orgs: {
          type: new GraphQLList(Org.graphQLType()),
          resolve: (user, args, context) => {
            const { models } = context;
            return models.Org.find({ users: { $contains: user } });
          },
        },
      };
    }
  }

  class Org extends Record {
    static schema() {
      return {
        name: 'string',
        users: [{ ref: User }],
      };
    }
  }

  class Notification extends Model {
    static schema() {
      return {
        message: { type: 'string' },
        recipients: [
          {
            ref: 'Mixed',
            unionName: 'Recipients',
            typeRange: [Org, User],
          },
        ],
      };
    }
  }

  class Activity extends Model {
    static schema() {
      return {
        message: { type: 'string' },
        record: { ref: Record },
      };
    }
  }

  class Circular extends Model {
    static schema() {
      return {
        parent: { ref: Circular },
        parentThunk: { ref: () => Circular },
        nested: { type: Circular },
        nestedThunk: { type: () => Circular },
      };
    }
  }

  it('should generate graphql type from a basic Model', async () => {
    const gqlType = Account.graphQLType();

    assert.isOk(gqlType);
    assert.isTrue(gqlType instanceof GraphQLObjectType);
    const { id, email, name } = gqlType.getFields();

    assert.equal(id.type, GraphQLID);
    assert.equal(email.type, GraphQLString);
    assert.equal(name.type, GraphQLString);
  });

  it('should generate graphql type with multiple primitive types', async () => {
    class PrimitiveTypes extends Model {
      static schema() {
        return {
          str: 'string',
          num: 'number',
          int: 'integer',
          bool: 'boolean',
        };
      }
    }
    const gqlType = PrimitiveTypes.graphQLType();

    assert.isOk(gqlType);
    assert.isTrue(gqlType instanceof GraphQLObjectType);
    const { id, str, num, int, bool } = gqlType.getFields();
    assert.equal(id.type, GraphQLID);
    assert.equal(str.type, GraphQLString);
    assert.equal(num.type, GraphQLFloat);
    assert.equal(int.type, GraphQLInt);
    assert.equal(bool.type, GraphQLBoolean);
  });

  it('should generate graphql type with Mixed field', async () => {
    class MixedType extends Model {
      static schema() {
        return {
          mixed: { type: 'Mixed' },
        };
      }
    }
    const gqlType = MixedType.graphQLType();

    assert.isOk(gqlType);
    assert.isTrue(gqlType instanceof GraphQLObjectType);
    const { id, mixed } = gqlType.getFields();

    assert.equal(id.type, GraphQLID);
    assert.equal(mixed.type, GraphQLJSON);
  });

  it('should generate graphql type with Object field', async () => {
    class MixedType extends Model {
      static schema() {
        return {
          object: {
            str: 'string',
            num: 'number',
            int: 'integer',
            bool: 'boolean',
          },
        };
      }
    }
    const gqlType = MixedType.graphQLType();

    assert.isOk(gqlType);
    assert.isTrue(gqlType instanceof GraphQLObjectType);
    const { id, object } = gqlType.getFields();

    assert.equal(id.type, GraphQLID);
    assert.equal(object.type, GraphQLJSON);
  });

  it('should generate graphql type with ModelRef field', async () => {
    const gqlType = User.graphQLType();

    assert.isOk(gqlType);
    assert.isTrue(gqlType instanceof GraphQLObjectType);
    const { id, username, account } = gqlType.getFields();

    assert.equal(id.type, GraphQLID);
    assert.equal(username.type, GraphQLString);
    assert.equal(String(account.type), String(Account.graphQLType()));
  });

  it('should generate graphql type with Nested Model field', async () => {
    const gqlType = User.graphQLType();

    assert.isOk(gqlType);
    assert.isTrue(gqlType instanceof GraphQLObjectType);
    const { id, username, address } = gqlType.getFields();

    assert.equal(id.type, GraphQLID);
    assert.equal(username.type, GraphQLString);
    assert.equal(String(address.type), String(Address.graphQLType()));
  });

  it('should generate graphql type with primitive Lists', async () => {
    class PrimitiveLists extends Model {
      static schema() {
        return {
          strList: ['string'],
          numList: ['number'],
          intList: ['integer'],
          boolList: ['boolean'],
        };
      }
    }

    const gqlType = PrimitiveLists.graphQLType();

    assert.isOk(gqlType);
    assert.isTrue(gqlType instanceof GraphQLObjectType);
    const { id, strList, numList, intList, boolList } = gqlType.getFields();

    assert.equal(id.type, GraphQLID);
    assert.equal(String(strList.type), String(GraphQLList(GraphQLString)));
    assert.equal(String(numList.type), String(GraphQLList(GraphQLFloat)));
    assert.equal(String(intList.type), String(GraphQLList(GraphQLInt)));
    assert.equal(String(boolList.type), String(GraphQLList(GraphQLBoolean)));
  });

  it('should generate graphql type with a ModelRef List', async () => {
    const gqlType = Org.graphQLType();

    assert.isOk(gqlType);
    assert.isTrue(gqlType instanceof GraphQLObjectType);
    const { id, name, users } = gqlType.getFields();

    assert.equal(id.type, GraphQLID);
    assert.equal(String(name.type), GraphQLString);
    assert.equal(String(users.type), String(GraphQLList(User.graphQLType())));
  });

  it('should generate graphql type with a circular ModelRefs', async () => {
    const gqlType = Circular.graphQLType();

    assert.isOk(gqlType);
    assert.isTrue(gqlType instanceof GraphQLObjectType);
    const { id, parent, nested } = gqlType.getFields();

    assert.equal(id.type, GraphQLID);
    assert.equal(String(parent.type), String(Circular.graphQLType()));
    assert.equal(String(nested.type), String(Circular.graphQLType()));
  });

  it('should support basic types for basic graphql schema', async () => {
    const schema = new GraphQLSchema({
      query: new GraphQLObjectType({
        name: 'Query',
        fields: {
          user: {
            type: User.graphQLType(),
            args: { id: { type: GraphQLID } },
            resolve: (parent, { id }, context = {}) => {
              const {
                models: { User: RepositoryUser },
              } = context;
              return RepositoryUser.getById(id);
            },
          },
        },
      }),
    });
    const frontier = new Frontier({ models: [Account, User, Org] });
    const { models } = frontier.defaultRepository;
    await models.User.create({ id: 1, username: 'user1' });

    const query = gql`
      {
        user(id: 1) {
          username
        }
      }
    `;
    const context = { models };
    const { data, errors } = await graphql(schema, query, {}, context);

    assert.isUndefined(errors);
    assert.include(data.user, { username: 'user1' });
  });

  it('should support ModelRef types for graphql schema', async () => {
    const schema = new GraphQLSchema({
      query: new GraphQLObjectType({
        name: 'Query',
        fields: {
          user: {
            type: User.graphQLType(),
            args: { id: { type: GraphQLID } },
            resolve: (parent, { id }, { models }) => models.User.getById(id),
          },
        },
      }),
    });
    const frontier = new Frontier({ models: [Account, User, Org] });
    const { models } = frontier.defaultRepository;
    const account = await models.Account.create({
      id: 1,
      email: 'me@home.com',
      name: 'Work',
    });
    await models.User.create({ id: 2, username: 'user1', account });
    const query = gql`
      {
        user(id: 2) {
          id
          username
          account {
            email
            name
          }
        }
      }
    `;
    const context = { models };
    const { data, errors } = await graphql(schema, query, {}, context);

    assert.isUndefined(errors);
    assert.include(data.user, { id: '2' });
    assert.include(data.user, { username: 'user1' });
    assert.include(data.user.account, { email: 'me@home.com' });
  });

  it('should support Nested Model types for graphql schema', async () => {
    const schema = new GraphQLSchema({
      query: new GraphQLObjectType({
        name: 'Query',
        fields: {
          user: {
            type: User.graphQLType(),
            args: { id: { type: GraphQLID } },
            resolve: (parent, { id }, { models }) => models.User.getById(id),
          },
        },
      }),
    });
    const frontier = new Frontier({ models: [Address, User, Org] });
    const { models } = frontier.defaultRepository;
    const address = await models.Address.create({
      number: 123,
      street: 'Forth St',
      city: 'New York',
      country: 'USA',
    });
    await models.User.create({ id: 1, username: 'user1', address });
    const query = gql`
      {
        user(id: 1) {
          id
          username
          address {
            number
            street
            city
            country
          }
        }
      }
    `;
    const context = { models };
    const { data, errors } = await graphql(schema, query, {}, context);

    assert.isUndefined(errors);
    assert.include(data.user, { id: '1' });
    assert.include(data.user, { username: 'user1' });
    assert.include(data.user.address, { street: 'Forth St' });
  });

  it('should support Model List types for graphql schema', async () => {
    const schema = new GraphQLSchema({
      query: new GraphQLObjectType({
        name: 'Query',
        fields: {
          org: {
            type: Org.graphQLType(),
            args: { id: { type: GraphQLID } },
            resolve: (parent, { id }, { models }) => models.Org.getById(id),
          },
        },
      }),
    });

    const frontier = new Frontier({ models: [Account, User, Org] });
    const { models } = frontier.defaultRepository;
    const user1 = await models.User.create({ id: 1, username: 'user1' });
    const user2 = await models.User.create({ id: 2, username: 'user2' });
    await models.Org.create({ id: 3, name: 'org1', users: [user1, user2] });

    const query = gql`
      {
        org(id: 3) {
          id
          name
          users {
            id
            username
          }
        }
      }
    `;
    const context = { models };
    const { data, errors } = await graphql(schema, query, {}, context);

    assert.isUndefined(errors);
    assert.include(data.org, { id: '3' });
    assert.include(data.org, { name: 'org1' });
    assert.deepInclude(data.org.users, { id: '2', username: 'user2' });
  });

  it('should support additional resolvers', async () => {
    const schema = new GraphQLSchema({
      query: new GraphQLObjectType({
        name: 'Query',
        fields: {
          user: {
            type: User.graphQLType(),
            args: { id: { type: GraphQLID } },
            resolve: (parent, { id }, { models }) => models.User.getById(id),
          },
        },
      }),
    });

    const frontier = new Frontier({ models: [User, Org] });
    const { models } = frontier.defaultRepository;
    const user = await models.User.create({ id: 1, username: 'user1' });
    await models.Org.create({ id: 2, name: 'org1', users: [user] });
    await models.Org.create({ id: 3, name: 'org2', users: [user] });

    const query = gql`
      {
        user(id: 1) {
          id
          username
          orgs {
            id
            name
          }
        }
      }
    `;
    const context = { models };
    const { data, errors } = await graphql(schema, query, {}, context);

    assert.isUndefined(errors);
    assert.include(data.user, { id: '1' });
    assert.include(data.user, { username: 'user1' });
    assert.deepInclude(data.user.orgs, { id: '2', name: 'org1' });
    assert.deepInclude(data.user.orgs, { id: '3', name: 'org2' });
  });

  it('should support Union types for graphql schema', async () => {
    const schema = new GraphQLSchema({
      query: new GraphQLObjectType({
        name: 'Query',
        fields: {
          notification: {
            type: Notification.graphQLType(),
            args: { id: { type: GraphQLID } },
            resolve: (parent, { id }, { models }) =>
              models.Notification.getById(id),
          },
        },
      }),
    });

    const frontier = new Frontier({
      models: [Account, User, Org, Notification],
    });
    const { models } = frontier.defaultRepository;
    const user = await models.User.create({ id: 1, username: 'user1' });
    const org = await models.Org.create({
      id: 2,
      name: 'org1',
      users: [user],
    });
    await models.Notification.create({
      id: 3,
      message: 'test',
      recipients: [org, user],
    });

    const query = gql`
      {
        notification(id: 3) {
          id
          message
          recipients {
            ... on User {
              id
              username
            }
            ... on Org {
              id
              name
            }
          }
        }
      }
    `;
    const context = { models };
    const { data, errors } = await graphql(schema, query, {}, context);

    assert.isUndefined(errors);
    assert.include(data.notification, { id: '3' });
    assert.include(data.notification, { message: 'test' });
    assert.deepInclude(data.notification.recipients, {
      id: '1',
      username: 'user1',
    });
  });

  it('should support Interface types for graphql schema', async () => {
    const schema = new GraphQLSchema({
      query: new GraphQLObjectType({
        name: 'Query',
        fields: {
          activity: {
            type: Activity.graphQLType(),
            args: { id: { type: GraphQLID } },
            resolve: (parent, { id }, { models }) =>
              models.Activity.getById(id),
          },
          user: {
            type: User.graphQLType(),
            args: { id: { type: GraphQLID } },
            resolve: (parent, { id }, { models }) => models.User.getById(id),
          },
        },
      }),
    });

    const frontier = new Frontier({
      models: [Account, User, Org, Activity],
    });
    const { models } = frontier.defaultRepository;
    const user = await models.User.create({
      id: 1,
      username: 'user1',
      name: 'user1',
    });
    await models.Activity.create({
      id: 2,
      message: 'test',
      record: user,
    });

    const query = gql`
      {
        activity(id: 2) {
          id
          message
          record {
            id
            name
          }
        }
      }
    `;
    const context = { models };
    const { data, errors } = await graphql(schema, query, {}, context);

    assert.isUndefined(errors);
    assert.include(data.activity, { id: '2' });
    assert.include(data.activity, { message: 'test' });
    assert.include(data.activity.record, {
      id: '1',
      name: 'user1',
    });
  });
});
