const { expect } = require('chai');
const Frontier = require('../src');
const Model = require('../src/Model');

describe('Model references', () => {
  // this.timeout(2000000);

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

    // static indicies() {
    //   return {
    //     findByUsername: {
    //       type: 'n1ql',
    //       by: 'username',
    //       consistency: ottoman.Consistency.GLOBAL,
    //     },
    //   }
    // }
  }

  class MultiAccountUser extends Model {
    static schema() {
      return {
        username: 'string',
        accounts: [{ ref: Account }],
      };
    }

    // static indicies() {
    //   return {
    //     findByUsername: {
    //       type: 'n1ql',
    //       by: 'username',
    //       consistency: ottoman.Consistency.GLOBAL,
    //     },
    //   }
    // }
  }

  // before(function(done) {
  //   ottoman.ensureIndices(function(err) {
  //     if (err) {
  //       return done(err);
  //     }
  //     setTimeout(function() {
  //       done();
  //     }, 2000);
  //   });
  // });

  it('should allow mixed references', () => {
    class MixedRefModel extends Model {
      static schema() {
        return {
          anyRef: { ref: 'Mixed' },
        };
      }
    }

    const frontier = new Frontier({ models: [MixedRefModel] });

    [...Array(10)].forEach(() => {
      class M extends Model {
        static schema() {
          return {
            name: 'string',
          };
        }
      }

      const instance = new M({ name: 'Frank' });
      const mixer = new MixedRefModel({ anyRef: instance });
      const frozen = mixer.toJSON();

      expect(frozen.anyRef).to.be.an('object');
      expect(frozen.anyRef.name).to.equal('Frank');
      // expect(frozen.anyRef[ottoman.ottomanType]).to.contain('throwaway');

      // Demonstrate that when we bring it back from coo, the reference is
      // intact, and doesn't throw an error related to unknown types.
      const thawed = frontier.fromJSON(frozen, MixedRefModel.name);
      expect(thawed.anyRef).to.be.ok;
      console.log({ anyRef: frozen.anyRef, thawed: thawed.anyRef });

      // Naturally it will be an unloaded reference, but this proves that
      // the ref has a 'loaded' function, meaning it's actually a reference.
      expect(thawed.anyRef.loaded).to.be.false;
    });
  });

  // it('disallow non-reference values in mixed references', function(done) {
  //   class MixedRefModel extends Model {
  //     H.uniqueId('throwaway'), {
  //     anyRef: { ref: 'Mixed' },
  //   });

  //   // Horribly illegal, Frank is not a reference.
  //   const inst = new MixedRefModel({ anyRef: 'Frank' });

  //   try {
  //     inst.toCoo();
  //     done(new Error('toCoo allows non-reference values in mixed refs'));
  //   } catch (err) {
  //     // toCoo blows up with: Error: Expected anyRef type to be a ModelInstance.
  //     done();
  //   }
  // });

  // it("shouldn't require reference to be present", function(done) {
  //   const notLinked = new User({
  //     username: 'foo',
  //   });

  //   notLinked.save(function(err) {
  //     if (err) {
  //       return done(err);
  //     }

  //     expect(notLinked.username).to.be.ok;
  //     done();
  //   });
  // });

  // it('should permit referencing two models together', function(done) {
  //   const myAccount = new Account({
  //     email: 'burtteh@fakemail.com',
  //     name: 'Brett Lawson',
  //   });

  //   const myUser = new User({
  //     username: 'brett19',
  //     account: myAccount,
  //   });

  //   myAccount.save(function(err) {
  //     if (err) {
  //       return done(err);
  //     }

  //     myUser.save(function(err) {
  //       if (err) {
  //         return done(err);
  //       }

  //       User.findByUsername('brett19', function(err, myUsers) {
  //         // console.log('USERS: ' + JSON.stringify(myUsers));
  //         expect(myUsers).to.be.an('array');
  //         expect(myUsers.length).to.equal(1);

  //         const myUser = myUsers[0];

  //         // console.log(JSON.stringify(myUser));
  //         // console.log('Loaded? ' + myUser.account.loaded());
  //         expect(myUser.account.loaded()).to.be.false;

  //         myUser.account.load(function(err2) {
  //           if (err2) {
  //             return done(err2);
  //           }
  //           expect(myUser.account.email).to.equal('burtteh@fakemail.com');
  //           done();
  //         });
  //       });
  //     });
  //   });
  // });

  // it('should allow re-linking of models', function(done) {
  //   const notLinked = new User({
  //     username: 'relink',
  //   });

  //   notLinked.save(function(err) {
  //     if (err) {
  //       return done(err);
  //     }

  //     expect(notLinked.username).to.be.ok;

  //     const newLinkage = new Account({
  //       email: 'foo@bar.com',
  //       name: 'Foobar',
  //     });

  //     newLinkage.save(function(err) {
  //       if (err) {
  //         return done(err);
  //       }

  //       notLinked.account = newLinkage;

  //       notLinked.save(function(err) {
  //         if (err) {
  //           return done(err);
  //         }

  //         User.findByUsername('relink', function(err, users) {
  //           expect(users).to.be.an('array');
  //           expect(users.length).to.equal(1);
  //           const relinked = users[0];

  //           expect(relinked.account.loaded()).to.be.false;
  //           expect(relinked.account).to.be.ok;

  //           relinked.account.load(function(err) {
  //             if (err) {
  //               return done(err);
  //             }

  //             expect(relinked.account.email).to.equal('foo@bar.com');
  //             done();
  //           });
  //         });
  //       });
  //     });
  //   });
  // });

  // it('should allow one-to-many linkages', function(done) {
  //   const account1 = new Account({
  //     email: 'account1@fake.com',
  //     name: 'Account1',
  //   });

  //   const account2 = new Account({
  //     email: 'account2@fake.com',
  //     name: 'Account2',
  //   });

  //   const myUser = new MultiAccountUser({
  //     username: 'multi-account',
  //     accounts: [account1, account2],
  //   });

  //   const toSave = [account1, account2, myUser];
  //   const saved = 0;

  //   function proceed() {
  //     MultiAccountUser.findByUsername('multi-account', function(err, users) {
  //       if (err) {
  //         return done(err);
  //       }
  //       expect(users).to.be.an('array');
  //       expect(users.length).to.equal(1);

  //       const multiUser = users[0];

  //       expect(multiUser.accounts).to.be.an('array');
  //       expect(multiUser.accounts.length).to.equal(2);

  //       for (const i = 0; i < multiUser.accounts.length; i++) {
  //         expect(multiUser.accounts[i].loaded()).to.be.false;
  //       }

  //       done();
  //     });
  //   }

  //   function saveCallback(err) {
  //     if (err) {
  //       return done(err);
  //     }

  //     saved++;
  //     if (saved === toSave.length) {
  //       proceed();
  //     }
  //   }

  //   toSave.forEach(function(model) {
  //     model.save(saveCallback);
  //   });
  // });
});
