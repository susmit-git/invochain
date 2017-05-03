
angular.module('MyApp')
  .controller('MainCtrl', ['$scope', 'SearchInvoiceFactory','$sessionStorage','$rootScope', function($scope, SearchInvoiceFactory,$sessionStorage,$rootScope) {
    $scope.headingTitle = 'Top 12 Invoices';

    $scope.invoices = SearchInvoiceFactory.query();

    $scope.data=[];

    $scope.filterByRefNo = function(refNo) {
      $scope.invoices = SearchInvoiceFactory.query({ refNo: refNo });
    };

    $scope.filterByAlphabet = function(char) {
      $scope.invoices = SearchInvoiceFactory.query({ buyerName: buyerName });
    };
  }]);