const Frontier = require('../src/');

const User = require('./models/User');
const Email = require('./models/Email');

const frontier = new Frontier({ models: [User, Email] });
const {
  defaultRepository: { models },
} = frontier;

module.exports = Promise.resolve().then(async () => {
  const email = new models.Email({ address: 'me@home.com' });
  const user = new models.User({ name: 'user1', email });
  await email.save();
  await user.save();
  const persistedUser = await models.User.findOne({ name: user.name });
  console.log({ persistedUser });
});
