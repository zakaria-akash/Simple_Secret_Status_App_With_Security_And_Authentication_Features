//jshint esversion:6
require('dotenv').config()
// console.log(process.env) // remove this after you've confirmed it working
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
// const encrypt = require("mongoose-encryption");  //belongs to the Level 2 Authentication: database encryption
// const md5 = require("md5");  //belongs to the Level 3 Authentication: enable hashing the passwords
// const bcrypt = require('bcrypt');
// const saltRounds = 10;  //Level 4 Authentication: salting and hashing the passwords
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
//Level 5 Authentication: using Passport.js for auto salting and hashing with passport, passport-local, passport-local-mongoose and express-session package

const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate');
//Level 6 Authentication: Implementation of Google OAuth 2.0 social login strategy


const app = express();

app.use(express.static("public"));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({
  extended: true
}));

app.use(session({
  secret: process.env.SECRET,
  resave: false,
  saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb://localhost:27017/secretsAppDB");

//changing the simple JavaScript version of schema into a full version of Mongoose Schema
const userSchema = new mongoose.Schema({
  email: String,
  password: String,
  googleId: String
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

//Level 2 Authentication: enable database encryption with mongoose-encryption package
// const secret = "Thisisourlittlesecrets!";
//using the environment variables from a .env file with dotenv package to protect our private information
// userSchema.plugin(encrypt, { secret: process.env.SECRET, encryptedFields: ["password"] });

const User = new mongoose.model("User", userSchema);

passport.use(User.createStrategy());

// used to serialize the user for the session
passport.serializeUser((user, done) => {
    done(null, user.id);
});

// used to deserialize the user to retrieve the data from the session
passport.deserializeUser((id, done) => {
    User.findById(id, (err, user) => {
        done(err, user);
    });
});

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets"
  },
  function(accessToken, refreshToken, profile, cb) {
    // console.log(profile);
    User.findOrCreate({
      googleId: profile.id
    }, function(err, user) {
      return cb(err, user);
    });
  }
));


app.get("/", (req, res) => {
  res.render("home");
});


app.get("/auth/google",
  passport.authenticate("google", {
    scope: ["profile"]
  }));

app.get("/auth/google/secrets",
  passport.authenticate("google", {
    failureRedirect: "/login"
  }),
  (req, res) => {
    // Successful authentication, redirect secrets page.
    res.redirect("/secrets");
  });

app.get("/login", (req, res) => {
  res.render("login");
});

app.get("/register", (req, res) => {
  res.render("register");
});

app.get("/secrets", (req, res) => {
  if (req.isAuthenticated()) {
    res.render("secrets");
  } else {
    res.redirect("/login");
  }
});

app.get("/logout", (req, res) => {
  req.logout();
  res.redirect("/");
});

app.post("/register", (req, res) => {
  // //Level 4 Authentication: salting and hashing the passwords with bcrypt package
  // bcrypt.hash(req.body.password, saltRounds, (err, hash) => {
  //   // Store hash in your password DB.
  //   const newUser = new User({
  //     email: req.body.username,
  //     //Level 3 Authentication: enable hashing the password with md5 package
  //     // password: md5(req.body.password)
  //     password: hash
  //   });
  //   newUser.save((err) => {
  //     if (!err) {
  //       res.render("secrets");
  //       console.log("New User Registration Succesful!");
  //     } else {
  //       console.log(err);
  //     }
  //   });
  // });

  //this following User.register() method comes from passport-local-mongoose package
  User.register({
    username: req.body.username
  }, req.body.password, (err, user) => {
    if (!err) {
      passport.authenticate("local")(req, res, () => {
        res.redirect("/secrets");
      })
    } else {
      console.log(err);
      res.redirect("/register");
    }
  });

});

app.post("/login", (req, res) => {
  // const username = req.body.username;
  // //Level 3 Authentication: enable hashing the password with md5 package
  // // const password = md5(req.body.password);
  // const password = req.body.password;
  // User.findOne({
  //   email: username
  // }, (err, foundUser) => {
  //   if (!err) {
  //     if (foundUser) {
  //       //Level 4 Authentication: salting and hashing the passwords with bcrypt package
  //       bcrypt.compare(password, foundUser.password, (err, result) => {
  //         if (!err) {
  //           if (result == true) {
  //             res.render("secrets");
  //             console.log("Log in Succesful!");
  //           }
  //         } else {
  //           console.log(err);
  //         }
  //       });
  //       // if (foundUser.password === password) {
  //       //   res.render("secrets");
  //       // }
  //     }
  //   } else {
  //     console.log(err);
  //   }
  // });

  const newUser = new User({
    username: req.body.username,
    password: req.body.password
  });

  req.login(newUser, (err) => {
    if (!err) {
      passport.authenticate("local")(req, res, () => {
        res.redirect("/secrets");
      })
    } else {
      console.log(err);
    }
  });

});

app.listen(3000, () => console.log("server is started on port 3000!"));
