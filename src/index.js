'use strict';

// load modules
const express = require('express');
const morgan = require('morgan');
const jsonParser = require('body-parser').json;
const mongoose = require('mongoose');
const session = require('express-session');
const auth = require('basic-auth');
const bcrypt = require('bcrypt');

const app = express();

//Require models
const User = require('../models/user');
const Course = require('../models/course');
const Review = require('../models/review');

// set our port
app.set('port', process.env.PORT || 5000);

// morgan gives us http request logging
app.use(morgan('dev'));

// This will parse the request body as json and make it usable
app.use(jsonParser());

//Connection URL
const course  = "mongodb://localhost:27017/course"

//Connect to mongoDB
mongoose.connect(course);

//Holds the database connection object
const db = mongoose.connection;

//Creates an error handler with the database
db.on('error', console.error.bind(console, 'connection error:'));

//Writes a message to the console once the connection has been opened successfully
db.on('connected', () => console.log('Mongoose default connection open to ' + course));


// TODO add additional routes here

const authenticateUser = (req, res, next) => {

  const credentials = auth(req);
  console.log(credentials);

  if (credentials) {
    User.findById(req.session.userId)
    .exec(function (error, user) {

      if (error) {

        return next(error);

      } else if (!user) {

        var err = new Error('Access Denied. Please login');
        err.status = 401;
        return next(err);

      } else  if (user) {
        console.log(user);
        const authenticated = bcrypt.compare(credentials.pass, user.password);

        if (!authenticated) {

          var err = new Error('Access Denied');
          err.status = 401
          return next(err);

        } else {

          next();
        }

      }
    });
  } else {

    var err = new Error('No user logged in');
    err.status = 401;
    next(err);
  }
}

//Uses the session function
app.use(session({
  secret: "I'm giving it my all!",
  resave: true,
  saveUninitialized: false
}));

//The User Routes

//Gets the currently authenticated user
app.get('/api/users', authenticateUser, (req, res, next) => {
  User.findById(req.session.userId)
  .exec(function (error, user) {
    if (error) {
      return next(error);
    } else {
      return res.json({
        user: user
      })
    }
  });
});

//Creates a user
app.post('/api/users', (req, res, next) => {
  //If all fields have been entered
  if (
    req.body.fullName &&
    req.body.emailAddress &&
    req.body.password &&
    req.body.confirmPassword
  ) {
    //Check to see if the passwords match. If not then run an error
    if (req.body.password !== req.body.confirmPassword) {
      let err = new Error('Passwords do not match');
      err.status = 400;
      return next(err);
    }

    //Create a user obect to hold the posted data
    let userData = {
      emailAddress: req.body.emailAddress,
      fullName: req.body.fullName,
      password: req.body.password
    };

    User.findOne({ emailAddress: req.body.emailAddress})
    .exec(function (error, user) {
      if (error) {
        return next(error)
      } else if (user) {
        let err = new Error('User already exists');
        err.status = 400;
        return next(err);
      } else {
        //Inserts the data object into Mongo
        User.create(userData, (error, user) => {
          if (error) {
            return next(error);
          } else {
            req.session.userId = user._id;
            res.status(201).end();
          }
        });
      }
    });



  } else {
    let err = new Error('All fields required');
    err.status = 400;
    return next(err);
  }
});

//The Course Routes

app.param('courseId', (req, res, next, id) => {
  Course.findById(id, (error, course) => {
    if (error) return next(error);
    if (!course) {
      error = new Error("Course not found.");
      error.status = 404;
      return next(error);
    }
    req.course = course;
    next();
  });
});

//Returns all course id's and titles
app.get('/api/courses', (req, res, next) => {
  Course.find({}, {
    title: true
  })
  .exec(function (error, course) {
    if (error) {
      return next(error);
    }
    if (!course) {
      error = new Error("Course not found.");
      error.status = 404;
      return next(error);
    } else {
      return res.json({
        course: course
      })
    }
  });
});

//Returns all course props and related documents for provided course ID
app.get('/api/courses/:courseId', (req, res, next) => {
  Course.findById(req.params.courseId)
  .populate('user')
  .populate('reviews')
  .exec(function(error, course) {
    if (error) {
      return next(error);
    }
    if (!course) {
      error = new Error("Course not found.");
      error.status = 404;
      return next(error);
    } else {
      return res.json({
        course
      })
    }
  });
});

//Creates a course
app.post('/api/courses', authenticateUser, (req, res, next) => {
  //If all fields have been entered
  if (
    req.body.title &&
    req.body.description &&
    req.body.steps[0].title &&
    req.body.steps[0].description &&
    req.session.userId
  ) {

    //Create a course obect to hold the posted data
    let courseData = {
      title: req.body.title,
      description: req.body.description,
      user: req.session.userId,
      steps: req.body.steps
    };

    //Inserts the course data object into Mongo
    Course.create(courseData, (error, course) => {
      if (error) {
        return next(error);
      } else {
        res.setHeader('Content-Type', 'application/json');
        res.status(201).end();
      }
    });


  } else {
      //Render all fields need to be required
      let err = new Error('All fields required');
      err.status = 400;
      return next(err);
  }
});

//Updates a course
app.put('/api/courses/:courseId', authenticateUser, (req, res, next) => {
  req.course.update(req.body, (error, result) => {
    if (error) return next(error);
    res.status(204);
    res.json(result);
  });
});

//Creates a review for the specified courseId
app.post('/api/courses/:courseId/reviews', authenticateUser, (req, res, next) => {
  //If all fields have been entered
  if (
    req.body.rating
  ) {

    //Create a course obect to hold the posted data
    let reviewData = {
      review: req.body.review,
      rating: req.body.rating,
      user: req.session.userId
    };

    //Inserts the course data object into Mongo
    Review.create(reviewData, (error, review) => {
      if (error) {
        return next(error);
      } else {
        Course.updateOne({ _id: req.params.courseId }, {$set: { reviews: review._id }})
        .exec(function (error, course) {
          if (error) {
            return next(error)
          } else {
            res.status(201).end();
          }
        });
      }
    });
  } else {
      //Render all fields need to be required
      let err = new Error('All fields required');
      err.status = 400;
      return next(err);
  }
});

// send a friendly greeting for the root route
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to the Course Review API'
  });
});

// uncomment this route in order to test the global error handler
// app.get('/error', function (req, res) {
//   throw new Error('Test error');
// });

// send 404 if no other route matched
app.use((req, res) => {
  res.status(404).json({
    message: 'Route Not Found'
  })
})

// global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    message: err.message,
    error: {}
  });
});

// start listening on our port
const server = app.listen(app.get('port'), () => {
  console.log(`Express server is listening on port ${server.address().port}`);
});
