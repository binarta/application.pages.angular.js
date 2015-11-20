describe('application.pages', function () {
    var $rootScope, $q, runner, config, configReaderDeferred, configWriterDeferred, configReader, configWriter, editModeRenderer;

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

    beforeEach(module('application.pages'));

    beforeEach(inject(function (_$rootScope_, applicationPageRunner, _config_, _configReader_, _configWriter_, _editModeRenderer_) {
        $rootScope = _$rootScope_;
        runner = applicationPageRunner;
        config = _config_;
        configReader = _configReader_;
        configWriter = _configWriter_;
        editModeRenderer = _editModeRenderer_;
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
        var ctrl;

        beforeEach(inject(function ($controller) {
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

                it('pages are available', function () {
                    expect(scope.pages).toEqual([{
                        name: 'page1',
                        priority: 0,
                        active: false
                    },{
                        name: 'page2',
                        priority: 1,
                        active: false
                    }]);
                });

                describe('on page update', function () {
                    beforeEach(function () {
                        scope.pages[0].active = true;

                        scope.updatePage(scope.pages[0]);
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