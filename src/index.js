var parseSnapPackage = require('./snapParser.js');
var parseClickPackage = require('./clickParser.js');

var readChunk = require('read-chunk');
var fileType = require('file-type');

function parsePackage(filepath, iconOrCallback, callback) {
    var buf = readChunk.sync(filepath, 0, 262);
    var ft = fileType(buf);

    if (ft && ft.ext == 'deb') { //Click packages and old snaps are just debian files in disguise
        parseClickPackage(filepath, iconOrCallback, callback);
    }
    else {
        parseSnapPackage(filepath, iconOrCallback, callback);
    }
}

module.exports = parsePackage;
