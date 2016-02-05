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
                        expect(scope.pages.before).toEqual([{
                            name: 'page1',
                            priority: 0,
                            active: false,
                            translation: 'page1'
                        },{
                            name: 'page2',
                            priority: 1,
                            active: false,
                            translation: 'page2'
                        }]);

                        expect(scope.pages.after).toEqual([{
                            name: 'page1',
                            priority: 0,
                            active: false,
                            translation: 'page1'
                        },{
                            name: 'page2',
                            priority: 1,
                            active: false,
                            translation: 'page2'
                        }]);
                    });
                });

                describe('when translations are resolved', function () {
                    beforeEach(function () {
                        i18nResolveDeferred.resolve('translation');
                        scope.$digest();
                    });

                    it('pages are available', function () {
                        expect(scope.pages.before).toEqual([{
                            name: 'page1',
                            priority: 0,
                            active: false,
                            translation: 'translation'
                        },{
                            name: 'page2',
                            priority: 1,
                            active: false,
                            translation: 'translation'
                        }]);

                        expect(scope.pages.after).toEqual([{
                            name: 'page1',
                            priority: 0,
                            active: false,
                            translation: 'translation'
                        },{
                            name: 'page2',
                            priority: 1,
                            active: false,
                            translation: 'translation'
                        }]);
                    });

                    it('changes on pages should not affect before state', function () {
                        scope.pages.after[0].active = true;

                        expect(scope.pages.before[0].active).toBeFalsy();
                    });

                    describe('on save', function () {
                        describe('with nothing changed', function () {
                            beforeEach(function () {
                                scope.save();
                                scope.$digest();
                            });

                            it('nothing need to be persisted', function () {
                                expect(configWriter).not.toHaveBeenCalled();
                                expect(i18n.translate).not.toHaveBeenCalled();
                            });

                            it('editModeRenderer is closed', function () {
                                expect(editModeRenderer.close).toHaveBeenCalled();
                            });
                        });

                        describe('with changes', function () {
                            beforeEach(function () {
                                scope.pages.after[0].active = true;
                                scope.pages.after[0].translation = 'updated';
                                scope.pages.after[1].translation = 'updated';

                                scope.save();
                            });

                            describe('changes are persisted', function () {
                                it('update config', function () {
                                    expect(configWriter.calls.length).toEqual(1);
                                    expect(configWriter.calls[0].args[0]).toEqual({
                                        $scope: scope,
                                        scope: 'public',
                                        key: 'application.pages.page1.active',
                                        value: true
                                    });
                                });

                                it('update translations', function () {
                                    expect(i18n.translate.calls.length).toEqual(1);
                                    expect(i18n.translate).toHaveBeenCalledWith({
                                        code: 'navigation.label.page1',
                                        translation: 'updated'
                                    });
                                });

                                describe('on success', function () {
                                    beforeEach(function () {
                                        configWriterDeferred.resolve();
                                        i18nTranslateDeferred.resolve();
                                        scope.$digest();
                                    });

                                    it('value on rootScope is updated', function () {
                                        expect($rootScope.application.pages.page1.active).toBeTruthy();
                                    });

                                    it('i18n.updated notification is fired', function () {
                                        expect(dispatcher.fire).toHaveBeenCalledWith('i18n.updated', { code : 'navigation.label.page1', translation : 'updated' });
                                    });

                                    it('editModeRenderer is closed', function () {
                                        expect(editModeRenderer.close).toHaveBeenCalled();
                                    });
                                });

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