# Frontier

### Features

- Pass through cache (Dataloader)
- Bulk Actions (for CouchbaseAdapter)
- Model Metadata (for meta.demoId)
- Generate GraphQL types and default resolvers
- Chainable API (Maybe)
- Model Version Migrations
- Fake Generator for Models `Model.Fake({ args })`
  <br/><br/>

### Possible Features

- Adapter Performance Testing
- Model Network Diagram (GraphQLVoyager)
- Data Navigator Network Diagram
  - [cytoscape](http://js.cytoscape.org/)
  - [visjs](http://visjs.org/network_examples.html)
  - [Other JS Modeling Libraries](https://modeling-languages.com/javascript-drawing-libraries-diagrams/)
- On demand graph loading with proxies
  - [similar to](https://github.com/eiriklv/json-populate/blob/master/populate-by-reference.js)
- Improved validation onLoad and onSave using https://github.com/chriso/validator.js
- TypeScript support
- [typescript class properties validator](https://github.com/typestack/class-validator)
- Realtime data listeners
  - could use DCP for couchbase similar to https://github.com/couchbaselabs/python-dcp-client
  - https://stackoverflow.com/questions/26262194/monitoring-a-couchbase-bucket-with-libevent?rq=1
