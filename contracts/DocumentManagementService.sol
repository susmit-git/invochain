pragma solidity ^0.4.8;


contract DocumentManagementService {
    address public owner;
    
    // Holds the base document metadata
    struct Document{
        address userAccount;
        bytes32 docNo;
        bytes32 docType;
        uint lastUpdate;
        uint lastVersion;
        bool isActive;
        mapping(uint=>DocumentDetail) documentVersions;
    }
    
    // Holds the document version specific detail
    struct DocumentDetail{
        bytes32 docHash;
        bytes32 fileName;
        uint expDate;
        uint version;
        uint lastUpdate;
        bool isActive;
    }
    
    // Modifier to idenfy whether caller of teh method is the owner of the contract 
	modifier onlyOwner{
		if(msg.sender!=owner){
			throw;
		}
		else{
			_;
		}
	}
    
    // Event trigerred for creating document
    event DocumentCreationLog(uint256 indexed _eventTimeStamp, address indexed _user, 
    bytes32 indexed _docNo, bytes32 _docType);
	// Event trigerred for retrieving document
	event RetrieveDocumentLog(uint256 indexed _eventTimeStamp, address indexed _user, 
    bytes32 indexed _docNo, bytes32 _docType);
    // Event trigerred for general debugging
	event DocumentDebuggingLog(uint256 indexed _eventTimeStamp, bytes32 _data, address _user);
	
	mapping(bytes32=>Document) public mapDocuments; // Holds Docno as key 
	mapping(address=>bytes32[]) public mapUserDocNos; // Holds User address as key with valuehaving  array of all document nos

    /* Constructor */
    function DocumentManagementService() {
            owner=msg.sender;
            DocumentDebuggingLog(block.timestamp, "Contract Deployed", msg.sender);
    }
    
    /**
    * Method to check whether a document with the providd document no and version is present
    **/
    function isDocumentAlreadyPresent(bytes32 _docNo)constant returns (bool _status){
        if(mapDocuments[_docNo].lastVersion>0){
            DocumentDebuggingLog(block.timestamp, "Document already present", msg.sender);
            return true;
        }
        
        return false;
    }
    
    /**
    * Method to create a document with the provided details
    **/
    function createDocument(address _user, bytes32 _docNo,
        bytes32 _docType, bytes32 _docHash, bytes32 _fileName, 
        uint _expDate, uint _version) private returns (bool status){
        
        bytes32[] arrDocNos=mapUserDocNos[_user];
        
        DocumentDebuggingLog(block.timestamp, "Create Document Step 1", address(0));

        Document memory document;
        
        document.userAccount= _user;
        document.docNo= _docNo;
        document.docType=_docType;
        document.lastUpdate= now;
        document.isActive= true;
        document.lastVersion= _version;
        mapDocuments[_docNo]=document;

        DocumentDebuggingLog(block.timestamp, "Create Document Step 2", address(0));
        
        createDocumentDetail(_docNo, _docHash, _fileName, 
        _expDate, _version);
        DocumentDebuggingLog(block.timestamp, "Create Document Step 3", address(0));
         
        arrDocNos.push(_docNo);
        mapUserDocNos[_user]=arrDocNos;

        DocumentDebuggingLog(block.timestamp, "Create Document Step 4", address(0));
            
        return true;
    }
    
    /**
    * Method to create a document version specific details with the provided data
    **/
    function createDocumentDetail(bytes32 _docNo, bytes32 _docHash, bytes32 _fileName, 
        uint _expDate, uint _version) private returns (bool status){
        
        DocumentDebuggingLog(block.timestamp, "Create Document Version Step 1", address(0));

        DocumentDetail memory docDetail=DocumentDetail({
            docHash: _docHash,
            fileName: _fileName,
            expDate: _expDate,
            version: _version,
            lastUpdate: now,
            isActive: true
        });
        
        mapDocuments[_docNo].documentVersions[_version]=docDetail;
        mapDocuments[_docNo].lastVersion=_version;
        
        DocumentDebuggingLog(block.timestamp, "Create Document Version Step 2", address(0));

        return true;
    }
    
    /**
    * Method to add a new document based on the provided details
    **/
    function addDocument(address _userAccount, bytes32 _docNo,
        bytes32 _docType, bytes32 _docHash, bytes32 _fileName, 
        uint _expDate) returns (bool _status){

        uint _version=1;
        
		DocumentDebuggingLog(block.timestamp, "Add Document Step 1", _userAccount);
		
        uint currentDocVersion=mapDocuments[_docNo].lastVersion;

        if(isDocumentAlreadyPresent(_docNo)){
           _version=currentDocVersion+1;
           DocumentDebuggingLog(block.timestamp, "Add Document Step 2", _userAccount);
        }

        if(_version==1){
            createDocument(_userAccount, _docNo,_docType, _docHash, _fileName, 
            _expDate, _version);
        }
        else{
            createDocumentDetail(_docNo, _docHash, _fileName, 
            _expDate, (_version+1));
        }

		DocumentDebuggingLog(block.timestamp, "Add Document Step 3",_userAccount);

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
        Document doc=mapDocuments[_docNo];
        bytes32 docKey="";

        if(isDocumentAlreadyPresent(_docNo)){
            docFound=true;
        }
    
        uint len= doc.lastVersion;
        
        //DocumentDebuggingLog(block.timestamp, "Document found state : "+docFound +": Type: "+doc._docType,_userAccount);

	    RetrieveDocumentLog(block.timestamp, doc.userAccount, doc.docNo, doc.docType);

        return (docFound, doc.userAccount, doc.docType, 
        doc.documentVersions[len].docHash, doc.documentVersions[len].fileName, 
        doc.documentVersions[len].expDate, doc.lastUpdate, doc.isActive, 
        doc.documentVersions[len].version);
    }

    /**
    * Method to fetch the document based on the provided document number and version
    **/
    function getDocumentByNoAndVersion(bytes32 _docNo, uint _version) constant returns (bool state, 
        address _userAccount, bytes32 _docType, bytes32 _docHash, 
        bytes32 _fileName, uint _expDate, uint _lastUpdate,
        bool _isActive){
        bool docFound=false;
        Document doc=mapDocuments[_docNo];
        
        if(isDocumentAlreadyPresent(_docNo)){
            docFound=true;
        }
        
        //DocumentDebuggingLog(block.timestamp, "Document found state : "+docFound +": Type: "+doc._docType,_userAccount);
        
        uint len= _version;
        
	    RetrieveDocumentLog(block.timestamp, doc.userAccount, doc.docNo, doc.docType);
    
        return (docFound, doc.userAccount, doc.docType, 
        doc.documentVersions[len].docHash, doc.documentVersions[len].fileName, 
        doc.documentVersions[len].expDate, doc.lastUpdate, doc.isActive);
    }
    
    /*
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
    */
    
    function kill() onlyOwner{
        DocumentDebuggingLog(block.timestamp, "Contract killed",address(0));
        
		suicide(owner);
    }
}
