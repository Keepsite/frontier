const { assert } = require('chai');
const Frontier = require('../src/');

const User = require('../example/models/User');
const Email = require('../example/models/Email');

describe('Example Code', () => {
  it('should run example code without error', async () => {
    const frontier = new Frontier({ models: [User, Email] });
    assert.isOk(frontier);
  });
});
