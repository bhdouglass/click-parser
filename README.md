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
            apps: Array of detailed app objects
                {
                    name: String of the internal name of this app
                    type: String of the apps type (app, webapp, scope, snappy, push)
                    features: Array of String of the app's special features (content_hub, url_dispatcher, push_helper, account_service)
                    desktop: Object of the app's desktop file (if one exists) (the keys are lowercase)
                    scopeIni: Object of the scope's ini file (if one exists) (the keys are lowercase)
                    apparmor: Object of the app's apparmor file
                    contentHub: Object of the app's content hub file (if it exists)
                    pushHelper: Object of the app's push helper file (translated from xml) (if it exists)
                    accountApplication: Object of the app's account application file (translated from xml) (if it exists)
                    accountService: Object of the app's account service file (translated from xml) (if it exists)
                    urlDispatcher: Array of the app's url dispatcher file (if it exists)
                    webappProperties: Object of the app's webapp properties (if it exists)
                    webappInject: Boolean, whether or not the webapp is injecting a js script (only applicable to type == 'webapp')
                    hooks: Object of the hooks for this app listed in the click's manifest
                }
            architecture: String of the click file's architecture (all, armhf, i386, or x86_64)
            description: String of the click's description
            framework: String of the click's framework (ex: ubuntu-sdk-15.04)
            icon: Path to the icon file (if the second argument to parse() is true)
            maintainer: The maintainers full name
            maintainerEmail: The maintainer's email address
            name: String name of the click
            permissions: Array of Strings of all the permissions of all the apps
            title: String title of the click
            types: Array of Strings of the types of all the apps
            urls: Array of Strings of the urls handled by all the apps
            version: String of the click's version
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
