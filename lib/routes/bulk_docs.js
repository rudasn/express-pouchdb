"use strict";

var utils = require('../utils');

module.exports = function (app) {
  // Bulk docs operations
  app.post('/:db/_bulk_docs', utils.jsonParser, function (req, res, next) {

    // Maybe this should be moved into the leveldb adapter itself? Not sure
    // how uncommon it is for important options to come through in the body
    // https://github.com/daleharvey/pouchdb/issues/435
    var opts = 'new_edits' in req.body ?
      { new_edits: req.body.new_edits } : {};
    opts = utils.makeOpts(req, opts);

    if (Array.isArray(req.body)) {
      return utils.sendJSON(res, 400, {
        error: "bad_request",
        reason: "Request body must be a JSON object"
      });
    }

    req.db.bulkDocs(req.body, opts, function (err, response) {
      if (err) {
        return utils.sendError(res, err);
      }
      utils.sendJSON(res, 201, response);
    });

  });
};
