# Click Parser #

Extract data from Ubuntu's click packages

## Install ##

`npm install --save click-parser`

## Usage ##

~~~
var parse = require('click-parser');

parse('/path/to/click/file.click', function(err, data) {
    if (err) {
        console.error(err);
    }
    else {
        console.log(data);
        /*
        {
            architecture: String of the click file's architecture (all, armhf, i386, or x86_64)
            desktopFiles: Array of strings of desktop files within the click package
            framework: String of the click's framework (ex: ubuntu-sdk-15.04)
            icon: Path to the icon file (if the second argument to parse() is true)
            iconpath: Path to the icon file within the click
            maintainer: The maintainers full name
            maintainerEmail: The maintainer's email address
            manifest: Object with the manifest.json file's contents
            name: String name of the click
            title: String title of the click
            types: Array of strings of the package's types (application, webapp, or scope)
            version: String of the click's version
            webappInject: Boolean, whether or not the webapp is injecting a js script
            webappProperties: Object with the webapp-properties.json file's content (if it exists)
        }
        */
    }
});

//Also extract the icon into /tmp
parse('/path/to/click/file.click', true, function(err, data) {});
~~~

## License ##

Copyright (C) 2015 [Brian Douglass](http://bhdouglass.com/)

This program is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License version 3, as published
by the Free Software Foundation.

This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranties of MERCHANTABILITY, SATISFACTORY QUALITY, or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU General Public License for more details.

You should have received a copy of the GNU General Public License along with this program.  If not, see <http://www.gnu.org/licenses/>.
