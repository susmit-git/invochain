
var Web3 = require('web3');
var express = require('express');
var path = require('path');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var mongoose = require('mongoose');
var bcrypt = require('bcryptjs');
var fs = require('fs');
var multer  = require('multer')
var mkdirp = require('mkdirp');
var session = require('express-session');
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;

const solc = require('solc');
var userContractInstance = null;
var routes = require('./routes/api');

var app = express();

app.set('port', process.env.PORT || 3004);
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
//app.use(busboy());
app.use(cookieParser());

app.use(session({ secret: 'keyboard cat' }));
app.use(passport.initialize());
app.use(passport.session());

app.use(express.static(path.join(__dirname, 'public')));

function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) next();
  else res.send(401);
}



app.use(function(req, res, next) {
  if (req.user) {
    res.cookie('user', JSON.stringify(req.user));
  }
  next();
});

app.use(function(err, req, res, next) {
  console.error(err.stack);
  res.send(500, { message: err.message });
});

app.use('/', routes);

app.listen(app.get('port'), function() {
  console.log('Express server listening on port ' + app.get('port'));
});

