var App = require('./app').App;
var fs = require('fs');
var ar = require('ar');
var zlib = require('zlib');
var tarstream = require('tar-stream');
var streamifier = require('streamifier');
var tar = require('tar');
var uuid = require('node-uuid');
var path = require('path');
var xml2js = require('xml2js');
var squashfs = require('squashfs-nodejs');
var tmp = require('tmp');
var yaml = require('js-yaml');
var rimraf = require('rimraf');
var readChunk = require('read-chunk');
var fileType = require('file-type');
var minimist = require('minimist')

function isJson(string) {
    var value = true;
    try {
        JSON.parse(string);
    }
    catch (e) {
        value = false;
    }

    return value;
}

function extractIcon(fileData, data, callback) {
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
        if (entry.path == './' + data.iconpath) {
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
        if (isJson(str)) {
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
                    var key = lline.substring(0, pos);
                    var value = line.substring(pos + 1);
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
                                for (index in args._) {
                                    if (args._[index] && (
                                        args._[index].substring(0, 7) == 'http://' ||
                                        args._[index].substring(0, 8) == 'https://'
                                    )) {
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
        });

        if (!found) {
            if (header.name == './webapp-properties.json') {
                stream.on('data', function(fdata) {
                    var webappProperties = fdata.toString();
                    if (isJson(webappProperties)) {
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
        if (icon) {
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
    };

    streamifier.createReadStream(control)
    .pipe(zlib.Unzip())
    .pipe(tarstream.extract())
    .on('entry', function(header, stream, cb) {
        if (header.name == './manifest') {
            stream.on('data', function(fdata) {
                var manifest = fdata.toString();
                if (isJson(manifest)) {
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

function parseClickPackage(filepath, iconOrCallback, callback) {
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
}

function parseSnappyPackage(filepath, iconOrCallback, callback) {
    var icon = iconOrCallback;
    if (typeof(icon) == 'function' && !callback) {
        callback = icon;
        icon = false;
    }

    tmp.dir(function(err, path, cleanupCallback) {
        if (err) {
            callback(err);
        }
        else {
            squashfs.unsquashfs(filepath, path + '/snap', function(err) {
                if (err) {
                    callback(err);
                }
                else {
                    fs.readFile(path + '/snap/meta/snap.yaml', function(err, contents) {
                        if (err) {
                            rimraf(path + '/snap', function() {
                                cleanupCallback();

                                callback('Malformed or missing snap.yaml file (' + err + ')');
                            });
                        }
                        else {
                            var json = yaml.safeLoad(contents);

                            var data = {
                                apps: [],
                                architecture: json.architectures ? json.architectures : [],
                                description: json.description ? json.description : null,
                                framework: null, //Snaps don't have frameworks
                                icon: null,
                                maintainer: null, //Snaps don't seem to have maintainer names
                                maintainerEmail: json.vendor ? json.vendor : null,
                                name: json.name ? json.name : null,
                                permissions: [],
                                snappy_meta: json,
                                title: json.name ? json.name : null,
                                types: ['snappy'],
                                urls: [], //Snaps don't have urls
                                version: json.version ? json.version : null,
                            };

                            if (json.apps) {
                                for (var name in json.apps) {
                                    var snappy = new App(name, {});
                                    snappy.daemon = json.apps[name].daemon ? json.apps[name].daemon : false;
                                    snappy.command = json.apps[name].command ? json.apps[name].command : false;

                                    //TODO handle more advanced cases
                                    if (json.apps[name].plugs) {
                                        for (var index in json.apps[name].plugs) {
                                            if (data.permissions.indexOf(json.apps[name].plugs[index]) == -1) {
                                                data.permissions.push(json.apps[name].plugs[index]);
                                            }
                                        }
                                    }

                                    data.apps.push(snappy);
                                }
                            }

                            if (icon && json.icon) {
                                var input = path.join(path, 'snap', json.icon);
                                var output = '/tmp/' + uuid.v4() + path.extname(json.icon).toLowerCase();

                                fs.rename(input, output, function(err) {
                                    if (err) {
                                        rimraf(path + '/snap', function() {
                                            cleanupCallback();

                                            callback('Failed to extract icon (' + err + ')', data);
                                        });
                                    }
                                    else {
                                        data.icon = output;
                                        callback(null, data);
                                    }
                                });
                            }
                            else {
                                rimraf(path + '/snap', function() {
                                    cleanupCallback();

                                    callback(null, data);
                                });
                            }
                        }
                    });
                }
            });
        }
    });
}

function parsePackage(filepath, iconOrCallback, callback) {
    var buf = readChunk.sync(filepath, 0, 262);
    var ft = fileType(buf);

    if (ft && ft.ext == 'deb') { //Click packages and old snaps are just debian files in disguise
        parseClickPackage(filepath, iconOrCallback, callback);
    }
    else {
        parseSnappyPackage(filepath, iconOrCallback, callback);
    }
}

module.exports = parsePackage;
