"use strict";

var express = require("express");
var mongo = require("mongodb");
var mongoose = require("mongoose");
var dns = require("dns");

var cors = require("cors");

var app = express();

// Basic Configuration
var port = process.env.PORT || 3000;

/** this project needs a db !! **/

// mongoose.connect(process.env.MONGOLAB_URI);
var db = mongoose.connect(
  "mongodb+srv://test:test@cluster0-nvh3p.mongodb.net/test?retryWrites=true&w=majority",
  { useNewUrlParser: true, useUnifiedTopology: true }
);

console.log(mongoose.connection.readyState);

app.use(cors());

/** this project needs to parse POST bodies **/
// you should mount the body-parser here
var bodyParser = require("body-parser");
app.use(bodyParser.urlencoded({ extended: false }));

//var db = mongoose.connection;

//create model : start

var Schema = mongoose.Schema;
var urlSchema = new Schema({
  name: { type: String, required: true }
});
var url = mongoose.model("url", urlSchema);

var createAndSaveUrl = function(txt, done) {
  var url1 = new url({ name: txt });

  url1.save(function(err, data) {
    if (err) return console.error(err);
    done(null, data);
  });
};

//create model : end

app.use("/public", express.static(process.cwd() + "/public"));

app.get("/", function(req, res) {
  res.sendFile(process.cwd() + "/views/index.html");
});

// your first API endpoint...
app.get("/api/hello", function(req, res) {
  res.json({ greeting: "hello API" });
});

//api for handling from home page
app.post("/api/shorturl/new", (req, res, next) => {
  console.log(req.body.url);
  var regex = /^https?:\/\//; //need this format for res.redirect

  if (regex.test(req.body.url)) {
    var tempDnsUrl = req.body.url.slice(req.body.url.indexOf("//") + 2); //need to remove http(s):// to pass to dns.lookup
    var slashIndex = tempDnsUrl.indexOf("/"); //need to remove anythng past .com, etc., for dns.lookup
    var dnsUrl = slashIndex < 0 ? tempDnsUrl : tempDnsUrl.slice(0, slashIndex);
    console.log("slashIndex: " + slashIndex);
    console.log("dnsUrl: " + dnsUrl);

    var webcheck = dns.lookup(dnsUrl, (err, add, fam) => {
      if (err) {
        return res.json({ error: "invalid URL" });
      } else {
        console.log("so, your url is correct. Let's check if it's exist");
        //check existance in db
        url.find({ name: req.body.url }, function(err, data) {
          if (data.length) {
            res.json({ name: data[0].name, short_url: data[0]._id });
          } else { //this part for creating new one
            createAndSaveUrl(req.body.url, function(err, data) {
              if (err) {
                return next(err);
              }
              res.json({ name: data[0].name, short_url: data[0]._id });
            });
          }
        });
        
      }
    });
    //goto https://www.freecodecamp.org/forum/t/help-with-node-js-dns-lookup/311144
  } else {
    res.json({ error: "invalid URL" });
  }
});

app.get("/api/shorturl/:id", function(req, res) {
  var id = req.params.id;
  url.findById({_id:id},function(err,data){
    if (err) return res.json({ error: "invalid URL" });;
    if(data){
      //res.json(data);
      res.redirect(data.name);
    } else {
      //res.json(data);
      res.json({ error: "invalid URL" });
    }
  });
});


app.listen(port, function() {
  console.log("Node.js listening ...");
});
