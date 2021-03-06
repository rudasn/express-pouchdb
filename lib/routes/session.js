"use strict";

var utils = require('../utils'),
    uuids = require('../uuids');

module.exports = function (app) {
  //depends on auth.js

  function getUsersDB(req) {
    return utils.getUsersDB(app, req.PouchDB);
  }

  app.get('/_session', function (req, res, next) {
    utils.sendJSON(res, 200, req.couchSession);
  });

  function postHandler(req, res, next) {
    var name = req.body.name;
    var password = req.body.password;
    var opts = {
      sessionID: uuids(1)[0],
      admins: app.couchConfig.getSection("admins")
    };
    getUsersDB(req).then(function (db) {
      return db.logIn(name, password, opts);
    }).then(function (resp) {
      res.cookie('AuthSession', opts.sessionID, {httpOnly: true});
      utils.sendJSON(res, 200, resp);
    }).catch(function (err) {
      utils.sendError(res, err);
    });
  }
  app.post('/_session', utils.jsonParser, utils.urlencodedParser, postHandler);

  app.delete('/_session', function (req, res, next) {
    var sessionID = (req.cookies || {}).AuthSession;

    getUsersDB(req).then(function (db) {
      //no error handler necessary for log out
      return db.logOut({sessionID: sessionID});
    }).then(function (resp) {
      res.clearCookie('AuthSession');
      utils.sendJSON(res, 200, resp);
    });
  });
};
