//load modules
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

//Creates User Schema
var UserSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: true
  },
  emailAddress: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  }
});

//Authenticates the user
UserSchema.statics.authenticate = function(email, password, callback) {
  User.findOne({ email: email })
    .exec(function (error, user) {
      if (error) {
        return callback(error);
      } else if ( !user ) {
        var err = new Error('User not found');
        err.statis = 401;
        return callback(err)
      }
      bcrypt.compare(password, user.password, function(error, result) {
        if (result === true) {
          return callback(null, user);
        } else {
          return callback();
        }
      });
    });
}

//Hashesh the password of a user
UserSchema.pre('save', function (next) {
  var user = this;
  bcrypt.hash(user.password, 10, (err, hash) => {
    if (err) {
      return next(err);
    }
    user.password = hash;
    next();
  });
});

var User = mongoose.model('User', UserSchema)
module.exports = User;
