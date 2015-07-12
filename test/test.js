var parse = require('../src/index.js');
var assert = require('assert');

describe('click-parser', function(){
    describe('parse qml click package', function(){
        it('should parse without error', function(done) {
            parse(__dirname + '/test-qml.bhdouglass_0.1_all.click', function(err, data) {
                if (err) {
                    throw err;
                }

                assert.deepEqual(data, {
                    apps: [{
                        name: 'test-qml',
                        type: 'app',
                        features: ['content_hub', 'url_dispatcher', 'account_service'],
                        desktop: {
                            name: 'test-qml',
                            exec: 'qmlscene $@ Main.qml',
                            icon: 'test-qml.png',
                            terminal: 'false',
                            type: 'Application',
                            'x-ubuntu-touch': 'true'
                        },
                        apparmor: {
                            policy_groups: ['networking', 'webview'],
                            policy_version: 1.3
                        },
                        contentHub: {
                            source: ['pictures']
                        },
                        urlDispatcher: [{
                            protocol: 'http',
                            'domain-suffix': 'example.com'
                        }],
                        pushHelper: {},
                        accountService: {
                            service: {
                                name: 'test-qml',
                                type: 'test-qml.bhdouglass',
                                provider: 'facebook'
                            }
                        },
                        accountApplication: {
                            application: {
                                services: {
                                    service: {
                                        id: 'test-qml.bhdouglass',
                                        description: 'Post your pictures to Facebook'
                                    }
                                }
                            }
                        },
                        webappProperties: {},
                        webappInject: false,
                        hooks: {
                            'account-application': 'account-application.xml',
                            'account-service': 'account-service.xml',
                            apparmor: 'apparmor.json',
                            'content-hub': 'content-hub.json',
                            desktop: 'test-qml.desktop',
                            urls: 'url-dispatcher.json'
                        }
                    }, {
                        name: 'test-qml-push-helper',
                        type: 'push',
                        features: ['push_helper'],
                        desktop: {},
                        apparmor: {
                            policy_groups: ['push-notification-client'],
                            policy_version: 1.3,
                            template: 'ubuntu-push-helper'
                        },
                        contentHub: {},
                        urlDispatcher: {},
                        pushHelper: {
                            exec: 'pushHelper',
                            app_id: 'test-qml.bhdouglass'
                        },
                        accountService: {},
                        accountApplication: {},
                        webappProperties: {},
                        webappInject: false,
                        hooks: {
                            apparmor: 'push-helper-apparmor.json',
                            'push-helper': 'push-helper.json'
                        }
                    }],
                    architecture: 'all',
                    description: 'description of test-qml',
                    framework: 'ubuntu-sdk-15.04',
                    icon: null,
                    maintainer: 'Brian Douglass',
                    maintainerEmail: 'bhdouglass@gmail.com',
                    name: 'test-qml.bhdouglass',
                    permissions: ['networking', 'webview', 'push-notification-client'],
                    title: 'test-qml',
                    types: ['app', 'push'],
                    urls: ['http://example.com'],
                    version: '0.1'
                });

                done();
            });
        });
    });

    describe('parse html5 click package', function(){
        it('should parse without error', function(done) {
            parse(__dirname + '/test-html5.bhdouglass_0.1_all.click', function(err, data) {
                if (err) {
                    throw err;
                }

                assert.equal(data.apps.length, 1);
                assert.equal(data.apps[0].type, 'app');

                done();
            });
        });
    });

    describe('parse scope click package', function(){
        it('should parse without error', function(done) {
            parse(__dirname + '/test-scope.bhdouglass_0.1_armhf.click', function(err, data) {
                if (err) {
                    throw err;
                }

                assert.equal(data.apps.length, 1);
                assert.equal(data.apps[0].type, 'scope');

                done();
            });
        });
    });

    describe('parse webapp click package', function(){
        it('should parse without error', function(done) {
            parse(__dirname + '/test-webapp.bhdouglass_0.1_all.click', function(err, data) {
                if (err) {
                    throw err;
                }

                assert.equal(data.apps.length, 1);
                assert.equal(data.apps[0].type, 'webapp');
                assert.equal(data.apps[0].webappInject, true);
                assert.deepEqual(data.apps[0].webappProperties, {
                    includes: ['http://example.com:*/*'],
                    name: 'ExtendedWebappProperties',
                    scripts: ['inject.js'],
                    domain: '',
                    homepage: '',
                    'user-agent-override': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Ubuntu Chromium/39.0.2171.65 Chrome/39.0.2171.65 Safari/537.36'
                });

                done();
            });
        });
    });

    describe('parse ogra webapp click package', function(){
        it('should parse without error', function(done) {
            parse(__dirname + '/test-ogra.bhdouglass_0.1_all.click', function(err, data) {
                if (err) {
                    throw err;
                }

                assert.equal(data.apps.length, 1);
                assert.equal(data.apps[0].type, 'app');

                done();
            });
        });
    });
});
