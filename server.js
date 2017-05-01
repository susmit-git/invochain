
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
var storage = multer.diskStorage({
  destination: function (req, file, cb) {
    //var code = JSON.parse(req.body.model).empCode;
    var dest = 'public/uploadedFiles/';
    mkdirp(dest, function (err) {
        if (err) cb(err, dest);
        else cb(null, dest);
    });
  },
  filename: function (req, file, cb) {
    cb(null, Date.now()+'-'+file.originalname);
  }
});

var upload = multer({ storage: storage });

var ethWeb3 = new Web3(new Web3.providers.HttpProvider("http://localhost:8545"));

function checkEthereumConnection(){
  try{
  var accountCount = ethWeb3.eth.accounts.length;
  console.log("Ethereum connection successful. \n Total Ethereum Account Count: "+ accountCount);
  return true;
  }catch(e){
    console.log("Error in Ethereum node connection");
  }

  return false;
}

checkEthereumConnection();

var async = require('async');
var request = require('request');
var xml2js = require('xml2js');
var _ = require('lodash');

var session = require('express-session');
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;

var showSchema = new mongoose.Schema({
  _id: Number,
  name: String,
  airsDayOfWeek: String,
  airsTime: String,
  firstAired: Date,
  genre: [String],
  network: String,
  overview: String,
  rating: Number,
  ratingCount: Number,
  status: String,
  poster: String,
  subscribers: [{
    type: mongoose.Schema.Types.ObjectId, ref: 'User'
  }],
  episodes: [{
      season: Number,
      episodeNumber: Number,
      episodeName: String,
      firstAired: Date,
      overview: String
  }]
});

var userSchema = new mongoose.Schema({
  email: { type: String, unique: true },
  password: String
});

var invoiceSchema = new mongoose.Schema({
  refNo: String,
  buyerName: String,
  imagePath: String,
  fileName: String,
  contentType: String
});

userSchema.pre('save', function(next) {
  var user = this;
  if (!user.isModified('password')) return next();
  bcrypt.genSalt(10, function(err, salt) {
    if (err) return next(err);
    bcrypt.hash(user.password, salt, function(err, hash) {
      if (err) return next(err);
      user.password = hash;
      next();
    });
  });
});

userSchema.methods.comparePassword = function(candidatePassword, cb) {
  bcrypt.compare(candidatePassword, this.password, function(err, isMatch) {
    if (err) return cb(err);
    cb(null, isMatch);
  });
};

var User = mongoose.model('User', userSchema);
var Show = mongoose.model('Show', showSchema);
var Invoice = mongoose.model('Invoice', invoiceSchema);
//mongoose.connect('localhost');
mongoose.connect('mongodb://localhost:27017/invoicechaindb');

//var agenda = require('agenda')({ db: { address: 'mongodb://localhost:27017/invoicechaindb' } });

/*var Agenda = require('agenda');
var agenda = new Agenda({db: { address: 'localhost:27017/invoicechaindb'}}); 
//matcher.matchProviders(agenda);
agenda.on('ready', function() {
    agenda.every('5 seconds', 'match providers'); 
    agenda.start();
});

var sugar = require('sugar');
var nodemailer = require('nodemailer');*/

passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});

passport.use(new LocalStrategy({ usernameField: 'email' }, function(email, password, done) {
  User.findOne({ email: email }, function(err, user) {
    if (err) return done(err);
    if (!user) return done(null, false);
    user.comparePassword(password, function(err, isMatch) {
      if (err) return done(err);
      if (isMatch) return done(null, user);
      return done(null, false);
    });
  });
}));


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

// Start of Invoice Rest API Service
app.get('/api/invoices', function(req, res, next) {
  console.log("Fetching Invoices invoked");

  var query = Invoice.find();
  console.log("Query Formed");

  if (req.query.buyerName) {
    console.log("Query where placed by buyer name "+ req.query.buyerName);
    query.where({ buyerName: req.query.buyerName });
  } else if (req.query.refNo) {
    //query.where({ name: new RegExp('^' + '[' + req.query.alphabet + ']', 'i') });
    console.log("Query where placed by reference no "+ req.query.refNo);
    query.where({ refNo: req.query.refNo });
  } else {
    console.log("Query with no where");
    query.limit(12);
  }

  query.exec(function(err, invoices) {
    if (err) {
      console.log("Error found: "+err);
      return next(err);
    }
    console.log("Success: "+invoices);

    res.send(invoices);
  });
});

