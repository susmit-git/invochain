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
var solc = require('solc');
var router = express.Router();
var ethWeb3 = null;
var userContractInstance = null;
var defaultAppAdminAccount=null;
var defaultPwd="password1234";
var ethUtils = require('ethereumjs-util'); 
var hexUtil = require('ethjs-util');
var keythereum = require("keythereum");
var bitcore = require('bitcore-lib');
var ECIES = require('bitcore-ecies');
var datadir = "ethdata";

var session = require('express-session');
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;

var encryptionController = require('./encryptionController')

var userContractName=":UserRegistrationService";
var userContractAddress=     "0x68d19a9cd995e1c4fd3428a9e9b651104c9fd8a2";

//var async = require('async');
//var request = require('request');
//var xml2js = require('xml2js');
var _ = require('lodash');

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


var userSchema = new mongoose.Schema({
  email: { type: String, unique: true },
  password: String
});

var invoiceSchema = new mongoose.Schema({
  refNo: String,
  buyerName: String,
  imagePath: String,
  fileName: String,
  contentType: String,
  creationDate: Date
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

function initializeEthereumConnection(){
  ethWeb3 = new Web3(new Web3.providers.HttpProvider("http://ethinvlab.southeastasia.cloudapp.azure.com:8545"));

  //var web3IPC = new Web3(new Web3.providers.IpcProvider(gethIPCPath, require('net')));

  try{
    console.log("Is Ethereum connected: "+ ethWeb3.isConnected());

    var accountCount = ethWeb3.eth.accounts.length;
    console.log("Total Ethereum Account Count: "+ accountCount);

    console.log("First Ethereum Account: "+ ethWeb3.eth.accounts[0]);

  }catch(e){
    console.log("Error in Ethereum node connection");
  }

  defaultAppAdminAccount = ethWeb3.eth.accounts[1];
  console.log("App Ethereum Account assigned: "+defaultAppAdminAccount);

  return initializeContracts();
}

function checkEthereumConnection(){
    if(ethWeb3.isConnected()==true){
        console.log("Ethereum connection is active.");
        return true;
    }

    return false;
}

function initializeContracts(){
    if(ethWeb3.isConnected()==false){
        console.log("No Ethereum Connection");
        return false;
    }  
    console.log("Ethereum Connection Successful");
    var input = fs.readFileSync('contracts/UserRegistrationService.sol');
    var output = solc.compile(input.toString(), 1);

    var bytecode = output.contracts[userContractName].bytecode;
    console.log("Got bytecode");
    var abi = JSON.parse(output.contracts[userContractName].interface);
    console.log("Got Abi");   
    var contract = ethWeb3.eth.contract(abi);

    userContractInstance =  contract.at(userContractAddress)  
    console.log("Contract instanciated from: "+userContractAddress);   

    return true;
}

function unlockAccount(addrAccount, strPwd){
  if(ethWeb3.isConnected()==false){
        console.log("No Ethereum Connection");
        return false;
  } 

  if(strPwd==undefined || strPwd==''){
    console.log('Passphrase cannot be blank!');
    return false;
  }

  if(addrAccount!=undefined && addrAccount!=null){
    var state=ethWeb3.personal.unlockAccount(addrAccount, strPwd, 1000);
    console.log('Account unlock state: '+ state);
    return state;
  }

  return false; 
}

function findPrivateKey(){
    if(ethWeb3.isConnected()==false){
        console.log("No Ethereum Connection");
        return '';
    }

    console.log("fetcihing the key object");

    // Synchronous
    var keyObject = keythereum.importFromFile(defaultAppAdminAccount, datadir);

    console.log("key object fetcjed: "+ keyObject);
    // synchronous
    //var privateKey = keythereum.recover(defaultPwd, keyObject);
    var privateKey = keythereum.recover(defaultPwd, keyObject);

    //var str=arrayBufferToString(privateKey);
    var str=privateKey.toString('hex');
    console.log("Plain Private Key: "+ privateKey.toString('hex'));

    return str;
}

function createNewAccount(){
    var password = defaultPwd;
    var kdf = "pbkdf2"; // or "scrypt" to use the scrypt kdf
    var filestore=datadir+"/keystore";
    

    var params = { keyBytes: 32, ivBytes: 16 };
    var dk = keythereum.create(params);
    var strPvtKey=dk.privateKey.toString('hex');
    console.log("Pvt Key: "+ strPvtKey);

    var options = {kdf: "pbkdf2",  cipher: "aes-128-ctr",  kdfparams: {c: 262144, dklen: 32, prf: "hmac-sha256"}};

    var keyObject = keythereum.dump(password, dk.privateKey, dk.salt, dk.iv, options);

    console.log("Address: "+ keyObject.address);
    console.log("Id: "+ keyObject.id);

    keythereum.exportToFile(keyObject,filestore);


    return {address:keyObject.address,privateKey:strPvtKey};
}

function exportAccount(){
    var password = defaultPwd;
    var kdf = "pbkdf2"; // or "scrypt" to use the scrypt kdf

    // asynchronous
    //keythereum.dump(password, dk.privateKey, dk.salt, dk.iv, options);

    keythereum.exportToFile(keyObject)
}



router.get('/api/bc/unlockaccount', function(req, res, next) {
    console.log("Unlocking Account");
    var status=unlockAccount(defaultAppAdminAccount, defaultPwd);
    res.send({unlockStatus:status});
});

router.get('/api/bc/createaccount', function(req, res, next) {
    console.log("Creating Account");
    var accData=createNewAccount();
    res.send(accData);
});

router.get('/api/bc/findprivatekey', function(req, res, next) {
    console.log("finding private key");
    var pkey=findPrivateKey();
    res.send({privatekey:pkey});
});

// Start of Invoice Rest API Service
router.get('/api/invoices', function(req, res, next) {
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

router.get('/api/invoices/:id', function(req, res, next) {
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
router.get('/api/bc/status', function(req, res, next) {
  //0x63019067023feb11683c74b5a9d2d2a3df11f1d1
  var bcStatus=checkEthereumConnection();
  if(bcStatus==true){

    var netid=ethWeb3.version.network;
    var peerCount=ethWeb3.net.peerCount;
    console.log('This is the network id: '+ netid);
    res.send({status:checkEthereumConnection(),total_accounts:ethWeb3.eth.accounts.length,primary_account:ethWeb3.eth.accounts[0],network_id:netid,peer_count:peerCount});
    
  }
  else{
    res.send({status:bcStatus});
  }
  
});

// Service to get the ethereum account balance
router.get('/api/bc/balance/:actAddress', function(req, res, next) {
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

router.post('/api/invoice', upload.single('invoiceImage'), function(req, res, next) {
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
  console.log("****************** Data Creation Date : "  + req.body.creationDate);
  


  var strRefNo  =req.body.refNo;
  var strbuyerName  =req.body.buyerName;
  var strCreationDate  =req.body.creationDate;
  

  if(strRefNo==undefined){
     res.send(400);
     return;
  }

  var invoice = new Invoice({
    refNo: req.body.refNo,
    buyerName: req.body.buyerName,
    imagePath: "uploadedFiles\\"+req.file.filename,
    fileName: req.file.originalname,
    contentType: req.file.mimetype,
    creationDate: strCreationDate
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


router.post('/api/login', passport.authenticate('local'), function(req, res) {
  res.cookie('user', JSON.stringify(req.user));
  res.send(req.user);
});

router.post('/api/signup', function(req, res, next) {
  var user = new User({
    email: req.body.email,
    password: req.body.password
  });
  user.save(function(err) {
    if (err) return next(err);
    res.send(200);
  });
});

function transferAmount(){
    if(ethWeb3.isConnected()==false){
        console.log("No Ethereum Connection");
        return '';
    }  
    console.log("Ethereum Connection Successful");

    var tx=ethWeb3.eth.sendTransaction(
    {
        from: defaultAppAdminAccount,
        value:ethWeb3.toWei('2','ether'),
        to: '0x08ce4bc435b28b1868cf08df5a1bb72ff19a1a66',
        data: '0x0000000000000000000000000000000000000000'
    });

    console.log("Data: "+ JSON.stringify(tx));

    return tx;
}

function viewTransaction(txHash) {
  if(ethWeb3.isConnected()==false){
        console.log("No Ethereum Connection");
        return '';
  }  

  console.log("Transaction : "+ txHash);

  var tx = ethWeb3.eth.getTransaction(txHash);
  if (tx != null) {
    console.log("  tx hash          : " + tx.hash + "\n"
      + "   nonce           : " + tx.nonce + "\n"
      + "   blockHash       : " + tx.blockHash + "\n"
      + "   blockNumber     : " + tx.blockNumber + "\n"
      + "   transactionIndex: " + tx.transactionIndex + "\n"
      + "   from            : " + tx.from + "\n" 
      + "   to              : " + tx.to + "\n"
      + "   value           : " + tx.value + "\n"
      + "   gasPrice        : " + tx.gasPrice + "\n"
      + "   gas             : " + tx.gas + "\n"
      + "   input           : " + tx.input);
  }

  return tx;
}

function viewBlock(blockNo) {
  if(ethWeb3.isConnected()==false){
        console.log("No Ethereum Connection");
        return '';
  }  

  console.log("Block : "+ blockNo);

  var block=ethWeb3.eth.getBlock(blockNo);

  console.log("Block number     : " + block.number + "\n"
    + " hash            : " + block.hash + "\n"
    + " parentHash      : " + block.parentHash + "\n"
    + " nonce           : " + block.nonce + "\n"
    + " sha3Uncles      : " + block.sha3Uncles + "\n"
    + " logsBloom       : " + block.logsBloom + "\n"
    + " transactionsRoot: " + block.transactionsRoot + "\n"
    + " stateRoot       : " + block.stateRoot + "\n"
    + " miner           : " + block.miner + "\n"
    + " difficulty      : " + block.difficulty + "\n"
    + " totalDifficulty : " + block.totalDifficulty + "\n"
    + " extraData       : " + block.extraData + "\n"
    + " size            : " + block.size + "\n"
    + " gasLimit        : " + block.gasLimit + "\n"
    + " gasUsed         : " + block.gasUsed + "\n"
    + " timestamp       : " + block.timestamp + "\n"
    + " transactions    : " + block.transactions + "\n"
    + " uncles          : " + block.uncles);
    if (block.transactions != null) {
     // console.log("--- transactions ---");
     // block.transactions.forEach( function(e) {
     //   printTransaction(e);
      //})
    }

    return block;
}

router.get('/api/bc/transfer', function(req, res, next) {
    console.log("Transfer Amount Invoked");
    var addr=transferAmount();
    res.send({tx:addr});
});

router.get('/api/bc/viewTransaction/:txHash', function(req, res, next) {
    console.log("View Transaction Details");
    var data=viewTransaction(req.params.txHash);
    res.send(data);
});

router.get('/api/bc/viewBlock/:blockNo', function(req, res, next) {
    console.log("View Block Details");
    var data=viewBlock(req.params.blockNo);
    res.send(data);
});


router.get('/api/bc/verifysig', function(req, res, next) {
    console.log("Verifysig Invoked");
    var addr=verifySignature();
    res.send({address:addr});
});

router.get('/api/bc/adduser', function(req, res, next) {
    console.log("Add User Invoked");
    var status=addUser();
    res.send({addUserStatus:status});
});

function verifySignature(){
    //var sgn='0x2562ea1d0af170b7be821b53b9ea2a69d39681d87adc51093702072ef18b24b9302407ea985a7cc7bec6567ba1d8ba2def3dffb29df22c756edeeb392dee0be31b';

    console.log("Split in progress: "+defaultAppAdminAccount);

    var msgHashHex = ethWeb3.sha3('my test message');
    
    console.log("Message hex: "+ msgHashHex);

    var message=new Buffer(hexUtil.stripHexPrefix(msgHashHex), 'hex');
    var adr="";

    console.log("Message buffer: "+ message.toString('hex'));

    var privkeyBuffer = Buffer.from(message, 'hex');

    var vrs=ethUtils.ecsign(message, privkeyBuffer);

    console.log("Msg Signature: "+ vrs);

    var pubkey = ethUtils.ecrecover(message, vrs.v, vrs.r, vrs.s);
    console.log("Msg pubkey: "+ pubkey.toString('hex'));

    console.log("Msg Orig pubkey: "+ ethUtils.privateToPublic(privkeyBuffer).toString('hex'));

    return pubkey.toString('hex');
}

function addUser(email, pwd, userName){
    if(ethWeb3.isConnected()==false){
        console.log("No Ethereum Connection");
        return false;
    }
    console.log("Ethereum Connection Successful");
    
    if(userContractInstance==undefined || userContractInstance==null){
        console.log("No Contract Instance found");
        return false;
    }

    console.log("Contract Instance Found");
    
    var status=unlockAccount(defaultAppAdminAccount, defaultPwd);

    if(status!=true){
      console.log("Account couldn't be unlocked!");
      return false;
    }


    userContractInstance.addUser(defaultAppAdminAccount, "c@c.com", "Test User 2", 
        "changeme", {gas: 240000, from: defaultAppAdminAccount}, (err, res) =>{
        console.log('tx: ' + res);
        var curTrans=ethWeb3.eth.getTransaction(res);

        console.log("Transaction no : "+ curTrans);
        if(curTrans!=undefined){
            var bcNo=curTrans.blockNumber;
            console.log("Block no : "+bcNo);
        }

    });

    return true;
}

function verifySignature2(){
    if(ethWeb3.isConnected()==false){
        console.log("No Ethereum Connection");
        return false;
    }
    console.log("Ethereum Connection Successful");

    var state=ethWeb3.personal.unlockAccount(defaultAppAdminAccount, defaultPwd, 1000);
    console.log('Account used: '+ defaultAppAdminAccount);
    console.log('Account unlock state: '+ state);

    const msg = new Buffer('This is my test data');
    const sig = ethWeb3.eth.sign(defaultAppAdminAccount, '0x' + msg.toString('hex'));
    const res = ethUtils.fromRpcSig(sig);

    const prefix = new Buffer("\x19Ethereum Signed Message:\n");
    const prefixedMsg = ethUtils.sha3(
    Buffer.concat([prefix, new Buffer(String(msg.length)), msg])
    );

    const pubKey  = ethUtils.ecrecover(prefixedMsg, res.v, res.r, res.s);
    const addrBuf = ethUtils.pubToAddress(pubKey);
    const addr    = ethUtils.bufferToHex(addrBuf);

    console.log(defaultAppAdminAccount,  addr);

    return addr;
}


/* GET request for creating a Book. NOTE This must come before routes that display Book (uses id) */
router.get('/api/bc/testencryption', encryptionController.testEncryption);

router.get('/api/bc/verifysig2', function(req, res, next) {
  var addr=verifySignature2();
  res.send({sigAddress:addr});
});

router.get('/api/logout', function(req, res, next) {
  req.logout();
  res.send(200);
});

router.get('*', function(req, res) {
  res.redirect('/#' + req.originalUrl);
});

initializeEthereumConnection();

module.exports = router;