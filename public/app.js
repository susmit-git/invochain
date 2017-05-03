var app = angular.module('MyApp', ['ngCookies', 'ngResource', 'ngStorage', 'ngMessages', 'ngRoute', 'mgcrea.ngStrap','monospaced.qrcode','smart-table','ngProgress'])

app.config(['$locationProvider', '$routeProvider','$httpProvider', function($locationProvider, $routeProvider, $httpProvider) {
    $locationProvider.html5Mode(true);
    
    $routeProvider
    .when('/', {
        templateUrl: 'views/home.html',
        controller: 'MainCtrl'
    })
    .when('/invoice/:id', {
        templateUrl: 'views/detail.html',
        controller: 'DetailCtrl'
    })
    .when('/login', {
        templateUrl: 'views/login.html',
        controller: 'LoginCtrl'
    })
    .when('/signup', {
        templateUrl: 'views/signup.html',
        controller: 'SignupCtrl'
    })
    .when('/add', {
        templateUrl: 'views/add.html',
        controller: 'AddCtrl'
    })
    .when('/addInvoice', {
        templateUrl: 'views/addInvoice.html',
        controller: 'AddInvoiceCtrl'
    })
    .otherwise({
        redirectTo: '/'
    });

     /* Registers auth token interceptor, auth token is either passed by header or by query parameter
     * as soon as there is an authenticated user */
    $httpProvider.interceptors.push(function ($q, $rootScope, $location,$sessionStorage) {
        return {
        	'request': function(config) {
        		$rootScope.progressbar.start();
        		/*if($sessionStorage.token != null){
        			config.headers.token= $sessionStorage.token;
        		}*/
        		return config || $q.when(config);
        		},
        		 response : function(response) {
        		      $rootScope.progressbar.complete();
        		      return response ;
        		     },
            'responseError': function (rejection) {
            	$rootScope.progressbar.complete();
                    if(rejection.status === 401) {
                		/*$sessionStorage.$reset();
                        $rootScope.currentUser=[];
                		$rootScope.userName="";
                		$rootScope.userId="";
                        $rootScope.access={};*/
                		$rootScope.showNavigation=false;
                		
                		$location.path("/home");
                		return;
                    }else{
                    	return $q.reject(rejection);	
                    }                    
                }
        	};
    	}
    );	

  }]);

 app.run(function($rootScope,$filter,$http,$location,$sessionStorage,$templateCache,ngProgressFactory){
    $http.get("lang/lang_en.json").success (function(data){
		$rootScope.lang = data;
    });

    if(window.web3!=undefined){
        console.log("Ethereum provider found.");
        $rootScope.ethWeb3 = new Web3(window.web3.currentProvider);
        var accountCount = $rootScope.ethWeb3.eth.accounts.length;
        console.log("Ethereum connection successful. \n Total Ethereum Account Count: "+ accountCount);

        console.log("First Ethereum Account: "+ $rootScope.ethWeb3.eth.accounts[0]);
    }
	
	// Load the api mapping and configuration
	$http.get("config/config.json").success (function(data){
		$rootScope.config = data;
	});

    $rootScope.itemsByPage=4;

    // Added to show progress bar while performing any operation
	$rootScope.progressbar = ngProgressFactory.createInstance();

    // Added to show progress bar while performing any operation
	$rootScope.progressbar = ngProgressFactory.createInstance();
		
	$rootScope.$on('$routeChangeStart', function(ev,data) {
		$rootScope.progressbar.start();
	});
	$rootScope.$on('$routeChangeSuccess', function(ev,data) {
		 $rootScope.progressbar.complete();
	});

    $rootScope.$on( "$routeChangeStart", function(event, next, current) {
	      if ($sessionStorage.currentUser == null || $sessionStorage.currentUser==undefined) {
	    	  
	    	// no logged user, redirect to /login
	    	/*if ( next.templateUrl === "views/xyz.html") {
	        } else {
	        	$sessionStorage.$reset();
	          //$location.path("/login");
	        	$location.path("/home");
	        }*/
	      } 
    });

    	//var for limiting number of characters in line of names and descriptions 
	$rootScope.numberOfChar=40
	$rootScope.numberOfCharKPI=50
	$rootScope.numberOfCharMeeting=35
	$rootScope.numberOfCharDash=28
	$rootScope.numberOfCharInOwners = 25
	$rootScope.numberOfCharInName = 20
	// other vars 
	$rootScope.textAreaReg = /^([a-z0-9A-ZàâäôéèëêïîçùûüÿæœÀÂÄÔÉÈËÊÏÎŸÇÙÛÜÆŒ\-\\.\\_\\"\\'\\(\\)\\*\\+\\@\\$\\!\\&\\#\\//\\:\\/\\?\\²\\{\\=\\<\\>\\%\\µ\\£\\€\\,\\;\\§\\\n\\ ]*)$/;
	$rootScope.passwordReg=/^([a-zA-Z0-9àâäôéèëêïîçùûüÿæœÀÂÄÔÉÈËÊÏÎŸÇÙÛÜÆŒ@#$%&]){4,12}$/;
	$rootScope.login_passwordReg=/^([a-zA-Z0-9àâäôéèëêïîçùûüÿæœÀÂÄÔÉÈËÊÏÎŸÇÙÛÜÆŒ@#$%&]){0,8}$/;
	$rootScope.textReg = /^([a-z0-9A-ZàâäôéèëêïîçùûüÿæœÀÂÄÔÉÈËÊÏÎŸÇÙÛÜÆŒ\-\\.\\_\\"\\'\\(\\)\\*\\+\\@\\$\\!\\&\\#\\ ]*)$/;
	$rootScope.emailReg="/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/";
	$rootScope.durationHoursRegReg = "/^([0-9])([0-9])?([0-9])?$/";
	$rootScope.durationMinutesReg="/^[0-5]?[0-9]$/";
	$rootScope.phoneReg =/^(\d)+$/; 
   
 }); 

 app.directive('fileModel', ['$parse', function ($parse) {
    return {
        restrict: 'A',
        link: function(scope, element, attrs) {
            var model = $parse(attrs.fileModel);
            var modelSetter = model.assign;
            
            element.bind('change', function(){
                scope.$apply(function(){
                    modelSetter(scope, element[0].files[0]);
                });
            });
        }
    };
}]);
