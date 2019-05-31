//load modules
const mongoose = require("mongoose");
const Schema = mongoose.Schema;

//Creates Course Schema
const CourseSchema = new mongoose.Schema({
  user: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true
  },
  estimatedTime: {
    type: String
  },
  materialsNeeded: {
    type: String
  },
  steps: [
    {
      stepNumber: Number,
      title: {
        type: String,
        required: true
      },
      description: {
        type: String,
        required: true
      }
    }
  ],
  reviews: [{ type: Schema.Types.ObjectId, ref: 'Review' }]
});


const Course = mongoose.model('Course', CourseSchema)
module.exports = Course;
