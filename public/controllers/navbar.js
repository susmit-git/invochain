angular.module('MyApp')
  .controller('NavbarCtrl', ['$scope', '$rootScope', '$sessionStorage','Auth', 
  function($scope, $rootScope,$sessionStorage,Auth) {
    $scope.isSeller=false;
	$rootScope.isUserLoggedIn=false;

    $scope.logout = function() {
      Auth.logout().success(function() {
        $rootScope.$emit('logoutEvent', {});
      });
    };

	
    $rootScope.$on('loginEvent', function(event, args) {
      if($sessionStorage.currentUser!=undefined && $sessionStorage.currentUser._id!=undefined){
        $scope.isSeller=true;
		$rootScope.isUserLoggedIn=true;
      }
    });

    $rootScope.$on('logoutEvent', function(event, args) {
      if($sessionStorage.currentUser==undefined){
        $scope.isSeller=false;
		$rootScope.isUserLoggedIn=false;
      }
    });
    
    function initializeState(){
      $rootScope.currentUser=null;
      if($sessionStorage.currentUser!=undefined && $sessionStorage.currentUser._id!=undefined){
        $rootScope.currentUser=$sessionStorage.currentUser;
        $scope.isSeller=true;
		$rootScope.isUserLoggedIn=true;
      }
    }

    initializeState();
    
  }]);