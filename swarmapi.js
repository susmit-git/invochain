
const swarm = require("swarm-js").at("http://localhost:8500");
//const swarm = require("swarm-js").at("http://swarm-gateways.net");

const path = require("path");
const fs = require("fs");

var bitcore = require('bitcore-lib');
var ECIES = require('bitcore-ecies');

var privKeyBuf=Buffer.from('df18c0c204ecf5ce2148892d734269c81c4b731985cc3519feeb14000dd3b191','hex');


function createEncryptedFileInSwarm(filePath){
    var data = fs.readFileSync(filePath);
    console.log('File read from disk');

    var encData=encryptData(data);
    
    fs.writeFileSync("./sampleimages/downloads/enc-abc2.gif",encData);
    console.log('Encrypted file is now created');
    
    createFileInSwarm("./sampleimages/downloads/enc-abc2.gif");
    console.log('File is now uploaded in Swarm');

    return data;
}

function downloadFileFromSwarm(fileHash,fileName){
    swarm.download(fileHash).then(buffer => {
        
        console.log("Downloaded file:",buffer.undefined.type);

        var decData = decryptData(buffer.undefined.data);
        console.log("The file is now decrypted");

        fs.writeFile("./sampleimages/downloads/"+fileName,decData, function(err) {
            if(err) {
                return console.log(err);
            }

            console.log("The decrypted file was saved!");
        });
    });
}

function encryptData(data){
    var privKey = new bitcore.PrivateKey(privKeyBuf.toString('hex'));

    var pubKey=  new bitcore.PublicKey.fromPrivateKey(privKey);

    var alice = ECIES().privateKey(privKey).publicKey(new bitcore.PublicKey(pubKey.toString('hex')));

    var encrypted = alice.encrypt(data);

    console.log('Data is now encrypted');

    return encrypted;
}

function decryptData(data){
    var privKey = new bitcore.PrivateKey(privKeyBuf.toString('hex'));

    var alice = ECIES().privateKey(privKey);

    var decrypted = alice.decrypt(data);

    console.log('File is now decrypted');

    return decrypted;
}

function createFileInSwarm(filePath){
    swarm.upload({
    path: path.join(__dirname,filePath),
    kind: "file"}) // could be "file", "data" or "directory"
    .then(hash => {
        console.log("Uploaded file address:", hash);
    })
    .catch(console.log);
    
}

//createEncryptedFileInSwarm('./sampleimages/downloads/abc.gif');
//downloadFileFromSwarm('ef3b4567902bd7b581917913abe3e3d038552784d571f15557284c539dfbab30');
//downloadFileFromSwarm('210c258bd199def1524462642e98464bf383731257bf43f775afc5251b7c69af','dec-abc.gif');
//d675676eba739d520d59bbe36893aebfd091feaabd7bba3f2d69ab9ebec05d12
//4e3149a4c7ab1cf21324280a5bacb5a34eed5a7854b30f8d720c999ebdd180a4
downloadFileFromSwarm('6e231412a89e7be6d75965d786c092501170f9ef6f4c8d490b0a28afe9a473c6','dec-abc.gif');


/*
swarm.upload(new Buffer("test"))
  .then(console.log)
  .catch(console.log);


const hash = "c9a99c7d326dcc6316f32fe2625b311f6dc49a175e6877681ded93137d3569e7";

swarm.download(hash)
  .then(buffer => console.log(buffer.toString()))
  .catch(console.log);



swarm.upload({
  path: path.join(__dirname,"./sampleimages/invoice1.gif"),
  kind: "file"}) // could be "file", "data" or "directory"
  .then(console.log)
  .catch(console.log);
// ef3b4567902bd7b581917913abe3e3d038552784d571f15557284c539dfbab30


// The hash of the DApp we uploaded on the other example.
//const exampleDAppHash = "379d2791624c3e3719bb28f7bfa362cc9c726ec06482b5800c8e3cefaf2b7bcf";
const exampleDAppHash = "ef3b4567902bd7b581917913abe3e3d038552784d571f15557284c539dfbab30";
const targetDirPath = path.join(__dirname,"./sampleimages/downloads/abc.gif");

swarm.download(exampleDAppHash, targetDirPath)
  .then(dirPath => console.log(`Downloaded DApp to ${dirPath}.`))
  .catch(console.log);
*/


// Downloading raw data
//const fileHash = "ef3b4567902bd7b581917913abe3e3d038552784d571f15557284c539dfbab30";

//swarm.download(fileHash).then(buffer => {
//swarm.download(fileHash).then(buffer => {
 //console.log("Downloaded file:",JSON.stringify(buffer));

 //console.log("Downloaded file:",buffer.undefined.type);
 //console.log("Downloaded file:",buffer.undefined.data);

/*var wstream = fs.createWriteStream('./sampleimages/downloads/abc.gif');
wstream.write(buffer.undefined.data);
// create another Buffer of 100 bytes and write
wstream.write(crypto.randomBytes(100));
wstream.end();
*/

 /*
 fs.writeFile("./sampleimages/downloads/abc.gif",buffer.undefined.data, function(err) {
    if(err) {
        return console.log(err);
    }

    console.log("The file was saved!");
});*/

/*

var stream = fs.createWriteStream("./sampleimages/downloads/abc.gif");
stream.once('open', function(fd) {
  stream.write(buffer);
  stream.end();
});


fs.open('./sampleimages/downloads/abc.gif', 'w', function(err, fd) {
    if (err) {
        throw 'error opening file: ' + err;
    }

    console.log("Lets see: "+ buffer);

    fs.write(fd, buffer, 0, buffer.length, null, function(err) {
        
        console.log("Lets see: "+ fd);

        if (err) throw 'error writing file: ' + err;
        fs.close(fd, function() {
            console.log('file written');
        })
    });
});*/

//});
