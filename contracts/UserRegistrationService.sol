pragma solidity ^0.4.8;

contract Mortal {
	address public owner;
	
	function Mortal(){
		owner=msg.sender;
	}
	
    function kill() onlyOwner{
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
}

contract UserRegistrationService is Mortal {
    struct User{
        address userAccount;
        bytes32 userId;
        bytes32 userName;
        bytes32 password;
        uint lastUpdate;
    }
    
    event UserRegistrationLog(uint256 indexed _eventTimeStamp, address indexed _owner, bytes32 indexed _userId, bytes32 _userName);
	// Event trigerred for general debugging
	event UserRegDebuggingLog(uint256 indexed _eventTimeStamp, bytes32 _data, address _user);
	
	mapping(address=>User) public users;
	
	mapping(bytes32=>address) public userAddresses;
	
    /* Constructor */
    function UserRegistrationService() {

    }
    
    function isUserIdAlreadyRegistered(bytes32 _userId)constant returns (bool _status){
        if(userAddresses[_userId]!=address(0)){
			UserRegDebuggingLog(block.timestamp, "User present then address", userAddresses[_userId]);
            return true;
        }
        
        return false;
    }
    
    function addUser(address _userAccount, bytes32 _userId,
        bytes32 _userName, bytes32 _password) returns (bool _status){
        
		UserRegDebuggingLog(block.timestamp, "Add User Step 1",address(0));
		
        User currentUser=users[_userAccount];
		UserRegDebuggingLog(block.timestamp, "Add User Step 2",address(0));
        
        if(currentUser.userAccount==address(0)){
			UserRegDebuggingLog(block.timestamp, "Add User Step 3",address(0));
            if(isUserIdAlreadyRegistered(_userId))
            {
			UserRegDebuggingLog(block.timestamp, "Add User Step 3.1",address(0));
                return false;
            }
			UserRegDebuggingLog(block.timestamp, "Add User Step 3.2",address(0));
            users[_userAccount] = User({
			userAccount: _userAccount,
			userId: _userId,
			userName: _userName,
			password: _password,
			lastUpdate: now
			});
			
			UserRegDebuggingLog(block.timestamp, "Add User Step 3.3",address(0));
			userAddresses[_userId]=_userAccount;
			UserRegDebuggingLog(block.timestamp, "Add User Step 3.5",address(0));
			UserRegistrationLog(block.timestamp, msg.sender, _userId, _userName);
        }
        else
        {
			UserRegDebuggingLog(block.timestamp, "Add User Step 4",address(0));
            return false;
        }
        
		UserRegDebuggingLog(block.timestamp, "Add User Step 5",address(0));
		
        return true;
    }    
    
    function authenticate(address _userAccount, bytes32 _password) constant returns (bool state){
        User currentUser=users[_userAccount];
        
        if(currentUser.userAccount!=address(0)){
            if(currentUser.password==_password)
                return true;
        }
        
        return false;
    }
    
    function getUser(address _userAccount) constant returns (bool state, 
    address _account, bytes32 _userName, bytes32 _password, uint _lastUpdate){
        
        User currentUser=users[_userAccount];
        bool status =false;
        if(currentUser.userAccount!=address(0)){
            status=true;
        }
            
        return (status, currentUser.userAccount, currentUser.userName, 
        currentUser.password, currentUser.lastUpdate);
    }
	
	function kill() onlyOwner{
        super.kill();
    }
	
}