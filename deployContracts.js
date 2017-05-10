
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
var userContractInstance = null;

var userContractName=":UserRegistrationService";
var userContractAddress= "0xa8aeed490d6f3257e2a3030fc34d728a1a820ba4";
userContractAddress=     "0x9ecbc715b39eb13747b440c70ffbc5c73afc740c";
userContractAddress=     "0x361a65149a6e1b0b93ee0884bd10b09e2a6b7fe7";
userContractAddress=     "0x8a9a2d9849235684098d1432a84b4b3cc095a665";
userContractAddress=     "0xbc5b727864a1783890c84e5a28fae4b2b03d2442";
userContractAddress=     "0x68d19a9cd995e1c4fd3428a9e9b651104c9fd8a2";

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

function deployUserRegistrationContract(){
    if(ethWeb3.isConnected()==false){
        console.log("No Ethereum Connection");
        return;
    }  
    console.log("Ethereum Connection Successful");
    var input = fs.readFileSync('contracts/UserRegistrationService.sol');
    
    console.log("Contract copilation in progress");
    
	var output = solc.compile(input.toString(), 1);

    console.log("Contract Deployment Initiated for: "+userContractName);


    var bytecode = output.contracts[userContractName].bytecode;
    console.log("Got bytecode");
    var abi = JSON.parse(output.contracts[userContractName].interface);
    console.log("Got Abi");   
    var contract = ethWeb3.eth.contract(abi);
    console.log("Got Contract using ABI");   

    //unlockAccount(ethWeb3.eth.accounts[1]);

    console.log("Invoked Deployment");   

    userContractInstance = contract.new({
          data: '0x' + bytecode,
          from: ethWeb3.eth.accounts[1],
          gas: 90000*10
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
              userContractAddress= res.address;
          }
          
      });
}


function initializeContracts(){
    if(ethWeb3.isConnected()==false){
        console.log("No Ethereum Connection");
        return;
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
}

function addUser(){
    if(ethWeb3.isConnected()==false){
        console.log("No Ethereum Connection");
        return;
    }
    console.log("Ethereum Connection Successful");
    
    if(userContractInstance==undefined || userContractInstance==null){
        console.log("No Contract Instance found");
        return;
    }

    console.log("Contract Instance Found");

     userContractInstance.addUser(ethWeb3.eth.accounts[1], "b@b.com", "Test User 1", 
        "changeme", {gas: 240000, from: ethWeb3.eth.accounts[1]}, (err, res) =>{
        console.log('tx: ' + res);
        var curTrans=ethWeb3.eth.getTransaction(res);

        console.log("Transaction no : "+ curTrans);
        if(curTrans!=undefined){
            var bcNo=curTrans.blockNumber;
            console.log("Block no : "+bcNo);
        }

    });
}

function getUser(){
    if(ethWeb3.isConnected()==false){
        console.log("No Ethereum Connection");
        return;
    }
    console.log("Ethereum Connection Successful");
    
    if(userContractInstance==undefined || userContractInstance==null){
        console.log("No Contract Instance found");
        return;
    }
    console.log("Contract Instance Found");
    
    userContractInstance.getUser.call(ethWeb3.eth.accounts[1], (err, res) =>{
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
    
    if(userContractInstance==undefined || userContractInstance==null){
        console.log("No Contract Instance found");
        return;
    }
    console.log("Contract Instance Found");
    
    var event = userContractInstance.UserRegDebuggingLog( {}, {fromBlock: 0, toBlock: 'latest'});
    event.watch(function(error, response)
    {  
        var data=" Debug : " + hexToAscii(response.args._data) +":"+ response.args._user;
        console.log(data);

    });

}

function deployContracts(){
     deployUserRegistrationContract();
}

function testContracts(mode){
     initializeContracts();

     if(mode=='ADD'){
        addUser();
        trackEvents();
     }
     else if(mode=='LIST'){
        getUser();
        trackEvents();
     }
     else if(mode=='EVENTS'){
        trackEvents();
    }
}

initializeEthereumConnection();
//deployContracts();
//testContracts('ADD');
//testContracts('LIST');
testContracts('EVENT');
