function App(name, hooks) {
    this.name = name;
    this.type = 'app'; //app, webapp, scope, snappy, push
    this.features = []; //content_hub, url_dispatcher, push_helper, account_service
    this.desktop = {};
    this.apparmor = {};
    this.contentHub = {};
    this.urlDispatcher = [];
    this.pushHelper = {};
    this.accountService = {};
    this.accountApplication = {};
    this.webappProperties = {};
    this.webappInject = false;
    this.hooks = hooks;
}

exports.App = App;