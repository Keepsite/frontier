// const { assert } = require('chai');
// const Frontier = require('../src');
// const Model = require('../src/Model');

// describe('Model Indices', async () => {
//   async function _indexTest(indexType) {
//     class TestModel extends Model {
//       static schema() {
//         return {
//           name: 'string',
//           company: 'string',
//         };
//       }

//       static indices() {
//         return {
//           findByName: {
//             type: indexType,
//             by: 'name',
//             // consistency: ottoman.Consistency.GLOBAL,
//           },
//           findByCompany: {
//             type: indexType,
//             by: 'company',
//             // consistency: ottoman.Consistency.GLOBAL,
//           },
//         };
//       }
//     }

//     const frontier = new Frontier({ models: [TestModel] });
//     await frontier.ensureIndices();

//     const x = new frontier.models.TestModel({
//       name: 'Daniel',
//       company: 'Keepsite',
//     });
//     const y = new frontier.models.TestModel({
//       name: 'George',
//       company: 'Google',
//     });

//     x.save();
//     y.save();

//     const results = await TestModel.findByName('Daniel');
//     assert.isArray(results);
//     assert.propertyVal(results, 'length', 1);
//     const obj = results[0];
//     assert.equal(obj._id, x._id);
//     assert.equal(obj.name, 'Daniel');
//     assert.equal(obj.company, 'Keepsite');

//     // Not pretty; but for n1ql indexes, this sometimes executes too fast
//     // before indices are in full ready state on the DB.  If n1ql tests
//     // in particular executes before indexes are ready, results come back
//     // empty [] and the test fails, which is a red herring.
//     // setTimeout(() => { /* Stuff */ }, 1000);
//   }

//   // it('should perform default string indexing successfully', async () => {
//   //   await _indexTest.call(this, undefined);
//   // });

//   // it('should perform view string indexing successfully', async () => {
//   //   await _indexTest.call(this, 'view');
//   // });

//   // it('should perform refdoc string indexing successfully', async () => {
//   //   await _indexTest.call(this, 'refdoc');
//   // });

//   // it('should perform n1ql string indexing successfully', async () => {
//   //   await _indexTest.call(this, 'n1ql');
//   // });

//   // if (ottoman.store instanceof ottoman.CbStoreAdapter) {
//   //   it('should create index on _type when indexing for n1ql', function(done) {
//   //     var couchbase = require('couchbase');

//   //     _indexTest.call(this, 'n1ql', function() {
//   //       // At this point, all GSI indexes should have been made, meaning there
//   //       // should be one on type.
//   //       var verifyQ =
//   //         'SELECT * FROM system:indexes WHERE ' +
//   //         "keyspace_id='" +
//   //         ottoman.bucket._name +
//   //         "' AND " +
//   //         "(ARRAY_CONTAINS(index_key, '`_type`') OR " +
//   //         "ARRAY_CONTAINS(index_key, '_type'))";

//   //       ottoman.bucket.query(couchbase.N1qlQuery.fromString(verifyQ), function(
//   //         err,
//   //         rows
//   //       ) {
//   //         if (err) {
//   //           return done(err);
//   //         }

//   //         // If we got anything back, then the appropriate index exists.
//   //         assert.isAtLeast(rows.length, 1);
//   //         done();
//   //       });
//   //     });
//   //   });
//   // }

//   // it('should fail to have two identical refdoc keys', function(done) {
//   //   var modelId = H.uniqueId('model');

//   //   var TestModel = ottoman.model(
//   //     modelId,
//   //     {
//   //       name: 'string',
//   //       company: 'string',
//   //     },
//   //     {
//   //       index: {
//   //         findByName: {
//   //           type: 'refdoc',
//   //           by: 'name',
//   //         },
//   //         findByCompany: {
//   //           type: 'refdoc',
//   //           by: 'company',
//   //         },
//   //       },
//   //     }
//   //   );

//   //   ottoman.ensureIndices(function(err) {
//   //     assert.isNull(err);

//   //     var x = new TestModel();
//   //     x.name = 'Frank';
//   //     x.company = 'Couchbase';
//   //     var y = new TestModel();
//   //     y.name = 'George';
//   //     y.company = 'Couchbase';

//   //     x.save(function(err) {
//   //       assert.isNull(err);

