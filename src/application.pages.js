(function () {
    'use strict';
    angular.module('application.pages', ['config', 'toggle.edit.mode'])
        .service('applicationPageRunner', ['$rootScope', 'configReader', 'config', ApplicationPageRunner])
        .controller('applicationPageController', ['$rootScope', 'editModeRenderer', 'configWriter', ApplicationPageController])
        .run(['applicationPageRunner', function (runner) {
            runner.run();
        }]);

    function ApplicationPageRunner($rootScope, reader, config) {
        this.run = function () {
            $rootScope.application = $rootScope.application || {};
            $rootScope.application.pages = {};

            if (config.application && config.application.pages) {
                config.application.pages.forEach(function (name) {
                    reader({
                        $scope: {},
                        scope: 'public',
                        key: 'application.pages.' + name + '.active'
                    }).then(function (result) {
                        $rootScope.application.pages[name] = {
                            name: name,
                            priority: config.application.pages.indexOf(name),
                            active: result.data.value == 'true'
                        };
                    }, function () {
                        $rootScope.application.pages[name] = {
                            name: name,
                            priority: config.application.pages.indexOf(name),
                            active: false
                        };
                    });
                });
            }
        };
    }

    function ApplicationPageController($rootScope, editModeRenderer, writer) {
        this.open = function () {
            var rendererScope = $rootScope.$new();
            rendererScope.pages = [];
            angular.forEach($rootScope.application.pages, function (page) {
                rendererScope.pages.push(page);
            });

            rendererScope.close = function () {
                editModeRenderer.close();
            };

            rendererScope.updatePage = function (page) {
                writer({
                    $scope: rendererScope,
                    scope: 'public',
                    key: 'application.pages.' + page.name + '.active',
                    value: page.active
                });
            };

            editModeRenderer.open({
                template: '<form ng-submit="save()">' +
                '<div class="bin-menu-edit-body">' +
                '<div class="form-group">' +
                '<table class="table">' +
                '<tr ng-repeat="page in ::pages | orderBy:\'priority\'">' +
                '<th i18n code="navigation.label.{{::page.name}}" read-only>' +
                '<span ng-show="page.active"><i class="fa fa-eye fa-fw"></i></span> ' +
                '<span ng-show="!page.active"><i class="fa fa-eye-slash fa-fw"></i></span> ' +
                '<span ng-bind="::var"></span>' +
                '</th>' +
                '<td>' +
                '<div class="checkbox-switch">' +
                '<input type="checkbox" id="page-{{::page.name}}-switch" ng-model="page.active" ng-change="updatePage(page)">' +
                '<label for="page-{{::page.name}}-switch"></label>' +
                '</div>' +
                '</td>' +
                '</tr>' +
                '</table>' +
                '</div>' +
                '</div>' +
                '<div class="bin-menu-edit-actions">' +
                '<button type="button" class="btn btn-default" ng-click="close()" i18n code="clerk.menu.close.button" read-only ng-bind="::var"></button>' +
                '</div>' +
                '</form>',
                scope: rendererScope
            });
        }
    }
})();