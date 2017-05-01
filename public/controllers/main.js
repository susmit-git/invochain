
angular.module('MyApp')
  .controller('MainCtrl', ['$scope', 'SearchInvoiceFactory', function($scope, SearchInvoiceFactory) {

   
    $scope.headingTitle = 'Top 12 Invoices';

    $scope.invoices = SearchInvoiceFactory.query();

     $scope.data=[];
    //$scope.invoicesData=SearchInvoiceFactory.query();

    /*
    
    $scope.invoices.then(function(data) {
       console.log(data);
    });

   */

    $scope.filterByRefNo = function(refNo) {
      $scope.invoices = SearchInvoiceFactory.query({ refNo: refNo });
    };

    $scope.filterByAlphabet = function(char) {
      $scope.invoices = SearchInvoiceFactory.query({ buyerName: buyerName });
    };
  }]);