//   //       y.save(function(err) {
//   //         assert.isNotNull(err);
//   //         done();
//   //       });
//   //     });
//   //   });
//   // });

//   // it('should allow two paths with the same name when undefined', function(done) {
//   //   var modelId = H.uniqueId('model');

//   //   var TestModel = ottoman.model(
//   //     modelId,
//   //     {
//   //       name: 'string',
//   //       company: 'string',
//   //     },
//   //     {
//   //       index: {
//   //         findByNameAndCompany: {
//   //           type: 'refdoc',
//   //           by: ['name', 'company'],
//   //         },
//   //       },
//   //     }
//   //   );

//   //   ottoman.ensureIndices(function(err) {
//   //     assert.isNull(err);

//   //     var x = new TestModel();
//   //     x.name = 'Frank';
//   //     var y = new TestModel();
//   //     y.company = 'Frank';

//   //     x.save(function(err) {
//   //       assert.isNull(err);

//   //       y.save(function(err) {
//   //         assert.isNull(err);
//   //         done();
//   //       });
//   //     });
//   //   });
//   // });

//   // it('should be ok to have two refdocs both undefined', function(done) {
//   //   var modelId = H.uniqueId('model');

//   //   var TestModel = ottoman.model(
//   //     modelId,
//   //     {
//   //       name: 'string',
//   //       company: 'string',
//   //     },
//   //     {
//   //       index: {
//   //         findByName: {
//   //           type: 'refdoc',
//   //           by: 'name',
//   //         },
//   //         findByCompany: {
//   //           type: 'refdoc',
//   //           by: 'company',
//   //         },
//   //       },
//   //     }
//   //   );

//   //   ottoman.ensureIndices(function(err) {
//   //     assert.isNull(err);

//   //     var x = new TestModel();
//   //     x.name = 'Frank';
//   //     var y = new TestModel();
//   //     y.name = 'George';

//   //     x.save(function(err) {
//   //       assert.isNull(err);

//   //       y.save(function(err) {
//   //         assert.isNull(err);
//   //         done();
//   //       });
//   //     });
//   //   });
//   // });

//   // it('should succeed with a previously changed refdoc key', function(done) {
//   //   var modelId = H.uniqueId('model');
//   //   var TestModel = ottoman.model(
//   //     modelId,
//   //     {
//   //       name: 'string',
//   //       company: 'string',
//   //     },
//   //     {
//   //       index: {
//   //         findByName: {
//   //           type: 'refdoc',
//   //           by: 'name',
//   //         },
//   //         findByCompany: {
//   //           type: 'refdoc',
//   //           by: 'company',
//   //         },
//   //       },
//   //     }
//   //   );

//   //   ottoman.ensureIndices(function(err) {
//   //     assert.isNull(err);

//   //     var x = new TestModel();
//   //     x.name = 'Frank';
//   //     x.company = 'Couchbase';
//   //     var y = new TestModel();
//   //     y.name = 'Frank';
//   //     y.company = 'Google';

//   //     x.save(function(err) {
//   //       assert.isNull(err);

//   //       x.name = 'George';
//   //       x.save(function(err) {
//   //         assert.isNull(err);

//   //         y.save(function(err) {
//   //           assert.isNull(err);

//   //           y.name = 'Bob';
//   //           y.company = 'VMWare';
//   //           y.save(function(err) {
//   //             assert.isNull(err);

//   //             done();
//   //           });
//   //         });
//   //       });
//   //     });
//   //   });
//   // });

//   // it('should fail for a missing refdoc value', function(done) {
//   //   var modelId = H.uniqueId('model');
//   //   var TestModel = ottoman.model(
//   //     modelId,
//   //     {
//   //       name: 'string',
//   //     },
//   //     {
//   //       index: {
//   //         findByName: {
//   //           type: 'refdoc',
//   //           by: 'name',
//   //         },
//   //       },
//   //     }
//   //   );

//   //   ottoman.ensureIndices(function(err) {
//   //     assert.isNull(err);

//   //     var x = new TestModel();
//   //     x.name = 'Frank';

//   //     x.save(function(err) {
//   //       assert.isNull(err);

