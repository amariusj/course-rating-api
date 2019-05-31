//load modules
const mongoose = require("mongoose");

//Require User model
const User = require('../models/user');

//Creates Review Schema
const ReviewSchema = new mongoose.Schema({
  user: {
    type: String
  },
  postedOn: {
    type: Date,
    default: Date.now
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  review: {
    type: String
  }
});

const Review = mongoose.model('Review', ReviewSchema)
module.exports = Review;
