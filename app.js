//jshint esversion:6
require('dotenv').config()
// console.log(process.env) // remove this after you've confirmed it working
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
// const encrypt = require("mongoose-encryption");  //belongs to Level 2 Authentication: database encryption
const md5 = require("md5");

const app = express();

app.use(express.static("public"));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({
  extended: true
}));

mongoose.connect("mongodb://localhost:27017/secretsAppDB");

//changing the simple version of schema into a full version of schema
const userSchema = new mongoose.Schema({
  email: String,
  password: String
});

//Level 2 Authentication: enable database encryption with mongoose-encryption package
// const secret = "Thisisourlittlesecrets!";
//using the environment variables from a .env file with dotenv package to protect our private information
// userSchema.plugin(encrypt, { secret: process.env.SECRET, encryptedFields: ["password"] });
//belongs to Level 2 Authentication: database encryption

const User = new mongoose.model("User", userSchema);


app.get("/", (req, res) => {
  res.render("home");
});

app.get("/login", (req, res) => {
  res.render("login");
});

app.get("/register", (req, res) => {
  res.render("register");
});

app.post("/register", (req, res) => {
  const newUser = new User({
    email: req.body.username,
    //Level 3 Authentication: enable hashing the password with md5 package
    password: md5(req.body.password)
  });
  newUser.save((err) => {
    if (!err) {
      res.render("secrets");
    } else {
      console.log(err);
    }
  });
});

app.post("/login", (req, res) => {
  const username = req.body.username;
  //Level 3 Authentication: enable hashing the password with md5 package
  const password = md5(req.body.password);
  User.findOne({
    email: username
  }, (err, foundUser) => {
    if (!err) {
      if (foundUser) {
        if (foundUser.password === password) {
          res.render("secrets");
        }
      }
    } else {
      console.log(err);
    }
  });
});

app.listen(3000, () => console.log("server is started on port 3000!"));
