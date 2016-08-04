var App = require('./app');

var fs = require('fs');
var rimraf = require('rimraf');
var squashfs = require('squashfs-nodejs');
var tmp = require('tmp');
var uuid = require('node-uuid');
var yaml = require('js-yaml');

module.exports = function parseSnapPackage(filepath, iconOrCallback, callback) {
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
};
