var App = require('./app');
var utils = require('./utils');

var ar = require('ar');
var fs = require('fs');
var minimist = require('minimist');
var path = require('path');
var streamifier = require('streamifier');
var tar = require('tar');
var tarstream = require('tar-stream');
var uuid = require('uuid');
var xml2js = require('xml2js');
var zlib = require('zlib');

function extractIcon(fileData, data, callback) {
    var iconpath = data.iconpath;
    if (iconpath.indexOf('./') !== 0) {
        iconpath = './' + data.iconpath;
    }

    var write = '/tmp/' + uuid.v4() + path.extname(data.iconpath).toLowerCase();
    var f = fs.createWriteStream(write)
    .on('finish', function() {
        data.icon = write;
        callback(null, data);
    });

    var found = false;
    streamifier.createReadStream(fileData)
    .on('error', function(err) {
        console.error(err);
        callback(null, data);
    })
    .pipe(zlib.Unzip())
    .pipe(tar.Parse())
    .on('entry', function(entry) {
        if (entry.path == iconpath) {
            entry.pipe(f);
            found = true;
        }
    })
    .on('end', function() {
        if (!found) {
            callback(null, data);
        }
    });
}

function parseJsonFile(stream, callback) {
    stream.on('data', function(fdata) {
        var str = fdata.toString();
        if (utils.isJson(str)) {
            callback(JSON.parse(str));
        }
        else {
            callback();
        }
    });
}

function parseXmlFile(stream, callback) {
    stream.on('data', function(fdata) {
        var str = fdata.toString();
        xml2js.parseString(str, {
            explicitArray: false,
            mergeAttrs: true,
            normalizeTags: true,
            normalize: true,
        }, function(err, result) {
            if (err) {
                callback();
            }
            else {
                callback(result);
            }
        });
    });
}

function parseIniFile(stream, callback) {
    stream.on('data', function(fdata) {
        var data = {};
        var desktop = fdata.toString().split('\n');

        var other = [];
        desktop.forEach(function(line) {
            var lline = line.toLowerCase().trim();
            if (!(lline[0] == '[' && lline[lline.length - 1] == ']') && lline.length > 0) {
                var pos = lline.indexOf('=');
                if (pos > -1) {
                    var key = lline.substring(0, pos).trim();
                    var value = line.substring(pos + 1).trim();
                    data[key] = value;
                }
                else {
                    other.push(line);
                }
            }
        });

        if (other.length > 0) {
            data.other = other;
        }

        callback(data);
    });
}

