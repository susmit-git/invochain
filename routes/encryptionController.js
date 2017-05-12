
var ethUtils = require('ethereumjs-util'); 
var bitcore = require('bitcore-lib');
var ECIES = require('bitcore-ecies');

function testEncryption(){
        var privKeyBuf=Buffer.from('df18c0c204ecf5ce2148892d734269c81c4b731985cc3519feeb14000dd3b191','hex');

        var pubKey=ethUtils.privateToPublic(privKeyBuf).toString('hex');

        console.log('Pub Key: '+ pubKey.toString('hex'));

        var privKey = new bitcore.PrivateKey(privKeyBuf.toString('hex'));

        var pubKey=  new bitcore.PublicKey.fromPrivateKey(privKey);

        //var alice = ECIES().privateKey(privKey).publicKey(new bitcore.PublicKey(testIdentity.publicKey.toString('hex')));

        var alice = ECIES().privateKey(privKey).publicKey(new bitcore.PublicKey(pubKey.toString('hex')));

        var message="Lets see what happens";

        var encrypted = alice.encrypt(message);

        console.log('Encrypted: '+ encrypted.toString('hex'));
        
        var alice = ECIES().privateKey(privKey);

        var decrypted = alice.decrypt(encrypted);

        console.log('Decrypted: '+ decrypted.toString('hex'));

        var data={encryptedData:encrypted.toString('hex'), decryptedDate:decrypted.toString('ascii')};

        return data;
}

// Provides the test encryption functionality
exports.testEncryption = function(req, res, next) {
    var data=testEncryption();
    res.send(data);
};