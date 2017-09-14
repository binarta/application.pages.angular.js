(function () {
    'use strict';
    angular.module('application.pages', ['binarta-applicationjs-angular1', 'config', 'toggle.edit.mode', 'i18n', 'notifications'])
        .service('binPages', ['$rootScope', 'binarta', 'config', BinPagesService])
        .controller('applicationPageController', ['$rootScope', '$q', 'editModeRenderer', 'configWriter', 'i18n', 'topicMessageDispatcher', ApplicationPageController])
        .run(['binPages', function () {}]);

    function BinPagesService($rootScope, binarta, config) {
        var self = this;
        self.pages = [];
        initPagesOnRootScope();
        if (config.application && config.application.pages) config.application.pages.forEach(function (page) {
            var priority = config.application.pages.indexOf(page);
            if (typeof page  !== 'object') page = {id: page};
            page.name = page.id;
            page.priority = priority;
            self.pages.push(page);
            pushPageOnRootScope(page);
        });

        self.pages.forEach(function (page) {
            binarta.application.config.observePublic('application.pages.' + page.id + '.active', function(value) {
                updatePageStatus(page, value);
            });
        });

        function initPagesOnRootScope() {
            $rootScope.application = $rootScope.application || {};
            $rootScope.application.pages = {};
        }

        function pushPageOnRootScope(page) {
            $rootScope.application.pages[page.id] = page;
        }

        function updatePageStatusOnRootScope(page, status) {
            $rootScope.application.pages[page.id].active = isPageStatusActive(page, status);
        }

        function isHomePage(page) {
            return page.id === 'home';
        }

        function updatePageStatus(page, status) {
            self.pages.forEach(function (p) {
                if (p.id === page.id) p.active = isPageStatusActive(page, status);
            });
            updatePageStatusOnRootScope(page, status);
        }

        function isPageStatusActive(page, status) {
            return isHomePage(page) ? true : (status === 'true');
        }

        this.isActive = function (id) {
            var isActive = false;
            for(var i = 0; i < self.pages.length; i++) {
                if (self.pages[i].id === id && self.pages[i].active) {
                    isActive = true;
                    break;
                }
            }
            return isActive;
        };
    }

    function ApplicationPageController($rootScope, $q, renderer, writer, i18n, dispatcher) {
        this.open = function () {
            var rendererScope = $rootScope.$new();

            renderer.open({
                template:
                '<form ng-submit="save()">' +
                    '<div class="bin-menu-edit-body">' +

                        '<div class="alert alert-danger" ng-show="violation">' +
                            '<i class="fa fa-exclamation-triangle"></i> ' +
                            '<span i18n code="application.pages.error" read-only ng-bind="::var"></span>' +
                        '</div>' +

                        '<div class="form-group">' +
                            '<table class="table">' +
                                '<tr ng-repeat="page in pages.after | orderBy:\'priority\'">' +
                                    '<td style="width:80px">' +
                                        '<div class="checkbox-switch">' +
                                            '<input type="checkbox" id="page-{{::page.name}}-switch" ng-model="page.active" ng-change="togglePage(page)">' +
                                            '<label for="page-{{::page.name}}-switch"></label>' +
                                        '</div>' +
                                    '</td>' +
                                    '<td>' +
                                        '<div i18n code="navigation.label.{{::page.name}}" read-only ng-bind="var" ng-hide="page.active"></div>' +
                                        '<input type="text" class="form-control" ng-model="page.translation" ng-show="page.active">' +
                                    '</td>' +
                                '</tr>' +
                            '</table>' +
                        '</div>' +
                    '</div>' +
                    '<div class="bin-menu-edit-actions">' +
                        '<button type="submit" class="btn btn-primary" ng-disabled="working" i18n code="clerk.menu.save.button" read-only>' +
                            '<span ng-show="working"><i class="fa fa-spinner fa-spin"></i></span> {{::var}}' +
                        '</button>' +
                        '<button type="button" class="btn btn-default" ng-click="close()" ng-disabled="working" i18n code="clerk.menu.close.button" read-only ng-bind="::var"></button>' +
                    '</div>' +
                '</form>',
                scope: rendererScope
            });

            rendererScope.pages = {
                before: [],
                after: []
            };
            angular.forEach($rootScope.application.pages, function (page) {
                i18n.resolve({
                    code: 'navigation.label.' + page.name
                }).then(function (translation) {
                    page.translation = translation;
                    rendererScope.pages.before.push(page);
                    rendererScope.pages.after.push(angular.copy(page));
                }, function () {
                    page.translation = page.name;
                    rendererScope.pages.before.push(page);
                    rendererScope.pages.after.push(angular.copy(page));
                });
            });

            rendererScope.close = function () {
                renderer.close();
            };

            rendererScope.save = function () {
                rendererScope.working = true;
                var before = rendererScope.pages.before;
                var after = rendererScope.pages.after;
                var promises = [];

                for (var i = 0; i < after.length; i++) {
                    if (before[i].active !== after[i].active) promises.push(updateConfig(after[i]));
                    if (after[i].active && before[i].translation !== after[i].translation) promises.push(updateTranslation(after[i]));
                }

                $q.all(promises).then(function () {
                    renderer.close();
                }, function () {
                    rendererScope.violation = true;
                    rendererScope.working = false;
                });
            };

            function updateConfig(page) {
                return writer({
                    $scope: rendererScope,
                    scope: 'public',
                    key: 'application.pages.' + page.name + '.active',
                    value: page.active
                }).then(function () {
                    $rootScope.application.pages[page.name].active = page.active;
                });
            }

            function updateTranslation(page) {
                return i18n.translate({
                    code: 'navigation.label.' + page.name,
                    translation: page.translation
                }).then(function () {
                    dispatcher.fire('i18n.updated', {
                        code: 'navigation.label.' + page.name,
                        translation: page.translation
                    });
                });
            }
        }
    }
})();