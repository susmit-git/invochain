
angular.module('MyApp')
  .controller('LoginCtrl', ['$scope', '$rootScope','Auth', function($scope, $rootScope, Auth) {
    $scope.login = function() {
      Auth.login({
        email: $scope.email,
        password: $scope.password
      }).success(function() {
        $rootScope.$emit('loginEvent', {email: $scope.email});
      });
    };
  }]);