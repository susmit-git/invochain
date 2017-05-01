
angular.module('MyApp')
  .controller('DetailCtrl', ['$scope', '$rootScope', '$sessionStorage','$routeParams','$location', 'InvoiceFactory',
    function($scope, $rootScope, $sessionStorage, $routeParams,$location, InvoiceFactory) {
      $scope.invoice=[];

      $scope.getInvoiceById = function() {
        
        InvoiceFactory.getInvoice({
          _id: $routeParams.id
        }).success(function(data) {
          $scope.invoice=data;
        }).error(function(data, status, headers, config){
     	    alert(data.status);
        });
      };

      if($sessionStorage.currentUser!=undefined){
        $scope.getInvoiceById();
      }
      else{
        $location.path("/home");
      }
      
    }]);