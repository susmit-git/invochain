
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

//var ethWeb3 = new Web3(new Web3.providers.HttpProvider("http://localhost:8545"));
var ethWeb3 = new Web3(new Web3.providers.HttpProvider("http://ethinvlab.southeastasia.cloudapp.azure.com:8545"));

function checkEthereumConnection(){
  try{
  var accountCount = ethWeb3.eth.accounts.length;
  console.log("Ethereum connection successful. \n Total Ethereum Account Count: "+ accountCount);

  console.log("First Ethereum Account: "+ ethWeb3.eth.accounts[0]);

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
var Invoice = mongoose.model('Invoice', invoiceSchema);
//mongoose.connect('localhost');
//mongoose.connect('mongodb://localhost:27017/invoicechaindb');
mongoose.connect('mongodb://127.0.0.1:27017/invoicechaindb');

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
app.get('/api/bc/status', function(req, res, next) {
  //0x63019067023feb11683c74b5a9d2d2a3df11f1d1
  var bcStatus=checkEthereumConnection();
  if(bcStatus==true){
    res.send({status:checkEthereumConnection(),total_accounts:ethWeb3.eth.accounts.length,primary_account:ethWeb3.eth.accounts[0]});
  }
  else{
    res.send({status:bcStatus});
  }
  
});

// Service to get the ethereum account balance
app.get('/api/bc/balance/:actAddress', function(req, res, next) {
  console.log("Fetching Ethereum account balance by id");
  // var abiDef = "[ { \"constant\": false, \"inputs\": [ { \"name\": \"candidate\", \"type\": \"bytes32\" } ], \"name\": \"registerCandidate\", \"outputs\": [], \"payable\": false, \"type\": \"function\" }, { \"constant\": true, \"inputs\": [ { \"name\": \"user\", \"type\": \"address\" } ], \"name\": \"getRemainingTokensByVoter\", \"outputs\": [ { \"name\": \"\", \"type\": \"uint256\" } ], \"payable\": false, \"type\": \"function\" }, { \"constant\": true, \"inputs\": [], \"name\": \"isCommenced\", \"outputs\": [ { \"name\": \"\", \"type\": \"uint256\" } ], \"payable\": false, \"type\": \"function\" }, { \"constant\": true, \"inputs\": [], \"name\": \"getAllCandidates\", \"outputs\": [ { \"name\": \"\", \"type\": \"bytes32[]\" } ], \"payable\": false, \"type\": \"function\" }, { \"constant\": true, \"inputs\": [ { \"name\": \"\", \"type\": \"uint256\" } ], \"name\": \"candidates\", \"outputs\": [ { \"name\": \"\", \"type\": \"bytes32\" } ], \"payable\": false, \"type\": \"function\" }, { \"constant\": true, \"inputs\": [ { \"name\": \"\", \"type\": \"address\" } ], \"name\": \"voterDetails\", \"outputs\": [ { \"name\": \"voterCode\", \"type\": \"address\" }, { \"name\": \"tokensOwned\", \"type\": \"uint256\" } ], \"payable\": false, \"type\": \"function\" }, { \"constant\": false, \"inputs\": [], \"name\": \"purchase\", \"outputs\": [ { \"name\": \"\", \"type\": \"uint256\" } ], \"payable\": true, \"type\": \"function\" }, { \"constant\": true, \"inputs\": [], \"name\": \"isRegistrationClosed\", \"outputs\": [ { \"name\": \"\", \"type\": \"uint256\" } ], \"payable\": false, \"type\": \"function\" }, { \"constant\": true, \"inputs\": [ { \"name\": \"\", \"type\": \"bytes32\" } ], \"name\": \"votesReceived\", \"outputs\": [ { \"name\": \"\", \"type\": \"uint256\" } ], \"payable\": false, \"type\": \"function\" }, { \"constant\": true, \"inputs\": [], \"name\": \"totalTokens\", \"outputs\": [ { \"name\": \"\", \"type\": \"uint256\" } ], \"payable\": false, \"type\": \"function\" }, { \"constant\": true, \"inputs\": [], \"name\": \"tokenPrice\", \"outputs\": [ { \"name\": \"\", \"type\": \"uint256\" } ], \"payable\": false, \"type\": \"function\" }, { \"constant\": true, \"inputs\": [ { \"name\": \"candidate\", \"type\": \"bytes32\" } ], \"name\": \"getCandidateIndex\", \"outputs\": [ { \"name\": \"\", \"type\": \"uint256\" } ], \"payable\": false, \"type\": \"function\" }, { \"constant\": false, \"inputs\": [ { \"name\": \"_title\", \"type\": \"bytes32\" } ], \"name\": \"changeElectionTitle\", \"outputs\": [], \"payable\": false, \"type\": \"function\" }, { \"constant\": false, \"inputs\": [ { \"name\": \"candidate\", \"type\": \"bytes32\" }, { \"name\": \"totalTokens\", \"type\": \"uint256\" } ], \"name\": \"vote\", \"outputs\": [ { \"name\": \"\", \"type\": \"uint256\" } ], \"payable\": false, \"type\": \"function\" }, { \"constant\": false, \"inputs\": [ { \"name\": \"account\", \"type\": \"address\" } ], \"name\": \"transferTo\", \"outputs\": [], \"payable\": false, \"type\": \"function\" }, { \"constant\": true, \"inputs\": [ { \"name\": \"candidate\", \"type\": \"bytes32\" } ], \"name\": \"getVoteCount\", \"outputs\": [ { \"name\": \"\", \"type\": \"uint256\" } ], \"payable\": false, \"type\": \"function\" }, { \"constant\": false, \"inputs\": [ { \"name\": \"_newOwner\", \"type\": \"address\" } ], \"name\": \"changeOwner\", \"outputs\": [], \"payable\": false, \"type\": \"function\" }, { \"constant\": true, \"inputs\": [ { \"name\": \"user\", \"type\": \"address\" } ], \"name\": \"getVoterDetails\", \"outputs\": [ { \"name\": \"\", \"type\": \"uint256\" }, { \"name\": \"\", \"type\": \"uint256[]\" } ], \"payable\": false, \"type\": \"function\" }, { \"constant\": true, \"inputs\": [], \"name\": \"electionTitle\", \"outputs\": [ { \"name\": \"\", \"type\": \"bytes32\" } ], \"payable\": false, \"type\": \"function\" }, { \"constant\": true, \"inputs\": [], \"name\": \"balanceTokens\", \"outputs\": [ { \"name\": \"\", \"type\": \"uint256\" } ], \"payable\": false, \"type\": \"function\" }, { \"constant\": true, \"inputs\": [], \"name\": \"getTokensSold\", \"outputs\": [ { \"name\": \"\", \"type\": \"uint256\" } ], \"payable\": false, \"type\": \"function\" }, { \"inputs\": [ { \"name\": \"_candidateNames\", \"type\": \"bytes32[]\" }, { \"name\": \"_title\", \"type\": \"bytes32\" }, { \"name\": \"_tokens\", \"type\": \"uint256\" }, { \"name\": \"_pricePerToken\", \"type\": \"uint256\" } ], \"payable\": false, \"type\": \"constructor\" }, { \"anonymous\": false, \"inputs\": [ { \"indexed\": false, \"name\": \"_eventTimeStamp\", \"type\": \"uint256\" }, { \"indexed\": false, \"name\": \"_owner\", \"type\": \"address\" }, { \"indexed\": false, \"name\": \"_electionTitle\", \"type\": \"bytes32\" }, { \"indexed\": false, \"name\": \"_totalTokens\", \"type\": \"uint256\" } ], \"name\": \"GeneralElectionOwnerAssigned\", \"type\": \"event\" }, { \"anonymous\": false, \"inputs\": [ { \"indexed\": false, \"name\": \"_eventTimeStamp\", \"type\": \"uint256\" }, { \"indexed\": false, \"name\": \"_voter\", \"type\": \"address\" }, { \"indexed\": false, \"name\": \"_purchasedTokens\", \"type\": \"uint256\" } ], \"name\": \"ElectionTokenPurchased\", \"type\": \"event\" }, { \"anonymous\": false, \"inputs\": [ { \"indexed\": false, \"name\": \"_eventTimeStamp\", \"type\": \"uint256\" }, { \"indexed\": false, \"name\": \"_voter\", \"type\": \"address\" }, { \"indexed\": false, \"name\": \"_voteTokens\", \"type\": \"uint256\" }, { \"indexed\": false, \"name\": \"_candidate\", \"type\": \"bytes32\" } ], \"name\": \"ElectionVoteCasted\", \"type\": \"event\" }, { \"anonymous\": false, \"inputs\": [ { \"indexed\": false, \"name\": \"_eventTimeStamp\", \"type\": \"uint256\" }, { \"indexed\": false, \"name\": \"_from\", \"type\": \"address\" }, { \"indexed\": false, \"name\": \"_contractAccount\", \"type\": \"address\" }, { \"indexed\": false, \"name\": \"_to\", \"type\": \"address\" }, { \"indexed\": false, \"name\": \"_value\", \"type\": \"uint256\" } ], \"name\": \"ElectionAmountTransferred\", \"type\": \"event\" }, { \"anonymous\": false, \"inputs\": [ { \"indexed\": false, \"name\": \"_eventTimeStamp\", \"type\": \"uint256\" }, { \"indexed\": false, \"name\": \"_from\", \"type\": \"address\" }, { \"indexed\": false, \"name\": \"_prevTitle\", \"type\": \"bytes32\" }, { \"indexed\": false, \"name\": \"_newTitle\", \"type\": \"bytes32\" } ], \"name\": \"ElectionTitleChanged\", \"type\": \"event\" }, { \"anonymous\": false, \"inputs\": [ { \"indexed\": false, \"name\": \"_eventTimeStamp\", \"type\": \"uint256\" }, { \"indexed\": false, \"name\": \"_from\", \"type\": \"address\" }, { \"indexed\": false, \"name\": \"_candidateName\", \"type\": \"bytes32\" } ], \"name\": \"ElectionRegisterCandidate\", \"type\": \"event\" }, { \"anonymous\": false, \"inputs\": [ { \"indexed\": false, \"name\": \"_eventTimeStamp\", \"type\": \"uint256\" }, { \"indexed\": false, \"name\": \"_data\", \"type\": \"bytes32\" }, { \"indexed\": false, \"name\": \"value\", \"type\": \"uint256\" } ], \"name\": \"ElectionDebuggingLog\", \"type\": \"event\" } ]";
  // var gc=objWeb3.eth.contract(JSON.parse(abiDef)).at("0xc53b26e14d2678040f89ffee9bacdb5f1e7199a2");
  //  var callData=gc.getTokensSold.call();
  //  console.log(callData);
  //  console.log(callData.c[0]);

  //0x63019067023feb11683c74b5a9d2d2a3df11f1d1

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

app.listen(app.get('port'), function() {
  console.log('Express server listening on port ' + app.get('port'));
});

