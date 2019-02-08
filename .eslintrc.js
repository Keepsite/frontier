module.exports = {
  "env": {
    "node": true,
    "mocha": true
  },
  "rules": {
    "no-param-reassign": 0,
    "no-underscore-dangle": 0,
  },
  extends: [
    'eslint:recommended',
    'airbnb/base',
    'prettier',
  ],
}