//   //       TestModel.findByName('George', function(err, res) {
//   //         assert.isNull(err);
//   //         assert.isArray(res);
//   //         assert.propertyVal(res, 'length', 0);

//   //         done();
//   //       });
//   //     });
//   //   });
//   // });

//   // it('should fail to ensureIndex with an invalid index type', function(done) {
//   //   var ottoX = new ottoman.Ottoman();
//   //   ottoX.store = ottoman.store;

//   //   var modelId = H.uniqueId('model');
//   //   ottoX.model(
//   //     modelId,
//   //     {
//   //       name: 'string',
//   //     },
//   //     {
//   //       index: {
//   //         findByName: {
//   //           type: 'INVALID INDEX',
//   //           by: 'name',
//   //         },
//   //       },
//   //     }
//   //   );

//   //   ottoX.ensureIndices(function(err) {
//   //     assert.isNotNull(err);
//   //     done();
//   //   });
//   // });

//   // it('should fail to search with an invalid index type', function(done) {
//   //   var ottoX = new ottoman.Ottoman();
//   //   ottoX.store = ottoman.store;

//   //   var modelId = H.uniqueId('model');
//   //   var TestModel = ottoX.model(
//   //     modelId,
//   //     {
//   //       name: 'string',
//   //     },
//   //     {
//   //       index: {
//   //         findByName: {
//   //           type: 'INVALID INDEX',
//   //           by: 'name',
//   //         },
//   //       },
//   //     }
//   //   );

//   //   TestModel.findByName('', function(err, res) {
//   //     assert.isNotNull(err);
//   //     assert.isNull(res);
//   //     done();
//   //   });
//   // });

//   // function _indexTestPromise(indexType, done) {
//   //   var modelId = H.uniqueId('model');

//   //   var TestModel = ottoman.model(
//   //     modelId,
//   //     {
//   //       name: 'string',
//   //       company: 'string',
//   //     },
//   //     {
//   //       index: {
//   //         findByName: {
//   //           type: indexType,
//   //           by: 'name',
//   //           consistency: ottoman.Consistency.GLOBAL,
//   //         },
//   //         findByCompany: {
//   //           type: indexType,
//   //           by: 'company',
//   //           consistency: ottoman.Consistency.GLOBAL,
//   //         },
//   //       },
//   //     }
//   //   );

//   //   ottoman
//   //     .ensureIndices()
//   //     .then(function() {
//   //       var x = new TestModel();
//   //       x.name = 'Frankie';
//   //       x.company = 'Couchbase';
//   //       var y = new TestModel();
//   //       y.name = 'Georgio';
//   //       y.company = 'Google';

//   //       return x
//   //         .save()
//   //         .then(function() {
//   //           return y.save();
//   //         })
//   //         .then(function() {
//   //           // Not pretty; but for n1ql indexes, this sometimes executes too fast
//   //           // before indices are in full ready state on the DB.  If n1ql tests
//   //           // in particular executes before indexes are ready, results come back
//   //           // empty [] and the test fails, which is a red herring.
//   //           setTimeout(function() {
//   //             TestModel.findByName('Frankie', function(err, res) {
//   //               assert.isNull(err);
//   //               assert.isArray(res);
//   //               assert.propertyVal(res, 'length', 1);
//   //               var obj = res[0];
//   //               assert.equal(obj._id, x._id);
//   //               assert.equal(obj.name, 'Frankie');
//   //               assert.equal(obj.company, 'Couchbase');
//   //               done();
//   //             });
//   //           }, 1000);
//   //         });
//   //     })
//   //     .catch(function(err) {
//   //       throw err;
//   //     });
//   // }
//   // it('should perform default string indexing successfully (promise)', function(done) {
//   //   _indexTestPromise.call(this, undefined, done);
//   // });

//   // it('should perform view string indexing successfully (promise)', function(done) {
//   //   _indexTestPromise.call(this, 'view', done);
//   // });

//   // it('should perform refdoc string indexing successfully (promise)', function(done) {
//   //   _indexTestPromise.call(this, 'refdoc', done);
//   // });

//   // it('should perform n1ql string indexing successfully (promise)', function(done) {
//   //   _indexTestPromise.call(this, 'n1ql', done);
//   // });

