(function () {
    'use strict';
    angular.module('application.pages', ['config', 'toggle.edit.mode', 'i18n', 'notifications'])
        .service('applicationPageRunner', ['$rootScope', 'configReader', 'config', ApplicationPageRunner])
        .controller('applicationPageController', ['$rootScope', 'editModeRenderer', 'configWriter', 'i18n', 'topicMessageDispatcher', ApplicationPageController])
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

    function ApplicationPageController($rootScope, renderer, writer, i18n, dispatcher) {
        this.open = function () {
            var rendererScope = $rootScope.$new();
            rendererScope.pages = [];
            angular.forEach($rootScope.application.pages, function (page) {
                i18n.resolve({
                    code: 'navigation.label.' + page.name
                }).then(function (translation) {
                    page.translation = translation;
                    page.updatedTranslation = translation;
                    rendererScope.pages.push(page);
                }, function () {
                    page.translation = page.name;
                    page.updatedTranslation = page.name;
                    rendererScope.pages.push(page);
                });
            });

            rendererScope.close = function () {
                renderer.close();
            };

            rendererScope.togglePage = function (page) {
                writer({
                    $scope: rendererScope,
                    scope: 'public',
                    key: 'application.pages.' + page.name + '.active',
                    value: page.active
                });
            };

            rendererScope.translate = function (page) {
                rendererScope.working = true;

                i18n.translate({
                    code: 'navigation.label.' + page.name,
                    translation: page.updatedTranslation
                }).then(function () {
                    page.translation = page.updatedTranslation;
                    dispatcher.fire('i18n.updated', {
                        code: 'navigation.label.' + page.name,
                        translation: page.updatedTranslation
                    });
                }).finally(function () {
                    rendererScope.working = false;
                });
            };

            renderer.open({
                template: '<div class="bin-menu-edit-body">' +
                    '<div class="form-group">' +
                        '<table class="table">' +
                            '<tr ng-repeat="page in pages | orderBy:\'priority\'">' +
                                '<td style="width:80px">' +
                                    '<div class="checkbox-switch">' +
                                        '<input type="checkbox" id="page-{{::page.name}}-switch" ng-model="page.active" ng-change="togglePage(page)">' +
                                        '<label for="page-{{::page.name}}-switch"></label>' +
                                    '</div>' +
                                '</td>' +
                                '<td>' +
                                    '<div i18n code="navigation.label.{{::page.name}}" read-only ng-bind="var" ng-hide="page.active">' +
                                    '</div>' +
                                    '<form ng-submit="translate(page)">' +
                                        '<div ng-class="{\'input-group\': page.translation != page.updatedTranslation}" ng-show="page.active">' +
                                            '<input type="text" class="form-control" ng-model="page.updatedTranslation">' +
                                            '<span class="input-group-btn" ng-show="page.translation != page.updatedTranslation">' +
                                                '<button type="submit" class="btn btn-success" ng-disabled="working">' +
                                                    '<span ng-hide="working"><i class="fa fa-check"></i></span>' +
                                                    '<span ng-show="working"><i class="fa fa-spinner fa-spin"></i></span>' +
                                                '</button>' +
                                            '</span>' +
                                        '</div>' +
                                    '</form>' +
                                '</td>' +
                            '</tr>' +
                        '</table>' +
                    '</div>' +
                '</div>' +
                '<div class="bin-menu-edit-actions">' +
                    '<button type="button" class="btn btn-default" ng-click="close()" i18n code="clerk.menu.close.button" read-only ng-bind="::var"></button>' +
                '</div>',
                scope: rendererScope
            });
        }
    }
})();