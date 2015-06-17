var parse = require('../index.js');
var assert = require('assert');

describe('click-parser', function(){
    describe('parse qml click package', function(){
        it('should parse without error', function(done) {
            parse(__dirname + '/test-qml.bhdouglass_0.1_all.click', function(err, data) {
                if (err) {
                    throw err;
                }

                assert.deepEqual(data, {
                    types: ['application'],
                    manifest: {
                        architecture: 'all',
                        description: 'description of test-qml',
                        framework: 'ubuntu-sdk-15.04',
                        hooks: {
                            'test-qml': {
                                apparmor: 'test-qml.apparmor',
                                desktop: 'test-qml.desktop'
                            }
                        },
                        'installed-size': '38',
                        maintainer: 'Brian Douglass <bhdouglass@gmail.com>',
                        name: 'test-qml.bhdouglass',
                        title: 'test-qml',
                        version: '0.1'
                    },
                    desktopFiles: ['./test-qml.desktop'],
                    iconpath: 'test-qml.png'
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

                assert.deepEqual(data.types, ['application']);
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

                assert.deepEqual(data.types, ['scope']);
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

                assert.deepEqual(data.types, ['webapp']);
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

                assert.deepEqual(data.types, ['application']);
                done();
            });
        });
    });
});
