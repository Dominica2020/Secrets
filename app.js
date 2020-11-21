//jshint esversion:6
require('dotenv').config()
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require('mongoose');
const session = require('express-session');
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate');

const app = express();

app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));

//This tells our app to use the session package required above
app.use(session({
  //you can add any long string here, just remember it!
  secret: "Our little secret.",
  resave: false,
  saveUninitialized: false
}));

//here we tell our app to use passport & to initialize the passport package
app.use(passport.initialize());
//this is where we tell our app to use passport when managing sessions
app.use(passport.session());

mongoose.connect("mongodb://localhost:27017/userDB", {useNewUrlParser: true, useUnifiedTopology: true});
//add this b/c of deprecation warning in console
mongoose.set("useCreateIndex", true);

const userSchema = new mongoose.Schema({
    email: String,
    password: String,
    googleId: String,
    secret: String
});
//tap into your schema & add plugin
userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = mongoose.model('User', userSchema);

passport.use(User.createStrategy());
 
passport.serializeUser(function(user, done) {
    done(null, user.id);
  });
  
  passport.deserializeUser(function(id, done) {
    User.findById(id, function(err, user) {
      done(err, user);
    });
  });

//Copied from passport-google-oauth20 Configure Strategy
passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"  //we will no longer retrieve user info from Google+ as it is deprecated
  }, //call back function below. Note: findOrCreate is not a reall method but pseudocode. You add your desired Mongo method in its place or use Mongoose findOrCrete plugin on NPM!
  function(accessToken, refreshToken, profile, cb) {
    console.log(profile);
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

app.get("/", function(req, res) {
    res.render("home");
});

//here we say use passport to authenticate our user with the google strategy
app.get("/auth/google",
    passport.authenticate("google", { scope: ["email", "profile"] } 
));

app.get("/auth/google/secrets",
    passport.authenticate("google", {
        successRedirect: "/secrets",
        failureRedirect: "/login"
}));

app.get("/login", function(req, res) {
    res.render("login");
});

app.get("/register", function(req, res) {
    res.render("register");
});

app.get("/secrets", function (req, res) {
    User.find({"secret": {$ne: null}}, function(err, foundUsers) {
        if (err) {
            console.log(err);
        } else {
            if (foundUsers) {
                res.render("secrets", {usersWithSecrets: foundUsers});
            }
        }
    });
});

app.get("/submit", function(req, res) {
    if (req.isAuthenticated()) {
        res.render("submit");
    } else {
        res.redirect("/login");
    }
});

app.get("/logout", function (req, res) {
    req.logout();
    res.redirect("/");
});

app.post("/register", function(req, res) {
    //this is our middleman to handle creating & saving our users
    User.register({username: req.body.username}, req.body.password, function(err, result) {
        if (err) {
            console.log(err);
            res.redirect("/register");
        } else {
            passport.authenticate("local") (req, res, function() {
                res.redirect("/secrets");
            });
        }
    });
    
});

app.post("/login", function (req, res) {
    
    const user = new User({
        username: req.body.username,
        password: req.body.password
    });

    //passport gives us a login() function on req
    req.login(user, function(err) {
        if (err) {
            console.log(err);
        } else {
            passport.authenticate("local") (req, res, function() {
                res.redirect("/secrets");
            });
        }
    });

});

app.post("/submit", function(req, res) {
    const submittedSecret = req.body.secret;
    //now find the user in our DB & save thier secret to their file:
    console.log(req.user.id);

    User.findById(req.user.id, function(err, foundUser) {
        if (err) {
            console.log(err);
        } else {
            if (foundUser) {
                foundUser.secret = submittedSecret;
                foundUser.save(function() {
                    res.redirect("/secrets");
                });
            }
        }
    });

});

app.listen(3000, function() {
    console.log("Server started on port 3000.")
});


/*



*/





