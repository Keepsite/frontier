// const Frontier = require('../src/index.js');

// const CouchbaseAdapter = require('../src/adaptors/couchbase');

// class User extends Frontier.Model {
//   static schema() {
//     return {
//       fullName: { type: 'string', required: true },
//       firstName: { type: 'string', required: true },
//       lastName: { type: 'string', required: true },

//       currentOrg: { ref: 'Org', required: false },
//       password: { type: 'string', required: false, hidden: true },
//       skills: [{ type: 'string' }],
//       notifications: [{ ref: 'Activity' }],
//       timezone: { type: 'string', default: 'UTC', required: true },
//       createdDate: {
//         type: 'Date',
//         default: Date.now,
//         readonly: true,
//         required: true,
//       },
//       modifiedDate: { type: 'Date', default: Date.now, required: true },
//       meta: { type: 'Mixed', required: false },
//     };
//   }

//   constructor(data) {
//     super();
//     // console.log('UserModel constructor', { data });
//   }

//   static get orgProjects() {
//     return [];
//   }
// }

// const adapter = new CouchbaseAdapter({
//   bucket: 'bucket',
//   password: 'password',
// });

// const user = new User({
//   firstName: 'Dan',
//   lastName: 'Landers',
// });

// const repo = new Frontier.Repository();
//
// console.log({
//   // frontier,
//   repo,
//   user,
//   user1: user.getById(1) /* userSchema: User.schema() */,
// });

// const frontier = new Frontier({ adapter, models: [], plugins: [] });

// // Open a connection
// if (process.env.CNCSTR) {
//   const couchbase = require('couchbase');

//   const cluster = new couchbase.Cluster(process.env.CNCSTR);
//   const bucket = cluster.openBucket();

//   let seenKeys = [];
//   const _bucketInsert = bucket.insert.bind(bucket);
//   bucket.insert = function insert (key, value, options, callback) {
//     seenKeys.push(key);
//     return _bucketInsert(key, value, options, callback);
//   };
//   const _bucketUpsert = bucket.upsert.bind(bucket);
//   bucket.upsert = function upsert (key, value, options, callback) {
//     seenKeys.push(key);
//     return _bucketUpsert(key, value, options, callback);
//   };
//   const _bucketReplace = bucket.replace.bind(bucket);
//   bucket.replace = function replace (key, value, options, callback) {
//     seenKeys.push(key);
//     return _bucketReplace(key, value, options, callback);
//   };
//   after((done) => {
//     if (seenKeys.length === 0) {
//       return done();
//     }

//     let remain = seenKeys.length;
//     for (let i = 0; i < seenKeys.length; ++i) {
//       bucket.remove(seenKeys[i], () => {
//         remain--;
//         if (remain === 0) {
//           seenKeys = [];
//           done();
//         }
//       });
//     }
//   });

//   frontier.bucket = bucket;
// } else {
//   frontier.store = new frontier.MockStoreAdapter();
// }

// Setup Frontier
// module.exports.lib = frontier;

// // Some helpers
// function _saveAllModels(modelArr, callback) {
//   let i = 0;
//   (function __doOne() {
//     if (i >= modelArr.length) {
//       callback(null);
//       return;
//     }

//     modelArr[i].save((err) => {
//       if (err) {
//         callback(err);
//         return;
//       }

//       i++;
//       __doOne();
//     })
//   })();
// }
// module.exports.saveAll = _saveAllModels;

// let uniqueIdCounter = 0;
// function uniqueId(prefix) {
//   return prefix + (uniqueIdCounter++);
// }
// module.exports.uniqueId = uniqueId;