//   // if (ottoman.store instanceof ottoman.CbStoreAdapter) {
//   //   it('should create index on _type when indexing for n1ql (promise)', function(done) {
//   //     var couchbase = require('couchbase');

//   //     _indexTestPromise.call(this, 'n1ql', function() {
//   //       // At this point, all GSI indexes should have been made, meaning there
//   //       // should be one on type.
//   //       var verifyQ =
//   //         'SELECT * FROM system:indexes WHERE ' +
//   //         "keyspace_id='" +
//   //         ottoman.bucket._name +
//   //         "' AND " +
//   //         "(ARRAY_CONTAINS(index_key, '`_type`') OR " +
//   //         "ARRAY_CONTAINS(index_key, '_type'))";

//   //       ottoman.bucket.query(couchbase.N1qlQuery.fromString(verifyQ), function(
//   //         err,
//   //         rows
//   //       ) {
//   //         if (err) {
//   //           return done(err);
//   //         }

//   //         // If we got anything back, then the appropriate index exists.
//   //         assert.isAtLeast(rows.length, 1);
//   //         done();
//   //       });
//   //     });
//   //   });
//   // }

//   // it('should fail to have two identical refdoc keys (promise)', function(done) {
//   //   var modelId = H.uniqueId('model');

//   //   var TestModel = ottoman.model(
//   //     modelId,
//   //     {
//   //       name: 'string',
//   //       company: 'string',
//   //     },
//   //     {
//   //       index: {
//   //         findByName: {
//   //           type: 'refdoc',
//   //           by: 'name',
//   //         },
//   //         findByCompany: {
//   //           type: 'refdoc',
//   //           by: 'company',
//   //         },
//   //       },
//   //     }
//   //   );

//   //   ottoman
//   //     .ensureIndices()
//   //     .then(function() {
//   //       var x = new TestModel();
//   //       x.name = 'Frankie';
//   //       x.company = 'Couchbase';
//   //       var y = new TestModel();
//   //       y.name = 'Georgio';
//   //       y.company = 'Couchbase';

//   //       // Normally you wouldn't nest promises like this, but we need the nested
//   //       // catch to know that the error came from y.save().
//   //       return x.save().then(function() {
//   //         return y
//   //           .save()
//   //           .then(function(res) {
//   //             assert.isNull(res);
//   //           })
//   //           .catch(function(err) {
//   //             // We expect an error ONLY from y.save()
//   //             assert.isNotNull(err);
//   //             return done();
//   //           });
//   //       });
//   //     })
//   //     .catch(function(err) {
//   //       throw err;
//   //     });
//   // });

//   // it('should allow two paths with the same name when undefined (promise)', function(done) {
//   //   var modelId = H.uniqueId('model');

//   //   var TestModel = ottoman.model(
//   //     modelId,
//   //     {
//   //       name: 'string',
//   //       company: 'string',
//   //     },
//   //     {
//   //       index: {
//   //         findByNameAndCompany: {
//   //           type: 'refdoc',
//   //           by: ['name', 'company'],
//   //         },
//   //       },
//   //     }
//   //   );

//   //   ottoman
//   //     .ensureIndices()
//   //     .then(function() {
//   //       var x = new TestModel();
//   //       x.name = 'Frankie';
//   //       var y = new TestModel();
//   //       y.company = 'Frankie';

//   //       return x
//   //         .save()
//   //         .then(function() {
//   //           return y.save();
//   //         })
//   //         .then(function() {
//   //           return done();
//   //         });
//   //     })
//   //     .catch(function(err) {
//   //       throw err;
//   //     });
//   // });

//   // it('should be ok to have two refdocs both undefined (promise)', function(done) {
//   //   var modelId = H.uniqueId('model');

//   //   var TestModel = ottoman.model(
//   //     modelId,
//   //     {
//   //       name: 'string',
//   //       company: 'string',
//   //     },
//   //     {
//   //       index: {
//   //         findByName: {
//   //           type: 'refdoc',
//   //           by: 'name',
//   //         },
//   //         findByCompany: {
//   //           type: 'refdoc',
//   //           by: 'company',
//   //         },
//   //       },
//   //     }
//   //   );

//   //   ottoman
//   //     .ensureIndices()
//   //     .then(function() {
//   //       var x = new TestModel();
//   //       x.name = 'Frankie';
//   //       var y = new TestModel();
//   //       y.name = 'Georgio';