function parseData(fileData, data, icon, callback) {
    var potentialOgraWebapp = false;

    streamifier.createReadStream(fileData)
    .pipe(zlib.Unzip())
    .pipe(tarstream.extract())
    .on('entry', function(header, stream, cb) {
        var found = false;
        data.apps.forEach(function(app) {
            var scopeIni = data.name + '_' + app.name + '.ini';

            if (app.hooks.desktop && header.name == './' + app.hooks.desktop) {
                found = true;
                parseIniFile(stream, function(json) {
                    app.desktop = json ? json : {};

                    if (app.desktop.exec) {
                        if (app.desktop.exec.indexOf('webapp-container') === 0) {
                            /*
                            Check the arguments to webapp-container, if they contain
                            an external url as the main url the assume it's a webapp.
                            */

                            var webapp = false;
                            var exec = app.desktop.exec.replace('  ', ' ').replace('webapp-container', '').trim();

                            //Match spaces not encased in quotes: http://stackoverflow.com/a/16261693
                            var exec_split = exec.match(/(?:[^\s"]+|"[^"]*")+/g);
                            var args = minimist(exec_split, {default: {}});

                            if (args && args._) {
                                for (var index in args._) {
                                    if (
                                        typeof args._[index] === 'string' &&
                                        args._[index] && (
                                            args._[index].substring(0, 7) == 'http://' ||
                                            args._[index].substring(0, 8) == 'https://'
                                        )
                                    ) {
                                        webapp = true;
                                    }
                                }
                            }

                            if (webapp) {
                                app.type = 'webapp';
                            }
                        }
                    }

                    if (app.desktop.icon) {
                        data.iconpath = app.desktop.icon;
                    }

                    cb();
                });
            }
            else if (app.hooks.apparmor && header.name == './' + app.hooks.apparmor) {
                found = true;
                parseJsonFile(stream, function(json) {
                    app.apparmor = json ? json : {};
                    cb();
                });
            }
            else if (app.hooks['content-hub'] && header.name == './' + app.hooks['content-hub']) {
                found = true;
                parseJsonFile(stream, function(json) {
                    app.contentHub = json ? json : {};
                    cb();
                });
            }
            else if (app.hooks.urls && header.name == './' + app.hooks.urls) {
                found = true;
                parseJsonFile(stream, function(json) {
                    app.urlDispatcher = json ? json : [];
                    cb();
                });
            }
            else if (app.hooks['push-helper'] && header.name == './' + app.hooks['push-helper']) {
                found = true;
                parseJsonFile(stream, function(json) {
                    app.pushHelper = json ? json : {};
                    cb();
                });
            }
            else if (app.hooks['account-service'] && header.name == './' + app.hooks['account-service']) {
                found = true;
                parseXmlFile(stream, function(json) {
                    app.accountService = json ? json : {};
                    cb();
                });
            }
            else if (app.hooks['account-application'] && header.name == './' + app.hooks['account-application']) {
                found = true;
                parseXmlFile(stream, function(json) {
                    app.accountApplication = json ? json : {};
                    cb();
                });
            }
            else if (app.type == 'scope' && header.name.indexOf(scopeIni, header.name.length - scopeIni.length) !== -1) {
                found = true;
                parseIniFile(stream, function(json) {
                    app.scopeIni = json ? json : {};

                    if (app.scopeIni.icon) {
                        data.iconpath = header.name.replace(scopeIni, app.scopeIni.icon).replace('./', ''); //Assume the icon is relative to the ini file
                    }

                    cb();
                });
            }
            else if ((app.type == 'app' || app.type == 'webapp+') && header.name == './config.js') {
                //Detect the Ogra's alternate webapp container http://bazaar.launchpad.net/~ogra/alternate-webapp-container/trunk/files
                //Detect both the presence of a config.js file and Main.qml file with certain parameters

                stream.on('data', function(fdata) {
                    var str = fdata.toString();

                    if (
                        str.indexOf('var webappName') >= 0 &&
                        str.indexOf('var webappUrl') >= 0 &&
                        str.indexOf('var webappUrlPattern') >= 0
                    ) {
                        if (potentialOgraWebapp) {
                            app.type = 'webapp+';
                        }
                        else {
                            potentialOgraWebapp = true;
                        }
                    }

                    cb();
                });
            }
            else if ((app.type == 'app' || app.type == 'webapp+') && header.name == './qml/Main.qml') {
                //Detect the Ogra's alternate webapp container http://bazaar.launchpad.net/~ogra/alternate-webapp-container/trunk/files

                stream.on('data', function(fdata) {
                    var str = fdata.toString();

                    if (str.indexOf('WebView') >= 0) {
                        if (potentialOgraWebapp) {
                            app.type = 'webapp+';
                        }
                        else {
                            potentialOgraWebapp = true;
                        }
                    }

                    cb();
                });
            }
        });

        if (!found) {
            if (header.name == './webapp-properties.json') {
                stream.on('data', function(fdata) {
                    var webappProperties = fdata.toString();
                    if (utils.isJson(webappProperties)) {
                        webappProperties = JSON.parse(webappProperties);
                        data.webappProperties = webappProperties;
                        if (webappProperties.scripts && webappProperties.scripts.length > 0) {
                            data.webappInject = true;
                        }
                    }

                    cb();
                });
            }
            else if (header.name == './meta/package.yaml') {
                data.snappy = true;
                cb();
            }
            else if (header.name.indexOf('LC_MESSAGES') >= 0 && header.name.indexOf('.mo') >= 0) {
                var lang = header.name.replace('./share/locale/', '');
                lang = lang.substring(0, lang.indexOf('/LC_MESSAGES'));

                if (data.languages.indexOf(lang) == -1) {
                    data.languages.push(lang);
                }

                cb();
            }
            else {
                cb();
            }
        }

        stream.resume();
    })
    .on('error', function(err) {
        console.error(err);
        callback(err);
    })
    .on('finish', function() {
        if (icon && data.iconpath) {
            extractIcon(fileData, data, callback);
        }
        else {
            callback(null, data);
        }
    });
}

function parseControl(control, fileData, icon, callback) {
    var data = { //TODO make this an object and share it with the snappy parsing
        apps: [],
        architecture: 'all',
        description: '',
        framework: null,
        icon: null,
        iconpath: null,
        maintainer: null,
        maintainerEmail: null,
        name: null,
        permissions: [], //TODO add read/write paths
        snappy_meta: {},
        snappy: false,
        title: null,
        types: [],
        urls: [],
        version: null,
        webappInject: false,
        webappProperties: {},
        languages: [],
    };

    streamifier.createReadStream(control)
    .pipe(zlib.Unzip())
    .pipe(tarstream.extract())
    .on('entry', function(header, stream, cb) {
        if (header.name == './manifest') {
            var manifest = '';
            stream.on('data', function(fdata) {
                manifest += fdata.toString();
            });

            stream.on('end', function() {
                if (utils.isJson(manifest)) {
                    data.manifest = JSON.parse(manifest);

                    if (!data.manifest.hooks && data.manifest.type == 'oem') {
                        var snappy = new App(data.manifest.name, {});
                        snappy.type = 'snappy';
                        data.apps.push(snappy);
                    }
                    else if (!data.manifest.hooks || Object.keys(data.manifest.hooks).length === 0) {
                        cb('Manifest file does not have any hooks in it');
                    }
                    else {
                        for (var name in data.manifest.hooks) {
                            var hook = data.manifest.hooks[name];
                            var app = new App(name, hook);

                            if (hook.desktop) {
                                app.type = 'app';
                            }
                            else if (hook['bin-path'] || hook['snappy-systemd']) {
                                app.type = 'snappy';
                            }
                            else if (hook.scope) {
                                app.type = 'scope';
                            }
                            else if (hook['push-helper']) {
                                app.type = 'push';
                            }

                            data.apps.push(app);
                        }
                    }

                    cb();
                }
                else {
                    cb('Manifest file is not in a json format');
                }
            });
        }
        else {
            cb();
        }

        stream.resume();
    })
    .on('error', function(err) {
        callback(err);
    })
    .on('finish', function() {
        var maintainerEmail = '';
        if (data.manifest.maintainer) {
            var match = data.manifest.maintainer.match(/<.*>/);
            if (match && match.length == 1) {
                maintainerEmail = match[0].replace('<', '').replace('>', '').trim();
            }
        }

        if (data.manifest.architecture) {
            data.architecture = data.manifest.architecture;
        }

        data.description = data.manifest.description;
        data.framework = data.manifest.framework;
        data.maintainer = data.manifest.maintainer ? data.manifest.maintainer.replace(/<.*>/, '').trim() : '';
        data.maintainerEmail = maintainerEmail;
        data.name = data.manifest.name;
        data.title = data.manifest.title;
        data.version = data.manifest.version;

        parseData(fileData, data, icon, callback);
    });
}

module.exports = function parseClickPackage(filepath, iconOrCallback, callback) {
    var icon = iconOrCallback;
    if (typeof(icon) == 'function' && !callback) {
        callback = icon;
        icon = false;
    }

    var data = null;
    var control = null;

    var archive = new ar.Archive(fs.readFileSync(filepath));
    archive.getFiles().forEach(function(file) {
        if (file.name() == 'data.tar.gz') {
            data = file.fileData();
        }
        else if (file.name() == 'control.tar.gz') {
            control = file.fileData();
        }
    });

    if (data === null || control === null) {
        callback('Malformed click package');
    }
    else {
        parseControl(control, data, icon, function(err, data) {
            if (err) {
                callback(err);
            }
            else if (!data) {
                callback('Control data is undefined');
            }
            else {
                data.apps.forEach(function(app) {
                    //Check for legacy snappy apps
                    if (app.type == 'app' && data.snappy) {
                        app.type = 'snappy';
                    }

                    if (data.types.indexOf(app.type) == -1) {
                        data.types.push(app.type);
                    }

                    if (Object.keys(app.contentHub).length > 0) {
                        app.features.push('content_hub');
                    }

                    if (Object.keys(app.urlDispatcher).length > 0) {
                        app.features.push('url_dispatcher');
                    }

                    if (Object.keys(app.pushHelper).length > 0) {
                        app.features.push('push_helper');
                    }

                    if (Object.keys(app.accountService).length > 0) {
                        app.features.push('account_service');
                    }

                    if (app.type == 'webapp') {
                        app.webappProperties = data.webappProperties;
                        app.webappInject = data.webappInject;
                    }

                    if (app.apparmor && app.apparmor.policy_groups) {
                        data.permissions = data.permissions.concat(app.apparmor.policy_groups.filter(function(permission) {
                            return data.permissions.indexOf(permission) < 0;
                        }));
                    }

                    if (app.apparmor && app.apparmor.template == 'unconfined') {
                        data.permissions.push('unconfined');
                    }

                    if (app.urlDispatcher && Array.isArray(app.urlDispatcher)) {
                        app.urlDispatcher.forEach(function(ud) {
                            var url = '';
                            if (ud.protocol) {
                                url = ud.protocol + '://';
                                if (ud['domain-suffix']) {
                                    url += ud['domain-suffix'];
                                }

                                if (data.urls.indexOf(url) == -1) {
                                    data.urls.push(url);
                                }
                            }
                        });
                    }
                });

                delete data.iconpath;
                delete data.manifest;
                delete data.snappy;
                delete data.webappInject;
                delete data.webappProperties;

                callback(null, data);
            }
        });
    }
};
