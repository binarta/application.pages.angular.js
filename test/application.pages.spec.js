describe('application.pages', function () {
    var binarta, $rootScope, config, configReaderDeferred, configWriterDeferred, configReader, configWriter,
        editModeRenderer, i18n, dispatcher, i18nLocation;

    angular.module('config', [])
        .value('config', {
            application: {
                pages: [
                    {id: 'home'},
                    'page1',
                    {id: 'page2', customProp: 'prop', path: '/page2'}
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
        })
        .service('i18nLocation', function () {
            return jasmine.createSpyObj('i18nLocation', ['path']);
        });

    angular.module('notifications', [])
        .service('topicMessageDispatcher', function () {
            return jasmine.createSpyObj('topicMessageDispatcher', ['fire']);
        });

    beforeEach(module('application.pages'));

    beforeEach(inject(function (_binarta_, _$rootScope_, _config_, _configReader_, _configWriter_,
                                _editModeRenderer_, _i18n_, topicMessageDispatcher, _i18nLocation_) {
        binarta = _binarta_;
        $rootScope = _$rootScope_;
        config = _config_;
        configReader = _configReader_;
        configWriter = _configWriter_;
        editModeRenderer = _editModeRenderer_;
        i18n = _i18n_;
        dispatcher = topicMessageDispatcher;
        i18nLocation = _i18nLocation_;
    }));

    describe('binPages service', function () {
        var $rootScope, sut, homepage, page1, page2;

        beforeEach(inject(function (_$rootScope_, binPages) {
            homepage = {
                id: 'home',
                name: 'home',
                priority: 0,
                active: true
            };

            page1 = {
                id: 'page1',
                name: 'page1',
                priority: 1,
                active: false
            };

            page2 = {
                id: 'page2',
                customProp: 'prop',
                name: 'page2',
                path: '/page2',
                priority: 2,
                active: false
            };

            $rootScope = _$rootScope_;
            sut = binPages;
        }));

        it('pages are available, homepage is always active', function () {
            expect(sut.pages).toEqual([homepage, page1, page2]);
        });

        it('homepage is always active', function () {
            expect(sut.isActive('home')).toBeTruthy();
        });

        it('assert inactive page', function () {
            expect(sut.isActive('page1')).toBeFalsy();
        });

        it('pages are also available on rootScope', function () {
            expect($rootScope.application.pages).toEqual({home: homepage, page1: page1, page2: page2});
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

        describe('on config update with boolean', function () {
            beforeEach(function () {
                binarta.application.config.cache('application.pages.page1.active', true);
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

        describe('on edit page', function () {
            var i18nResolveDeferred, i18nTranslateDeferred, scope;

            beforeEach(inject(function ($q) {
                i18nResolveDeferred = $q.defer();
                i18n.resolve.and.returnValue(i18nResolveDeferred.promise);
                i18nTranslateDeferred = $q.defer();
                i18n.translate.and.returnValue(i18nTranslateDeferred.promise);
                binarta.application.setLocaleForPresentation('L');
                binarta.application.refreshEvents();
            }));

            describe('when homepage', function () {
                beforeEach(function () {
                    sut.editPage('home');
                    scope = editModeRenderer.open.calls.mostRecent().args[0].scope;
                });

                it('do not allow to toggle page visibility', function () {
                    expect(scope.allowTogglePageVisibility).toBeFalsy();
                });

                it('not able to navigate to the page (because path is not defined)', function () {
                    expect(scope.isNavigatable).toBeFalsy();
                });
            });

            describe('when not the homepage', function () {
               beforeEach(function () {
                   sut.editPage('page2');
                   scope = editModeRenderer.open.calls.mostRecent().args[0].scope;
               });

                it('editMode renderer is opened', function () {
                    expect(editModeRenderer.open).toHaveBeenCalledWith({
                        templateUrl: 'bin-page-edit.html',
                        scope: jasmine.any(Object)
                    });
                });

                it('page is available', function () {
                    expect(scope.page).toEqual(page2);
                });

                it('page is a copy and not a reference', function () {
                    scope.page.test = true;
                    expect(sut.pages[2].test).toBeFalsy();
                });

                it('current language is available', function () {
                    expect(scope.lang).toEqual('L');
                });

                it('allow toggle page visibility', function () {
                    expect(scope.allowTogglePageVisibility).toBeTruthy();
                });

                it('not possible to navigate to the page because it is not active', function () {
                    expect(scope.isNavigatable).toBeFalsy();
                });

                describe('when title name is resolved', function () {
                    beforeEach(function () {
                        i18nResolveDeferred.resolve('name');
                        $rootScope.$digest();
                    });

                    it('translation is available', function () {
                        expect(scope.page.translation).toEqual('name');
                    });
                });

                describe('on submit with no changes', function () {
                    beforeEach(function () {
                        scope.submit();
                    });

                    it('do nothing and close renderer', function () {
                        expect(editModeRenderer.close).toHaveBeenCalled();
                    });
                });

                describe('on submit after visibility change', function () {
                    beforeEach(function () {
                        scope.page.active = true;
                        scope.submit();
                    });

                    it('is working', function () {
                        expect(scope.working).toBeTruthy();
                    });

                    it('config writer is called', function () {
                        expect(configWriter).toHaveBeenCalledWith({
                            $scope: scope,
                            scope: 'public',
                            key: 'application.pages.' + scope.page.name + '.active',
                            value: scope.page.active
                        });
                    });

                    describe('on success', function () {
                        beforeEach(function () {
                            configWriterDeferred.resolve();
                            $rootScope.$digest();
                        });

                        it('renderer is closed', function () {
                            expect(editModeRenderer.close).toHaveBeenCalled();
                        });
                    });

                    describe('on error', function () {
                        beforeEach(function () {
                            configWriterDeferred.reject();
                            $rootScope.$digest();
                        });

                        it('assert violations', function () {
                            expect(scope.violations).toEqual(['error']);
                        });

                        it('stop working', function () {
                            expect(scope.working).toBeFalsy();
                        });
                    });
                });

                describe('on submit after name change', function () {
                    beforeEach(function () {
                        scope.page.translation = 'updated';
                        scope.submit();
                    });

                    it('is working', function () {
                        expect(scope.working).toBeTruthy();
                    });

                    it('translate is called', function () {
                        expect(i18n.translate).toHaveBeenCalledWith({
                            code: 'navigation.label.page2',
                            translation: 'updated'
                        });
                    });

                    describe('on success', function () {
                        beforeEach(function () {
                            i18nTranslateDeferred.resolve();
                            $rootScope.$digest();
                        });

                        it('renderer is closed', function () {
                            expect(editModeRenderer.close).toHaveBeenCalled();
                        });
                    });

                    describe('on error', function () {
                        beforeEach(function () {
                            i18nTranslateDeferred.reject();
                            $rootScope.$digest();
                        });

                        it('assert violations', function () {
                            expect(scope.violations).toEqual(['error']);
                        });

                        it('stop working', function () {
                            expect(scope.working).toBeFalsy();
                        });
                    });
                });

                it('on goToPage', function () {
                    scope.goToPage();
                    expect(i18nLocation.path).toHaveBeenCalledWith(scope.page.path);
                    expect(editModeRenderer.close).toHaveBeenCalled();
                });

                it('on close', function () {
                    scope.close();
                    expect(editModeRenderer.close).toHaveBeenCalled();
                });
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

            ctrl = $controller('applicationPageController');
        }));

        describe('on open', function () {
            beforeEach(function () {
                ctrl.open();
            });

            it('editModeRenderer is opened', function () {
                expect(editModeRenderer.open).toHaveBeenCalledWith({
                    templateUrl: 'bin-pages-edit.html',
                    scope: jasmine.any(Object)
                });
            });

            describe('with renderer scope', function () {
                var scope;

                beforeEach(function () {
                    scope = editModeRenderer.open.calls.first().args[0].scope;
                });

                it('resolve page translations', function () {
                    expect(i18n.resolve.calls.first().args[0]).toEqual({code: 'navigation.label.home'});
                    expect(i18n.resolve.calls.mostRecent().args[0]).toEqual({code: 'navigation.label.page2'});
                });

                describe('when translations are rejected', function () {
                    beforeEach(function () {
                        i18nResolveDeferred.reject();
                        scope.$digest();
                    });

                    it('pages are available with default names', function () {
                        expect(scope.pages.before).toEqual([{
                            id: 'home',
                            name: 'home',
                            priority: 0,
                            active: true,
                            translation: 'home'
                        }, {
                            id: 'page1',
                            name: 'page1',
                            priority: 1,
                            active: false,
                            translation: 'page1'
                        }, {
                            id: 'page2',
                            name: 'page2',
                            customProp: 'prop',
                            path: '/page2',
                            priority: 2,
                            active: false,
                            translation: 'page2'
                        }]);

                        expect(scope.pages.after).toEqual([{
                            id: 'home',
                            name: 'home',
                            priority: 0,
                            active: true,
                            translation: 'home'
                        }, {
                            id: 'page1',
                            name: 'page1',
                            priority: 1,
                            active: false,
                            translation: 'page1'
                        }, {
                            id: 'page2',
                            name: 'page2',
                            customProp: 'prop',
                            path: '/page2',
                            priority: 2,
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
                            name: 'home',
                            id: 'home',
                            priority: 0,
                            active: true,
                            translation: 'translation'
                        }, {
                            name: 'page1',
                            id: 'page1',
                            priority: 1,
                            active: false,
                            translation: 'translation'
                        }, {
                            name: 'page2',
                            id: 'page2',
                            customProp: 'prop',
                            path: '/page2',
                            priority: 2,
                            active: false,
                            translation: 'translation'
                        }]);

                        expect(scope.pages.after).toEqual([{
                            name: 'home',
                            id: 'home',
                            priority: 0,
                            active: true,
                            translation: 'translation'
                        }, {
                            name: 'page1',
                            id: 'page1',
                            priority: 1,
                            active: false,
                            translation: 'translation'
                        }, {
                            name: 'page2',
                            id: 'page2',
                            customProp: 'prop',
                            path: '/page2',
                            priority: 2,
                            active: false,
                            translation: 'translation'
                        }]);
                    });

                    it('changes on pages should not affect before state', function () {
                        scope.pages.after[1].active = true;

                        expect(scope.pages.before[1].active).toBeFalsy();
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
                                scope.pages.after[1].active = true;
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