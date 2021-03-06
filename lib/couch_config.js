"use strict";

var fs       = require('fs'),
    path     = require('path'),
    util     = require('util'),
    events   = require('events'),
    extend   = require('extend'),
    Auth     = require('pouchdb-auth');

function CouchConfig(file) {
  events.EventEmitter.call(this);

  this._file = file;
  this._tempFile = path.dirname(this._file) + '/.' + path.basename(this._file);
  this._config = readConfig(this._file);
  this._defaults = {};

  // Hashes admin passwords in 'file' (if necessary)
  this._save();
}

util.inherits(CouchConfig, events.EventEmitter);
module.exports = CouchConfig;

function readConfig(file) {
  if (fs.existsSync(file)) {
    return JSON.parse(fs.readFileSync(file));
  }
  return {};
}

CouchConfig.prototype._save = function (callback) {
  var self = this;

  if (typeof callback !== "function") {
    callback = function () {};
  }

  function write() {
    // Pretty print
    var json = JSON.stringify(self._config, null, 2) + '\n';
    fs.writeFile(self._tempFile, json, function () {
      fs.rename(self._tempFile, self._file, callback);
    });
  }
  if (self._config.admins) {
    Auth.hashAdminPasswords(self._config.admins).then(function (admins) {
      self._config.admins = admins;

      write();
    });
  } else {
    write();
  }
};

CouchConfig.prototype.get = function (section, key) {
  if (this._config[section] && this._config[section][key]) {
    return this._config[section][key];
  } else {
    // fall back on defaults
    if (this._defaults[section] && this._defaults[section][key]) {
      return this._defaults[section][key];
    } else {
      return undefined;
    }
  }
};

CouchConfig.prototype.getAll = function () {
  return extend(true, {}, this._defaults, this._config);
};

CouchConfig.prototype.getSection = function (section) {
  return extend(true, {}, this._defaults[section], this._config[section]);
};

CouchConfig.prototype.set = function (section, key, value, callback) {
  var previousValue;
  if (!this._config[section]) {
    this._config[section] = {};
  } else {
    previousValue = this._config[section][key];
  }
  this._config[section][key] = value;

  this._changed(section, key, previousValue, callback);
};

CouchConfig.prototype._changed = function (section, key, prevVal, callback) {
  var self = this;

  self._save(function (err) {
    if (err) {
      return callback(err);
    }

    // run event handlers
    self.emit(section + "." + key);

    callback(null, prevVal);
  });
};

CouchConfig.prototype.delete = function (section, key, callback) {
  var previousValue = (this._config[section] || {})[key];
  if (typeof previousValue !== "undefined") {
    delete this._config[section][key];
    if (!Object.keys(this._config[section]).length) {
      delete this._config[section];
    }
  }

  this._changed(section, key, previousValue, callback);
};

CouchConfig.prototype.registerDefault = function (section, key, value) {
  this._defaults[section] = this._defaults[section] || {};
  this._defaults[section][key] = value;
};
