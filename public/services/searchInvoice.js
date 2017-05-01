/*angular.module('MyApp')
  .factory('SearchInvoiceFactory', ['$resource', function($resource) {
     return $resource('/api/invoices/:_id');

      //var data = $resource('/api/shows/:_id');
      //return data;

    return $resource('/api/invoices/:_id', {}, {
        query: { method: 'GET', isArray: true }
    })

  }]);
*/
  
angular.module('MyApp')
  .factory('SearchInvoiceFactory', ['$resource','$rootScope', function($resource,$rootScope) {
    //return $resource('/api/invoices/:_id');
    return $resource($rootScope.config.invoice.list+'/:_id');
  }]);