pragma solidity ^0.4.8;


contract DocumentManagementService {
    address public owner;

    struct Document{
        address userAccount;
        bytes32 docNo;
        bytes32 docType;
        DocumentDetail[] documentVersions;
        uint lastUpdate;
        bool isActive;
    }
    
    struct DocumentDetail{
        bytes32 docHash;
        bytes32 fileName;
        uint expDate;
        uint version;
        bool isActive;
    }
    
    

    function kill() onlyOwner{
        //DocumentDebuggingLog(block.timestamp, "DocumentManagementService contract killed.",address(0));
        
		suicide(owner);
    }
	
	modifier onlyOwner{
		if(msg.sender!=owner){
			throw;
		}
		else{
			_;
		}
	}
    
    // Event trigerred for creating document
    event DocumentCreationLog(uint256 indexed _eventTimeStamp, address indexed _userAccount, 
    bytes32 indexed _docNo, bytes32 _docType);
	// Event trigerred for retrieving document
	event RetrieveDocumentLog(uint256 indexed _eventTimeStamp, address indexed _userAccount, 
    bytes32 indexed _docNo, bytes32 _docType);
    // Event trigerred for general debugging
	event DocumentDebuggingLog(uint256 indexed _eventTimeStamp, bytes32 _data, address _user);
	
	mapping(bytes32=>Document) public mapDocuments; // Holds Docno as key 
	mapping(address=>bytes32[]) public mapUserDocNos; // Holds User address as key with valuehaving  array of all document nos
    mapping(bytes32=>uint) public mapDocLatestVersion; // Holds Docno as key with value as latest version number
	
    /* Constructor */
    function DocumentManagementService() {
            owner=msg.sender;
            DocumentDebuggingLog(block.timestamp, "Contract Deployed", msg.sender);
    }
    
    /**
    * Method to check whether a document with the providd document no and version is present
    **/
    function isDocumentAlreadyPresent(bytes32 _docNo)constant returns (bool _status){
        if(mapDocuments[_docNo].lastUpdate==0){
            DocumentDebuggingLog(block.timestamp, "Document already present", msg.sender);
            return true;
        }
        
        return false;
    }
    
    /**
    * Method to add a new document based on teh provided details
    **/
    function addDocument(address _userAccount, bytes32 _docNo,
        bytes32 _docType, bytes32 _docHash, bytes32 _fileName, 
        uint _expDate, uint _lastUpdate) returns (bool _status){

        uint _version=1;
        
		DocumentDebuggingLog(block.timestamp, "Add Document Step 1",_userAccount);
		
        bytes32[] arrDocNos=mapUserDocNos[_userAccount];
        uint currentDocVersion=mapDocLatestVersion[_docNo];

        if(isDocumentAlreadyPresent(_docNo)){
           _version=currentDocVersion+1;
           //DocumentDebuggingLog(block.timestamp, "Add Document Step 2 - Document Version: " + _version, _userAccount);
        }

        //bytes32 docKey=_docNo +"_"+ _version;
        
        
        DocumentDetail memory dDetail=DocumentDetail({
            docHash: _docHash,
            fileName: _fileName,
            expDate: _expDate,
            version: _version,
            isActive: true
        });
        
        Document document;
        
        document.userAccount= _userAccount;
        document.docNo= _docNo;
        document.docType=_docType;
        document.lastUpdate= now;
        document.isActive= true;
        document.documentVersions.push(dDetail);
        
        mapDocuments[_docNo]=document;
        
        if(_version==1){
            arrDocNos.push(_docNo);
            mapUserDocNos[_userAccount]=arrDocNos;
        }

        
        mapDocLatestVersion[_docNo]=_version;

		//DocumentDebuggingLog(block.timestamp, "Add Document Step 3 - Document Created",_userAccount);

        DocumentCreationLog(block.timestamp, _userAccount,_docNo, _docType);
	
		
        return true;
    }    
    
    /**
    * Method to fetch the latest document based on the provided document number
    **/
    function getLatestDocumentByNo(bytes32 _docNo) constant returns (bool state, 
        address _userAccount, bytes32 _docType, bytes32 _docHash, 
        bytes32 _fileName, uint _expDate, uint _lastUpdate,
        bool _isActive, uint _version){
        var docFound=false;
        Document doc;
        bytes32 docKey="";

        //uint currentDocVersion=mapDocLatestVersion[_docNo];
        
        //docKey=_docNo +"_"+ currentDocVersion;

        if(isDocumentAlreadyPresent(_docNo)){
            doc=mapDocuments[_docNo];
            docFound=true;
        }
    
        uint len= _version;
        
        //DocumentDebuggingLog(block.timestamp, "Document found state : "+docFound +": Type: "+doc._docType,_userAccount);

	    RetrieveDocumentLog(block.timestamp, doc.userAccount, doc.docNo, doc.docType);

        return (docFound, doc.userAccount, doc.docType, 
        doc.documentVersions[len-1].docHash, doc.documentVersions[len-1].fileName, 
        doc.documentVersions[len-1].expDate, doc.lastUpdate, doc.isActive, 
        doc.documentVersions[len-1].version);
    }

    /**
    * Method to fetch the document based on the provided document number and version
    **/
    function getDocumentByNoAndVersion(bytes32 _docNo, uint _version) constant returns (bool state, 
        address _userAccount, bytes32 _docType, bytes32 _docHash, 
        bytes32 _fileName, uint _expDate, uint _lastUpdate,
        bool _isActive){
        bool docFound=false;
        Document doc;
        bytes32 docKey="";

        //docKey=_docNo +"_"+ _version;

        if(isDocumentAlreadyPresent(_docNo)){
            doc=mapDocuments[docKey];
            
            docFound=true;
        }
        
        //DocumentDebuggingLog(block.timestamp, "Document found state : "+docFound +": Type: "+doc._docType,_userAccount);
        
        uint len= doc.documentVersions.length;
        
	    RetrieveDocumentLog(block.timestamp, doc.userAccount, doc.docNo, doc.docType);
    
        return (docFound, doc.userAccount, doc.docType, 
        doc.documentVersions[len-1].docHash, doc.documentVersions[len-1].fileName, 
        doc.documentVersions[len-1].expDate, doc.lastUpdate, doc.isActive);
    }
    
    function appendUintToString(string inStr, uint v) constant returns (string str) {
        uint maxlength = 100;
        bytes memory reversed = new bytes(maxlength);
        uint i = 0;
        while (v != 0) {
            uint remainder = v % 10;
            v = v / 10;
            reversed[i++] = byte(48 + remainder);
        }
        bytes memory inStrb = bytes(inStr);
        bytes memory s = new bytes(inStrb.length + i + 1);
        uint j;
        for (j = 0; j < inStrb.length; j++) {
            s[j] = inStrb[j];
        }
        for (j = 0; j <= i; j++) {
            s[j + inStrb.length] = reversed[i - j];
        }
        str = string(s);
    }
        
    function bytes32ToString(bytes32 x) constant returns (string) {
    bytes memory bytesString = new bytes(32);
        uint charCount = 0;
        for (uint j = 0; j < 32; j++) {
            byte char = byte(bytes32(uint(x) * 2 ** (8 * j)));
            if (char != 0) {
                bytesString[charCount] = char;
                charCount++;
            }
        }
        bytes memory bytesStringTrimmed = new bytes(charCount);
        for (j = 0; j < charCount; j++) {
            bytesStringTrimmed[j] = bytesString[j];
        }
        return string(bytesStringTrimmed);
    }

}
