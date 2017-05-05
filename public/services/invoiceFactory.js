angular.module('MyApp')
  .factory('InvoiceFactory', ['$resource','$http', '$alert','$rootScope',function($resource,$http,$alert,$rootScope) {

    return {
        create: function(invoice) {

          var formData = new FormData();
          formData.append('refNo',invoice.refNo);
          formData.append('buyerName',invoice.buyerName);
          formData.append('creationDate',invoice.creationDate);
          formData.append('invoiceImage', invoice.invoiceImage);

          //return $http.post('/api/invoice', {refNo:invoice.refNo,buyerName:invoice.buyerName})
        //return $http.post('/api/invoice',{refNo:invoice.refNo,buyerName:invoice.buyerName,invoiceImage:invoice.invoiceImage});

        //return $http.post('/api/invoice',formData);

          //'/api/invoice'
          return $http.post(
												$rootScope.config.invoice.create,
												formData,
												{
													transformRequest : angular.identity,
													headers : {'Content-Type' : undefined}
												});
        },//'/api/invoices'
        getAllInvoices: function() {
          return $http.get($rootScope.config.invoice.list);
        },//'/api/invoice/'+invoice._id
        getInvoice: function(invoice) {
          return $http.get($rootScope.config.invoice.get+'/'+invoice._id);
        }
    }
}]);
