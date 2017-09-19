(function () {
    'use strict';
    angular.module('application.pages', ['binarta-applicationjs-angular1', 'angularx', 'config', 'toggle.edit.mode', 'i18n', 'notifications'])
        .service('binSections', ['$rootScope', '$q', 'binarta', 'config', 'editModeRenderer', 'configWriter', 'i18n', 'i18nLocation', 'topicMessageDispatcher', BinSectionsService])
        .component('binSectionName', new BinSectionNameComponent())
        .component('binSection', new BinSectionComponent())
        .component('binNavigation', new BinNavigationComponent())
        .controller('applicationPageController', ['binSections', ApplicationPageController])
        .run(['binSections', function () {}]);

    var i18nNavPrefix = 'navigation.label.';

    function BinSectionsService($rootScope, $q, binarta, config, renderer, writer, i18n, location, dispatcher) {
        var self = this;
        var sectionsOnPage = [];

        self.sections = [];

        initSectionsOnRootScope();

        if (config.application && config.application.pages) config.application.pages.forEach(function (section) {
            var priority = config.application.pages.indexOf(section);
            if (typeof section !== 'object') section = {id: section};
            section.name = section.id;
            section.priority = priority;
            self.sections.push(section);
            pushSectionOnRootScope(section);
        });

        self.sections.forEach(function (section) {
            if (isHome(section)) updateSectionStatus(section, true);
            else {
                binarta.application.config.observePublic('application.pages.' + section.id + '.active', function (value) {
                    updateSectionStatus(section, value === 'true' || value === true);
                });
            }
        });

        $rootScope.$on('$routeChangeStart', function () {
            sectionsOnPage = [];
        });

        this.register = function (args) {
            sectionsOnPage.push(args);
            setSectionClasses();
        };

        this.findById = findSectionById;

        this.isActive = function (id) {
            return findSectionById(id).active;
        };

        this.editSection = function (id) {
            var scope = $rootScope.$new();
            var page = findSectionById(id);
            scope.lang = binarta.application.localeForPresentation();
            scope.page = angular.copy(page);
            scope.allowTogglePageVisibility = !isHome(scope.page);
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
                if (page.active !== scope.page.active) promises.push(writeSectionStatus(scope.page, scope));
                if (page.translation !== scope.page.translation) promises.push(writeSectionName(scope.page));

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
                    if (before[i].active !== after[i].active) promises.push(writeSectionStatus(after[i], rendererScope));
                    if (after[i].active && before[i].translation !== after[i].translation) promises.push(writeSectionName(after[i]));
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

        function initSectionsOnRootScope() {
            $rootScope.application = $rootScope.application || {};
            $rootScope.application.pages = {};
        }

        function pushSectionOnRootScope(section) {
            $rootScope.application.pages[section.id] = section;
        }

        function isHome(section) {
            return section.id === 'home';
        }

        function updateSectionStatus(section, status) {
            section.active = status;
            $rootScope.application.pages[section.id].active = status;
            setSectionClasses();
        }

        function findSectionById(id) {
            var page;
            for (var i = 0; i < self.sections.length; i++) {
                if (self.sections[i].id === id) {
                    page = self.sections[i];
                    break;
                }
            }
            return page;
        }

        function setSectionClasses() {
            var odd = true;

            sectionsOnPage.forEach(function (section) {
                if (section.isActive()) {
                    section.setCssClass(odd ? 'odd' : 'even');
                    odd = !odd;
                }
            });
        }

        function writeSectionStatus(section, scope) {
            return writer({
                $scope: scope,
                scope: 'public',
                key: 'application.pages.' + section.name + '.active',
                value: section.active
            });
        }

        function writeSectionName(section) {
            return i18n.translate({
                code: i18nNavPrefix + section.name,
                translation: section.translation
            }).then(function () {
                dispatcher.fire('i18n.updated', {
                    code: i18nNavPrefix + section.name,
                    translation: section.translation
                });
            });
        }
    }

    function BinSectionNameComponent() {
        this.template = '<span ng-bind="$ctrl.name"></span>';

        this.bindings = {
            id: '@sectionId'
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

    function BinSectionComponent() {
        this.template = '<section ng-class="$ctrl.cssClass" ng-if="$ctrl.isActive()" ng-transclude></section>';

        this.transclude = true;

        this.bindings = {
            id: '@'
        };

        this.controller = ['binSections', function (binSections) {
            var $ctrl = this;
            var section;

            $ctrl.$onInit = function () {
                if ($ctrl.id) section = binSections.findById($ctrl.id);

                binSections.register({
                    isActive: isActive,
                    setCssClass: setCssClass
                });

                $ctrl.isActive = isActive;
            };

            function isActive() {
                if (!$ctrl.id) return true;
                return section && section.active;
            }

            function setCssClass(c) {
                $ctrl.cssClass = c;
            }
        }];
    }

    function BinNavigationComponent() {
        this.templateUrl = 'bin-navigation.html';

        this.controller = ['$element', 'binarta', 'binSections', 'topicRegistry', 'binResizeSensor', function ($element, binarta, binSections, topics, binResizeSensor) {
            var $ctrl = this;

            $ctrl.$onInit = function () {
                var navbar = $element.find('.nav-wrapper');
                var navbarNav = $element.find('.navbar-nav');
                var arrowRight = $element.find('.arrow-right');
                var arrowLeft = $element.find('.arrow-left');
                var canMoveToLeft = false, canMoveToRight = false;

                binResizeSensor(navbar, setArrows);
                navbar.on('scroll', setArrows);

                $ctrl.sections = binSections.sections;

                $ctrl.moveLeft = function () {
                    if (canMoveToLeft) {
                        var currentPos = navbar.scrollLeft();
                        scrollToPosition(currentPos - getContainerWidth());
                    }
                };

                $ctrl.moveRight = function () {
                    if (canMoveToRight) {
                        var currentPos = navbar.scrollLeft();
                        scrollToPosition(currentPos + getContainerWidth());
                    }
                };

                $ctrl.isOnPath = function (path) {
                    if (!path) return false;
                    return binarta.application.unlocalizedPath() === path;
                };

                function setArrows() {
                    var offset = 15;
                    var pos = navbar.scrollLeft();
                    canMoveToLeft = pos > offset;
                    canMoveToLeft ? arrowLeft.removeClass('hidden') : arrowLeft.addClass('hidden');
                    canMoveToRight = pos < getNavbarWidth() - getContainerWidth() - offset;
                    canMoveToRight ? arrowRight.removeClass('hidden') : arrowRight.addClass('hidden');
                }

                function getContainerWidth() {
                    return getComputedWidth(navbar[0]);
                }

                function getNavbarWidth() {
                    return getComputedWidth(navbarNav[0]);
                }

                function scrollToPosition(p) {
                    navbar.animate({scrollLeft: p}, 200);
                }

                function getComputedWidth(el) {
                    return parseInt(window.getComputedStyle(el, null).getPropertyValue('width'), 10) || 0;
                }

                function editModeListener(editing) {
                    $ctrl.editing = editing;
                }

                topics.subscribe('edit.mode', editModeListener);

                $ctrl.$onDestroy = function () {
                    topics.unsubscribe('edit.mode', editModeListener);
                };
            };
        }];

    }

    function ApplicationPageController(binSections) {
        //@Deprecated: use the section components instead
        this.open = binSections.editSections;
    }
})();