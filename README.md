<div align="center">
  <br>
  <img src="docs/logo.png" width="256", height="256" alt="Frontier">
  <br>
  <br>
</div>

# Frontier

> Simple Node.js ODM inspired by Mongoose and Ottoman but database agnostic

## Overview

Frontier is a simple, somewhat opinionated, Mongoose/Ottoman-inspired ODM.

```js
const Frontier = require('frontier');
const Adapter = require('frontier/adapters/InMemoryAdapter');

class Address extends Frontier.Model {
  static schema() {
    return {
      number: 'number',
      street: 'string',
      suburb: 'string',
      city: 'string',
      country: 'string',
    };
  }
}

class User extends Frontier.Model {
  static schema() {
    return {
      email: 'string',
      name: 'string',
      address: { type: Address },
    };
  }
}

const frontier = new Frontier({ models: [Address, User] });
const store = new Frontier.Datastore({ Adapter });
const repo = frontier.createRepository(store);

(async () => {
  const user = new repo.models.User({
    name: 'James Bond',
    email: '007@mi6.gov.uk',
    address: new repo.models.Address({
      number: 85,
      street: 'Albert Embankment',
      suburb: 'Vauxhall',
      city: 'London',
      country: 'UK',
    }),
  });
  await user.save();
  const dbUser = await repo.models.User.find({ address: { city: 'London' } });
  console.log({ user, dbUser });
})();
```

### Features

- ES6 Classes for Models
- ES6 Async/Await support
- Pass through cache for repositories (Dataloader)
- Model Metadata (e.g. meta.demoId)
  <br/><br/>

### Possible Features

- Chainable API
- Model Version Migrations
- Generate GraphQL types and default resolvers
- Fake Generator for Models `Model.Fake({ args })`
- Adapter Performance Testing
- Model Network Diagram (GraphQLVoyager)
- Data Navigator Network Diagram
  - [cytoscape](http://js.cytoscape.org/)
  - [visjs](http://visjs.org/network_examples.html)
  - [Other JS Diagram Libraries](https://modeling-languages.com/javascript-drawing-libraries-diagrams/)
- On demand graph loading with proxies
  - [similar to](https://github.com/eiriklv/json-populate/blob/master/populate-by-reference.js)
- Improved validation onLoad and onSave using https://github.com/chriso/validator.js
- TypeScript support
- [typescript class properties validator](https://github.com/typestack/class-validator)
- Realtime data listeners
  - could use DCP for couchbase similar to https://github.com/couchbaselabs/python-dcp-client
  - https://stackoverflow.com/questions/26262194/monitoring-a-couchbase-bucket-with-libevent?rq=1

## Credits

API interface inspired by [Ottoman](http://ottomanjs.com/).
Icon made by <a href="https://www.flaticon.com/authors/those-icons" title="Those Icons">Those Icons</a> from <a href="https://www.flaticon.com/" title="Flaticon">www.flaticon.com</a> is licensed by <a href="http://creativecommons.org/licenses/by/3.0/" title="Creative Commons BY 3.0" target="_blank">CC 3.0 BY</a>
