
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
const solc = require('solc');
var documentContractInstance = null;
var documentContractInstance = null;

var documentContractName = ":DocumentManagementService";
var documentContractAddress = "0x8965b52aadbe2fa88bebb9940b6e0eee52e1f468";
documentContractAddress = "0xa38f9a968deda699c83454670ef31f4cb2a41957";

var ethWeb3 = null;

function initializeEthereumConnection(){
  ethWeb3 = new Web3(new Web3.providers.HttpProvider("http://ethinvlab.southeastasia.cloudapp.azure.com:8545"));

  //var web3IPC = new Web3(new Web3.providers.IpcProvider(gethIPCPath, require('net')));

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

function hexToAscii(str1)
{
	var hex  = str1.toString();
	var str = '';
	for (var n = 0; n < hex.length; n += 2) {
		str += String.fromCharCode(parseInt(hex.substr(n, 2), 16));
	}
	return str;
}


function unlockAccount(acAddress){
  var strPwd="password1234";

  console.log("Account "+ acAddress +" unlocking in process");  
  
  if(acAddress!=undefined && acAddress!=null){
    var state=ethWeb3.personal.unlockAccount(acAddress, strPwd, 1000);

    console.log("Account "+ acAddress +" unlocked: "+ state);  

    return state;
  }

  return false; 
}

function deployDocumentManagementContract(){
    if(ethWeb3.isConnected()==false){
        console.log("No Ethereum Connection");
        return;
    }  
    console.log("Ethereum Connection Successful");
    var input = fs.readFileSync('contracts/DocumentManagementService.sol');
    
    console.log("Contract copilation in progress");
    
	var output = solc.compile(input.toString(), 1);

    console.log("Contract Deployment Initiated for: "+documentContractName);

    var bytecode = output.contracts[documentContractName].bytecode;
    console.log("Got bytecode");
    var abi = JSON.parse(output.contracts[documentContractName].interface);
    console.log("Got Abi");   
    var contract = ethWeb3.eth.contract(abi);
    console.log("Got Contract using ABI");   

    unlockAccount(ethWeb3.eth.accounts[1]);

    console.log("Invoked Deployment");   

    documentContractInstance = contract.new({
          data: '0x' + bytecode,
          from: ethWeb3.eth.accounts[1],
          gas: 90000*15
          }, (err, res) => {
          if (err) {
              console.log(err);
              return;
          }

          // Log the tx, you can explore status with eth.getTransaction()
          console.log("Transaction Hash: "+ res.transactionHash);

          // If we have an address property, the contract was deployed
          if (res.address) {
              console.log('Deployed Contract address: ' + res.address);
              documentContractAddress= res.address;
          }
      });
}


function initializeContracts(){
    if(ethWeb3.isConnected()==false){
        console.log("No Ethereum Connection");
        return;
    }  
    console.log("Ethereum Connection Successful");
    var input = fs.readFileSync('contracts/DocumentMAnagementService.sol');
    var output = solc.compile(input.toString(), 1);

    var bytecode = output.contracts[documentContractName].bytecode;
    console.log("Got bytecode");
    var abi = JSON.parse(output.contracts[documentContractName].interface);
    console.log("Got Abi");   
    var contract = ethWeb3.eth.contract(abi);

    documentContractInstance =  contract.at(documentContractAddress)  
    console.log("Contract instanciated from: "+documentContractAddress);   
}

function addDocument(){
    if(ethWeb3.isConnected()==false){
        console.log("No Ethereum Connection");
        return;
    }
    console.log("Ethereum Connection Successful");
    
    if(documentContractInstance==undefined || documentContractInstance==null){
        console.log("No Contract Instance found");
        return;
    }

    console.log("Contract Instance Found");

    unlockAccount(ethWeb3.eth.accounts[1]);

    /*address _userAccount, bytes32 _docNo,
        bytes32 _docType, bytes32 _docHash, bytes32 _fileName, 
        uint _expDate
        */
    var expDate = new Date().getTime(); 
    console.log("Date passed: "+ expDate);

    documentContractInstance.addDocument(ethWeb3.eth.accounts[1], "DOC101", "PASSPORT", 
    "XYZ","USERPASSPORT.JPG",expDate, {gas: 240000*2, from: ethWeb3.eth.accounts[1]}, (err, res) =>{
        console.log('tx: ' + res);
        var curTrans=ethWeb3.eth.getTransaction(res);

        console.log("Transaction no : "+ curTrans);
        if(curTrans!=undefined){
            var bcNo=curTrans.blockNumber;
            console.log("Block no : "+bcNo);
        }

    });
}

function getDocument(){
    if(ethWeb3.isConnected()==false){
        console.log("No Ethereum Connection");
        return;
    }
    console.log("Ethereum Connection Successful");
    
    if(documentContractInstance==undefined || documentContractInstance==null){
        console.log("No Contract Instance found");
        return;
    }
    console.log("Contract Instance Found");
    
    documentContractInstance.getUser.call(ethWeb3.eth.accounts[1], (err, res) =>{
      console.log('Data 1: ' + res[0]); 
      console.log('Data 2: ' + res[1].toString()); 
      console.log('Data 3: ' + res[2].toString()); 
      console.log('Data 4: ' + res[3].toString()); 
      console.log('Data 5: ' + res[4].toString()); 
    });
}

function trackEvents(){
    if(ethWeb3.isConnected()==false){
        console.log("No Ethereum Connection");
        return;
    }
    console.log("Ethereum Connection Successful");
    
    if(documentContractInstance==undefined || documentContractInstance==null){
        console.log("No Contract Instance found");
        return;
    }
    console.log("Contract Instance Found");
    
    var event = documentContractInstance.DocumentDebuggingLog( {}, {fromBlock: 0, toBlock: 'latest'});
    event.watch(function(error, response)
    {  
        var data=" Debug : " + hexToAscii(response.args._data) +":"+ response.args._user;
        console.log(data);

    });

}

function deployContracts(){
     //deployUserRegistrationContract();
     deployDocumentManagementContract();
}

function testContracts(mode){
     initializeContracts();

     if(mode=='ADD'){
        addDocument();
        trackEvents();
     }
     else if(mode=='LIST'){
        getDocument();
        trackEvents();
     }
     else if(mode=='EVENTS'){
        trackEvents();
    }
}

initializeEthereumConnection();
//deployContracts();
testContracts('ADD');
//testContracts('LIST');
//testContracts('EVENT');
