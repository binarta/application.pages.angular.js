describe('application.pages', function () {
    var binarta, $rootScope, config, configReaderDeferred, configWriterDeferred, configReader, configWriter,
        editModeRenderer, i18n, dispatcher;

    angular.module('config', [])
        .value('config', {
            application: {
                pages: [
                    {id: 'home'},
                    'page1',
                    {id: 'page2', customProp: 'prop'}
                ]
            }
        })
        .factory('configReader', ['$q', function ($q) {
            configReaderDeferred = $q.defer();
            return jasmine.createSpy('configReader').and.returnValue(configReaderDeferred.promise);
        }])
        .factory('configWriter', ['$q', function ($q) {
            configWriterDeferred = $q.defer();
            return jasmine.createSpy('configWriter').and.returnValue(configWriterDeferred.promise);
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

    beforeEach(inject(function (_binarta_, _$rootScope_, _config_, _configReader_, _configWriter_,
                                _editModeRenderer_, _i18n_, topicMessageDispatcher) {
        binarta = _binarta_;
        $rootScope = _$rootScope_;
        config = _config_;
        configReader = _configReader_;
        configWriter = _configWriter_;
        editModeRenderer = _editModeRenderer_;
        i18n = _i18n_;
        dispatcher = topicMessageDispatcher;
    }));

    describe('binPages service', function () {
        var $rootScope, sut;

        beforeEach(inject(function (_$rootScope_, binPages) {
            $rootScope = _$rootScope_;
            sut = binPages;
        }));

        it('pages are available, homepage is always active', function () {
            expect(sut.pages).toEqual([{
                id: 'home',
                name: 'home',
                priority: 0,
                active: true
            }, {
                id: 'page1',
                name: 'page1',
                priority: 1,
                active: false
            }, {
                id: 'page2',
                customProp: 'prop',
                name: 'page2',
                priority: 2,
                active: false
            }]);
        });

        it('homepage is always active', function () {
            expect(sut.isActive('home')).toBeTruthy();
        });

        it('assert inactive page', function () {
            expect(sut.isActive('page1')).toBeFalsy();
        });

        it('pages are also available on rootScope', function () {
            expect($rootScope.application.pages).toEqual({
                home: {
                    id: 'home',
                    name: 'home',
                    priority: 0,
                    active: true
                },
                page1: {
                    id: 'page1',
                    name: 'page1',
                    priority: 1,
                    active: false
                },
                page2: {
                    id: 'page2',
                    customProp: 'prop',
                    name: 'page2',
                    priority: 2,
                    active: false
                }
            });
        });

        describe('on config update', function () {
            beforeEach(function () {
                binarta.application.config.cache('application.pages.page1.active', 'true');
            });

            it('page is updated', function () {
                expect(sut.pages[1].id).toEqual('page1');
                expect(sut.pages[1].active).toBeTruthy();
            });

            it('page is also updated on rootScope', function () {
                expect($rootScope.application.pages.page1.active).toBeTruthy();
            });

            it('page is active', function () {
                expect(sut.isActive('page1')).toBeTruthy();
            });
        });
    });

    describe('applicationPageController', function () {
        var ctrl, i18nResolveDeferred, i18nTranslateDeferred;

        beforeEach(inject(function ($controller, $q) {
            i18nResolveDeferred = $q.defer();
            i18nTranslateDeferred = $q.defer();
            i18n.resolve.and.returnValue(i18nResolveDeferred.promise);
            i18n.translate.and.returnValue(i18nTranslateDeferred.promise);

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
                    scope = editModeRenderer.open.calls.first().args[0].scope;
                });

                it('resolve page translations', function () {
                    expect(i18n.resolve.calls.first().args[0]).toEqual({code: 'navigation.label.page1'});
                    expect(i18n.resolve.calls.mostRecent().args[0]).toEqual({code: 'navigation.label.page2'});
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
                        }, {
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
                        }, {
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
                        }, {
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
                        }, {
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
                                    expect(configWriter.calls.count()).toEqual(1);
                                    expect(configWriter.calls.first().args[0]).toEqual({
                                        $scope: scope,
                                        scope: 'public',
                                        key: 'application.pages.page1.active',
                                        value: true
                                    });
                                });

                                it('update translations', function () {
                                    expect(i18n.translate.calls.count()).toEqual(1);
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
                                        expect(dispatcher.fire).toHaveBeenCalledWith('i18n.updated', {
                                            code: 'navigation.label.page1',
                                            translation: 'updated'
                                        });
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