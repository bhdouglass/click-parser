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
                        features: [],
                        desktop: {
                            name: 'test-qml',
                            exec: 'qmlscene $@ Main.qml',
                            icon: 'test-qml.png',
                            terminal: 'false',
                            type: 'Application',
                            'x-ubuntu-touch': 'true',
                        },
                        apparmor: {
                            policy_groups: [
                                'networking',
                                'webview'
                            ],
                            policy_version: 1.3
                        },
                        contentHub: {},
                        urlDispatcher: {},
                        pushHelper: {},
                        accountService: {},
                        webappProperties: {},
                        webappInject: false,
                        hooks: {
                            apparmor: 'test-qml.json',
                            desktop: 'test-qml.desktop',
                        }
                    }],
                    architecture: 'all',
                    description: 'description of test-qml',
                    framework: 'ubuntu-sdk-15.04',
                    icon: null,
                    maintainer: 'Brian Douglass',
                    maintainerEmail: 'bhdouglass@gmail.com',
                    name: 'test-qml.bhdouglass',
                    title: 'test-qml',
                    version: '0.1',
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