//   //       return x
//   //         .save()
//   //         .then(function() {
//   //           return y.save();
//   //         })
//   //         .then(function() {
//   //           return done();
//   //         });
//   //     })
//   //     .catch(function(err) {
//   //       throw err;
//   //     });
//   // });

//   // it('should succeed with a previously changed refdoc key (promise)', function(done) {
//   //   var modelId = H.uniqueId('model');
//   //   var TestModel = ottoman.model(
//   //     modelId,
//   //     {
//   //       name: 'string',
//   //       company: 'string',
//   //     },
//   //     {
//   //       index: {
//   //         findByName: {
//   //           type: 'refdoc',
//   //           by: 'name',
//   //         },
//   //         findByCompany: {
//   //           type: 'refdoc',
//   //           by: 'company',
//   //         },
//   //       },
//   //     }
//   //   );

//   //   ottoman
//   //     .ensureIndices()
//   //     .then(function() {
//   //       var x = new TestModel();
//   //       x.name = 'Frankie';
//   //       x.company = 'Couchbase';
//   //       var y = new TestModel();
//   //       y.name = 'Frankie';
//   //       y.company = 'Google';

//   //       return x
//   //         .save()
//   //         .then(function() {
//   //           x.name = 'Georgio';
//   //           return x.save();
//   //         })
//   //         .then(function() {
//   //           return y.save();
//   //         })
//   //         .then(function() {
//   //           y.name = 'Bobby';
//   //           y.company = 'VMWare';
//   //           return y.save();
//   //         })
//   //         .then(function() {
//   //           return done();
//   //         });
//   //     })
//   //     .catch(function(err) {
//   //       throw err;
//   //     });
//   // });

//   // it('should fail for a missing refdoc value (promise)', function(done) {
//   //   var modelId = H.uniqueId('model');
//   //   var TestModel = ottoman.model(
//   //     modelId,
//   //     {
//   //       name: 'string',
//   //     },
//   //     {
//   //       index: {
//   //         findByName: {
//   //           type: 'refdoc',
//   //           by: 'name',
//   //         },
//   //       },
//   //     }
//   //   );

//   //   ottoman
//   //     .ensureIndices()
//   //     .then(function() {
//   //       var x = new TestModel();
//   //       x.name = 'Frankie';
//   //       return x.save();
//   //     })
//   //     .then(function() {
//   //       return TestModel.findByName('Georgio');
//   //     })
//   //     .then(function(res) {
//   //       assert.isArray(res);
//   //       assert.propertyVal(res, 'length', 0);
//   //       done();
//   //     })
//   //     .catch(function(err) {
//   //       throw err;
//   //     });
//   // });

//   // it('should fail to ensureIndex with an invalid index type (promise)', function(done) {
//   //   var ottoX = new ottoman.Ottoman();
//   //   ottoX.store = ottoman.store;

//   //   var modelId = H.uniqueId('model');
//   //   ottoX.model(
//   //     modelId,
//   //     {
//   //       name: 'string',
//   //     },
//   //     {
//   //       index: {
//   //         findByName: {
//   //           type: 'INVALID INDEX',
//   //           by: 'name',
//   //         },
//   //       },
//   //     }
//   //   );

//   //   ottoX
//   //     .ensureIndices()
//   //     .then(function(res) {
//   //       assert.isNull(res);
//   //     })
//   //     .catch(function() {
//   //       done();
//   //     });
//   // });

//   // it('should fail to search with an invalid index type (promise)', function(done) {
//   //   var ottoX = new ottoman.Ottoman();
//   //   ottoX.store = ottoman.store;

//   //   var modelId = H.uniqueId('model');
//   //   var TestModel = ottoX.model(
//   //     modelId,
//   //     {
//   //       name: 'string',
//   //     },
//   //     {
//   //       index: {
//   //         findByName: {
//   //           type: 'INVALID INDEX',
//   //           by: 'name',
//   //         },
//   //       },
//   //     }
//   //   );

//   //   TestModel.findByName('')
//   //     .then(function(res) {
//   //       assert.isNull(res);
//   //     })
//   //     .catch(function() {
//   //       done();
//   //     });
//   // });
// });
