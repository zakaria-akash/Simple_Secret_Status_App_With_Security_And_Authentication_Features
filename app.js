//jshint esversion:6
require('dotenv').config()
// console.log(process.env) // remove this after you've confirmed it working
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");

//Level 5 Authentication: using Passport.js for auto salting and hashing with passport, passport-local, passport-local-mongoose and express-session package
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");

//Level 6 Authentication: Implementation of Google OAuth 2.0 social login strategy
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const findOrCreate = require("mongoose-findorcreate");



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

// mongoose.connect("mongodb://localhost:27017/secretsAppDB");

//using MongoDB Atlas cloud database instead of localhost
mongoose.connect("mongodb+srv://" + process.env.ATLAS_USERNAME + ":" + process.env.ATLAS_PASSWORD + "@" + process.env.CLUSTER_VERSION + ".5mukk.mongodb.net/secretsAppDB");

//changing the simple JavaScript version of schema into a full version of Mongoose Schema
const userSchema = new mongoose.Schema({
  email: String,
  password: String,
  googleId: String,
  secretStatus: String
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);


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
  User.find({
    "secrets": {
      $ne: null
    }
  }, (err, foundUser) => {
    if (err) {
      console.log(err);
    } else {
      if (foundUser) {
        res.render("secrets", {
          userWithSecrets: foundUser
        });
      }
    }
  });
});

app.get("/submit", (req, res) => {
  if (req.isAuthenticated()) {
    res.render("submit");
  } else {
    res.redirect("/login");
  }
});

app.post("/submit", (req, res) => {
  const submittedSecret = req.body.secret;
  const currentUserID = req.user.id;
  User.findById(currentUserID, function(err, foundUser) {
    if (err) {
      console.log(err);
    } else {
      if (foundUser) {
        foundUser.secretStatus = submittedSecret;
        foundUser.save(function() {
          res.redirect("/secrets");
        });
      }
    }
  });

});

app.get("/logout", (req, res) => {
  req.logout();
  res.redirect("/");
});

app.post("/register", (req, res) => {

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
