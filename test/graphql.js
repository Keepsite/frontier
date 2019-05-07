const { assert } = require('chai');
const { graphql } = require('graphql');

const Frontier = require('../src');
const Model = require('../src/Model');

describe('GraphQL Schema Generator', () => {
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

  const models = [Account, User];
  const frontier = new Frontier({ models });
  frontier.defaultRepository.models.User.create({ id: 1, username: 'user1' });

  it('should generate valid basic graphql query schema', async () => {
    const schema = frontier.makeGraphQLSchema();
    const query = `{ User(id: 1 ) { username } }`;
    const { data, errors } = await graphql(schema, query);

    assert.isUndefined(errors);
    assert.include(data.User, { username: 'user1' });
  });
});
