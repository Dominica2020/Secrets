//jshint esversion:6
require('dotenv').config()
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require('mongoose');
const encrypt = require('mongoose-encryption');

const app = express();

console.log(process.env.API_KEY);

app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));

mongoose.connect("mongodb://localhost:27017/userDB", {useNewUrlParser: true, useUnifiedTopology: true});

//we will add the encrypt package as a pluggin for the mongoose schema
const userSchema = new mongoose.Schema({
    email: String,
    password: String
});

//We cut out the secret const to move it to the .env file & we access it with process.env
userSchema.plugin(encrypt, { secret: process.env.SECRET, encryptedFields: ["password"]});

const User = mongoose.model('User', userSchema);

app.get("/", function(req, res) {
    res.render("home");
});

app.get("/login", function(req, res) {
    res.render("login");
});

app.get("/register", function(req, res) {
    res.render("register");
});

app.post("/register", function(req, res) {
    //This is where we create the brand new user using the info passed from the registration form.
    const newUser = new User ({
        email: req.body.username,
        password: req.body.password
    });

    newUser.save(function(err) {
        if (err) {
            console.log(err);
        } else {
            //very important: we will ONLY render this page from the register/login routes. There is no app.get for this one!
            res.render("secrets");
        }
    });
});

app.post("/login", function (req, res) {
    //This is where will will check if their details against our DB
    const username = req.body.username;
    const password = req.body.password;

    User.findOne({email: username}, function(err, foundUser) {
        if (!err) {
            if (foundUser) {
                if (password === foundUser.password) {
                    res.render("secrets")
                }
            }
        } else {
            console.log(err);
        }
    });
});


app.listen(3000, function() {
    console.log("Server started on port 3000.")
});


/*

If a doc is not found, it's not an error. 
The foundUser from findOne() will be null so 
you need to capture that in an else statement.

*/