app.get('/api/invoices/:id', function(req, res, next) {
  console.log("Fetching Invoice by id");

  Invoice.findById(req.params.id, function(err, invoice) {
    if (err) {
      console.log("Error found: "+err);
      return next(err);
    }
    console.log("Success: "+invoice);
    res.send(invoice);
  });

});

// Service to get the ethereum account balance
app.get('/api/account/balance/:actAddress', function(req, res, next) {
  console.log("Fetching Ethereum account balance by id");

  if(checkEthereumConnection()==true){
    ethWeb3.eth.getBalance(req.params.actAddress, function(error, result) {
      res.send({balance:ethWeb3.fromWei(result.toString())});
    });

  }
});

app.post('/api/invoice', upload.single('invoiceImage'), function(req, res, next) {
  console.log("Create Invoice invoked");
  console.log("****************** Data Request body string: "  + JSON.stringify(req.body));
  

  if (req.file) {
    console.log("****************** Data File found" );
    console.log("****************** Data File fieldname: "+req.file.fieldname);
    console.log("****************** Data File fieldname: originalname: "+req.file.originalname);
    console.log("****************** Data File fieldname: encoding: "+req.file.encoding);
    console.log("****************** Data File fieldname: mimetype: "+req.file.mimetype);
    console.log("****************** Data File fieldname: destination:"+req.file.destination);
    console.log("****************** Data File fieldname: filename: "+req.file.filename);
    console.log("****************** Data File fieldname: path: "+req.file.path);
    console.log("****************** Data File fieldname: size: "+req.file.size);

  }


  console.log("****************** Data Reference No : "  + req.body.refNo);
  console.log("****************** Data Buyer Name : "  + req.body.buyerName);
  console.log("****************** Data Buyer Name : "  + req.body.invoiceImage);


  var strRefNo  =req.body.refNo;
  var strbuyerName  =req.body.buyerName;
  

  if(strRefNo==undefined){
     res.send(400);
     return;
  }

  var invoice = new Invoice({
    refNo: req.body.refNo,
    buyerName: req.body.buyerName,
    imagePath: "uploadedFiles\\"+req.file.filename,
    fileName: req.file.originalname,
    contentType: req.file.mimetype
  });
  console.log("Save tobe invoked");
  invoice.save(function(err) {
    console.log("Inside processed block : "+err);
    if (err) {
      return next(err);
    }
    res.send(200);
  });
});
// End of Invoice Rest API Service


app.post('/api/login', passport.authenticate('local'), function(req, res) {
  res.cookie('user', JSON.stringify(req.user));
  res.send(req.user);
});

app.post('/api/signup', function(req, res, next) {
  var user = new User({
    email: req.body.email,
    password: req.body.password
  });
  user.save(function(err) {
    if (err) return next(err);
    res.send(200);
  });
});

app.get('/api/logout', function(req, res, next) {
  req.logout();
  res.send(200);
});

app.get('*', function(req, res) {
  res.redirect('/#' + req.originalUrl);
});

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


/*
agenda.define('send email alert', function(job, done) {
  Show.findOne({ name: job.attrs.data }).populate('subscribers').exec(function(err, show) {
    var emails = show.subscribers.map(function(user) {
      return user.email;
    });

    var upcomingEpisode = show.episodes.filter(function(episode) {
      return new Date(episode.firstAired) > new Date();
    })[0];

    var smtpTransport = nodemailer.createTransport('SMTP', {
      service: 'SendGrid',
      auth: { user: 'hslogin', pass: 'hspassword00' }
    });

    var mailOptions = {
      from: 'Fred Foo ✔ <foo@blurdybloop.com>',
      to: emails.join(','),
      subject: show.name + ' is starting soon!',
      text: show.name + ' starts in less than 2 hours on ' + show.network + '.\n\n' +
        'Episode ' + upcomingEpisode.episodeNumber + ' Overview\n\n' + upcomingEpisode.overview
    };

    smtpTransport.sendMail(mailOptions, function(error, response) {
      console.log('Message sent: ' + response.message);
      smtpTransport.close();
      done();
    });
  });
});

agenda.start();

agenda.on('start', function(job) {
  console.log("Job %s starting", job.attrs.name);
});

agenda.on('complete', function(job) {
  console.log("Job %s finished", job.attrs.name);
});*/



app.listen(app.get('port'), function() {
  console.log('Express server listening on port ' + app.get('port'));
});

