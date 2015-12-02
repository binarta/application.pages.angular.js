describe('application.pages', function () {
    var $rootScope, $q, runner, config, configReaderDeferred, configWriterDeferred, configReader, configWriter,
        editModeRenderer, i18n, dispatcher;

    angular.module('config', [])
        .value('config', {})
        .factory('configReader', ['$q', function ($q) {
            configReaderDeferred = $q.defer();
            return jasmine.createSpy('configReader').andReturn(configReaderDeferred.promise);
        }])
        .factory('configWriter', ['$q', function ($q) {
            configWriterDeferred = $q.defer();
            return jasmine.createSpy('configWriter').andReturn(configWriterDeferred.promise);
        }]);

    angular.module('toggle.edit.mode', [])
        .service('editModeRenderer', function () {
            return jasmine.createSpyObj('editModeRenderer', ['open', 'close']);
        });

    angular.module('i18n', [])
        .service('i18n', function () {
            return jasmine.createSpyObj('i18n', ['resolve', 'translate']);
        });

    angular.module('notifications', [])
        .service('topicMessageDispatcher', function () {
            return jasmine.createSpyObj('topicMessageDispatcher', ['fire']);
        });

    beforeEach(module('application.pages'));

    beforeEach(inject(function (_$rootScope_, applicationPageRunner, _config_, _configReader_, _configWriter_,
                                _editModeRenderer_, _i18n_, topicMessageDispatcher) {
        $rootScope = _$rootScope_;
        runner = applicationPageRunner;
        config = _config_;
        configReader = _configReader_;
        configWriter = _configWriter_;
        editModeRenderer = _editModeRenderer_;
        i18n = _i18n_;
        dispatcher = topicMessageDispatcher;
    }));

    describe('on run', function () {
        it('when nothing defined in config', function () {
            expect($rootScope.application.pages).toEqual({});
        });

        describe('when pages are defined in config', function () {
            beforeEach(function () {
                config.application = {
                    pages: ['page1', 'page2']
                };
                runner.run();
            });

            describe('and no page configuration', function () {
                beforeEach(function () {
                    configReaderDeferred.reject();
                    $rootScope.$digest();
                });

                it('requests are made', function () {
                    expect(configReader.calls[0].args[0]).toEqual({
                        $scope: {},
                        scope: 'public',
                        key: 'application.pages.page1.active'
                    });
                    expect(configReader.calls[1].args[0]).toEqual({
                        $scope: {},
                        scope: 'public',
                        key: 'application.pages.page2.active'
                    });
                });

                it('they are also on rootScope', function () {
                    expect($rootScope.application.pages).toEqual({
                        page1: {
                            name: 'page1',
                            priority: 0,
                            active: false
                        },
                        page2: {
                            name: 'page2',
                            priority: 1,
                            active: false
                        }
                    });
                });
            });

            describe('when pages are active', function () {
                beforeEach(function () {
                    configReaderDeferred.resolve({data: {value: 'true'}});
                    $rootScope.$digest();
                });

                it('they are also active on rootScope', function () {
                    expect($rootScope.application.pages).toEqual({
                        page1: {
                            name: 'page1',
                            priority: 0,
                            active: true
                        },
                        page2: {
                            name: 'page2',
                            priority: 1,
                            active: true
                        }
                    });
                });
            });
        });
    });

    describe('applicationPageController', function () {
        var ctrl, i18nResolveDeferred, i18nTranslateDeferred;

        beforeEach(inject(function ($controller, $q) {
            i18nResolveDeferred = $q.defer();
            i18nTranslateDeferred = $q.defer();
            i18n.resolve.andReturn(i18nResolveDeferred.promise);
            i18n.translate.andReturn(i18nTranslateDeferred.promise);

            $rootScope.application = {
                pages: {
                    page1: {
                        name: 'page1',
                        priority: 0,
                        active: false
                    },
                    page2: {
                        name: 'page2',
                        priority: 1,
                        active: false
                    }
                }
            };

            ctrl = $controller('applicationPageController');
        }));

        describe('on open', function () {
            beforeEach(function () {
                ctrl.open();
            });

            it('editModeRenderer is opened', function () {
                expect(editModeRenderer.open).toHaveBeenCalledWith({
                    template: jasmine.any(String),
                    scope: jasmine.any(Object)
                });
            });

            describe('with renderer scope', function () {
                var scope;

                beforeEach(function () {
                    scope = editModeRenderer.open.calls[0].args[0].scope;
                });

                it('resolve page translations', function () {
                    expect(i18n.resolve.calls[0].args[0]).toEqual({code: 'navigation.label.page1'});
                    expect(i18n.resolve.calls[1].args[0]).toEqual({code: 'navigation.label.page2'});
                });

                describe('when translations are rejected', function () {
                    beforeEach(function () {
                        i18nResolveDeferred.reject();
                        scope.$digest();
                    });

                    it('pages are available with default names', function () {
                        expect(scope.pages).toEqual([{
                            name: 'page1',
                            priority: 0,
                            active: false,
                            translation: 'page1',
                            updatedTranslation: 'page1'
                        },{
                            name: 'page2',
                            priority: 1,
                            active: false,
                            translation: 'page2',
                            updatedTranslation: 'page2'
                        }]);
                    });
                });

                describe('when translations are resolved', function () {
                    beforeEach(function () {
                        i18nResolveDeferred.resolve('translation');
                        scope.$digest();
                    });

                    it('pages are available', function () {
                        expect(scope.pages).toEqual([{
                            name: 'page1',
                            priority: 0,
                            active: false,
                            translation: 'translation',
                            updatedTranslation: 'translation'
                        },{
                            name: 'page2',
                            priority: 1,
                            active: false,
                            translation: 'translation',
                            updatedTranslation: 'translation'
                        }]);
                    });

                    describe('on page active toggle', function () {
                        beforeEach(function () {
                            scope.pages[0].active = true;

                            scope.togglePage(scope.pages[0]);
                        });

                        it('config writer is called', function () {
                            expect(configWriter.calls[0].args[0]).toEqual({
                                $scope: scope,
                                scope: 'public',
                                key: 'application.pages.page1.active',
                                value: true
                            });
                        });

                        it('value on rootScope is updated', function () {
                            expect($rootScope.application.pages.page1.active).toBeTruthy();
                        });
                    });

                    describe('on translate page name', function () {
                        var page;

                        beforeEach(function () {
                            page = scope.pages[1];
                            page.updatedTranslation = 'updated';

                            scope.translate(page);
                        });

                        it('i18n translate is called', function () {
                            expect(i18n.translate).toHaveBeenCalledWith({
                                code: 'navigation.label.page2',
                                translation: 'updated'
                            });
                        });

                        it('scope is in working state', function () {
                            expect(scope.working).toBeTruthy();
                        });

                        describe('on translate success', function () {
                            beforeEach(function () {
                                i18nTranslateDeferred.resolve();
                                scope.$digest();
                            });

                            it('page on scope is updated', function () {
                                expect(page).toEqual({
                                    name: 'page2',
                                    priority: 1,
                                    active: false,
                                    translation: 'updated',
                                    updatedTranslation: 'updated'
                                });
                            });

                            it('i18n.updated notification is fired', function () {
                                expect(dispatcher.fire).toHaveBeenCalledWith('i18n.updated', { code : 'navigation.label.page2', translation : 'updated' });
                            });

                            it('scope is not in working state', function () {
                                expect(scope.working).toBeFalsy();
                            });
                        });
                    });
                });

                describe('on close', function () {
                    beforeEach(function () {
                        scope.close();
                    });

                    it('editModeRenderer is closed', function () {
                        expect(editModeRenderer.close).toHaveBeenCalled();
                    });
                });
            });
        });
    });
});