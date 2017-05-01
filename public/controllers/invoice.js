angular.module('MyApp')
  .controller('AddInvoiceCtrl', ['$scope', '$alert', 'InvoiceFactory','SearchInvoiceFactory', function($scope, $alert, InvoiceFactory,SearchInvoiceFactory) {
    
    $scope.entity=[];

    $scope.invoices = SearchInvoiceFactory.query();
    $scope.headingTitle = 'Top 12 Invoices';

    $scope.saveInvoice = function() {
      //InvoiceFactory.create({ showName: $scope.showName },
      InvoiceFactory.create($scope.entity)
        .success(function(data) {
               $scope.entity = [];
          $scope.addForm.$setPristine();
              $alert({
                title: 'Cheers!',
                content: 'You have successfully created the invoice.',
                placement: 'top-right',
                type: 'success',
                duration: 3
              });

              $scope.invoices = SearchInvoiceFactory.query();

              setTimeout(function() { angular.element("[id='refNo']").focus(); }, 50);
            })
            .error(function() {
               $scope.entity = [];
          $scope.addForm.$setPristine();
              $alert({
                title: 'Error!',
                content: 'Invalid paramteres provided.',
                placement: 'top-right',
                type: 'danger',
                duration: 3
              });

              setTimeout(function() { angular.element("[id='refNo']").focus(); }, 50);
            });
    };


  }]);