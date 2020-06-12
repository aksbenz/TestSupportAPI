var Promise = require('promise');
var _ = require('lodash');
var db = require('./db.js');
var api = require('./api.js');

exports.default = function(args){
  return new Promise(function(fulfill, reject) {
    console.log('Default response handler');
    reject('Operation not defined');
  });
}

exports.eMember = db.eMember;
exports.getRMember = db.getRMember;
exports.getNRMember = db.getNRMember;
exports.documentDetails = db.documentDetails;
exports.document = db.document;
exports.bankdetails = db.bankdetails;
exports.waitForXpathToExist = api.waitForXpathToExist;
