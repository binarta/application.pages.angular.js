(function () {
    'use strict';
    angular.module('application.pages', ['binarta-applicationjs-angular1', 'config', 'toggle.edit.mode', 'i18n', 'notifications'])
        .service('binPages', ['$rootScope', '$q', 'binarta', 'config', 'editModeRenderer', 'configWriter', 'i18n', 'i18nLocation', 'topicMessageDispatcher', BinSectionsService])
        .service('binSections', ['$rootScope', '$q', 'binarta', 'config', 'editModeRenderer', 'configWriter', 'i18n', 'i18nLocation', 'topicMessageDispatcher', BinSectionsService])
        .component('binSectionName', new BinSectionNameComponent())
        .controller('applicationPageController', ['binSections', ApplicationPageController])
        .run(['binSections', function () {}]);

    var i18nNavPrefix = 'navigation.label.';

    function BinSectionsService($rootScope, $q, binarta, config, renderer, writer, i18n, location, dispatcher) {
        var self = this;
        self.sections = [];
        initPagesOnRootScope();
        if (config.application && config.application.pages) config.application.pages.forEach(function (page) {
            var priority = config.application.pages.indexOf(page);
            if (typeof page  !== 'object') page = {id: page};
            page.name = page.id;
            page.priority = priority;
            self.sections.push(page);
            pushPageOnRootScope(page);
        });

        self.sections.forEach(function (page) {
            if (isHomePage(page)) updatePageStatus(page, true);
            else {
                binarta.application.config.observePublic('application.pages.' + page.id + '.active', function(value) {
                    updatePageStatus(page, value === 'true' || value === true);
                });
            }
        });

        function initPagesOnRootScope() {
            $rootScope.application = $rootScope.application || {};
            $rootScope.application.pages = {};
        }

        function pushPageOnRootScope(page) {
            $rootScope.application.pages[page.id] = page;
        }

        function isHomePage(page) {
            return page.id === 'home';
        }

        function updatePageStatus(page, status) {
            page.active = status;
            $rootScope.application.pages[page.id].active = status;
        }

        function findPageById(id) {
            var page;
            for(var i = 0; i < self.sections.length; i++) {
                if (self.sections[i].id === id) {
                    page = self.sections[i];
                    break;
                }
            }
            return page;
        }

        this.isActive = function (id) {
            return findPageById(id).active;
        };

        this.editSection = function (id) {
            var scope = $rootScope.$new();
            var page = findPageById(id);
            scope.lang = binarta.application.localeForPresentation();
            scope.page = angular.copy(page);
            scope.allowTogglePageVisibility = !isHomePage(scope.page);
            scope.isNavigatable = page.path && page.active && page.path !== binarta.application.unlocalizedPath();

            i18n.resolve({code: i18nNavPrefix + scope.page.id}).then(function (t) {
                page.translation = t;
                scope.page.translation = t;
            });

            scope.goToPage = function () {
                location.path(scope.page.path);
                scope.close();
            };

            scope.submit = function () {
                var promises = [];
                scope.violations = [];
                if (page.active !== scope.page.active) promises.push(writePageStatus(scope.page, scope));
                if (page.translation !== scope.page.translation) promises.push(writePageName(scope.page));

                if (promises.length > 0) {
                    scope.working = true;
                    $q.all(promises).then(function () {
                        scope.close();
                    }, function () {
                        scope.violations = ['error'];
                        scope.working = false;
                    });
                } else scope.close();
            };

            scope.close = function () {
                renderer.close();
            };

            renderer.open({
                templateUrl: 'bin-page-edit.html',
                scope: scope
            });
        };

        this.editSections = function () {
            var rendererScope = $rootScope.$new();

            rendererScope.pages = {
                before: [],
                after: []
            };

            self.sections.forEach(function (page) {
                i18n.resolve({
                    code: i18nNavPrefix + page.name
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
                    if (before[i].active !== after[i].active) promises.push(writePageStatus(after[i], rendererScope));
                    if (after[i].active && before[i].translation !== after[i].translation) promises.push(writePageName(after[i]));
                }

                $q.all(promises).then(function () {
                    renderer.close();
                }, function () {
                    rendererScope.violation = true;
                    rendererScope.working = false;
                });
            };

            renderer.open({
                templateUrl: 'bin-pages-edit.html',
                scope: rendererScope
            });

        };

        function writePageStatus(page, scope) {
            return writer({
                $scope: scope,
                scope: 'public',
                key: 'application.pages.' + page.name + '.active',
                value: page.active
            });
        }

        function writePageName(page) {
            return i18n.translate({
                code: i18nNavPrefix + page.name,
                translation: page.translation
            }).then(function () {
                dispatcher.fire('i18n.updated', {
                    code: i18nNavPrefix + page.name,
                    translation: page.translation
                });
            });
        }
    }

    function BinSectionNameComponent() {
        this.template = '<span ng-bind="$ctrl.name"></span>';

        this.bindings = {
            id: '@pageId'
        };

        this.controller = ['$scope', '$element', 'i18n', 'editMode', 'binSections', function ($scope, $element, i18n, editMode, binSections) {
            var $ctrl = this;

            $ctrl.$onInit = function () {
                var observer = i18n.observe(i18nNavPrefix + $ctrl.id, function (t) {
                    $ctrl.name = t;
                });

                editMode.bindEvent({
                    scope: $scope,
                    element: $element,
                    permission: 'edit.mode',
                    onClick: function () {
                        binSections.editSection($ctrl.id);
                    }
                });

                $ctrl.$onDestroy = function () {
                    observer.disconnect();
                };
            };
        }];
    }

    function ApplicationPageController(binSections) {
        this.open = binSections.editSections;
    }
})();