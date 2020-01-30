var ibmdb = require('ibm_db');
var Promise = require('promise');
var _ = require('lodash');
var xmlParser = require('xml2js').parseString;
var config = require('../assets/config.js');

var DBConnStrings = config.db.connstr;
exports.eMember = eMember;
exports.readData = readData;
exports.getRMember = getRMember;
exports.getNRMember = getNRMember;
exports.documentDetails = documentDetails;
exports.document = documentData;
exports.bankdetails = bankdetails;
exports.InsertToVMMP = function(){};//InsertInVMMP;

function connect(env){
	env = (env || "DEFAULT").toUpperCase();
	var connStr = DBConnStrings[env];
	return new Promise(function(fulfill,reject){
		ibmdb.open(connStr, function(err,conn){
			if (err) return reject(err);
			else return fulfill(conn);
		});
	});
}

function execute(env,query){
	env = env || undefined;
	query = query || "SELECT '1' FROM sysibm.sysdummy1";
	return new Promise(function(fulfill,reject){
		connect(env).then(function connected(conn){
				conn.query(query, function (err, data) {
					if (err) {
						console.log('ERROR IN QUERY: ');
						console.log(err);
					}
					else console.log("QUERY EXECUTED SUCCESSFULLY");

					var queryError = err;
					conn.close(function () {
						if (queryError)
							reject(queryError);
						else fulfill(data);
					});
			  });
		},
		function error(err){return reject(err);}
		);
	});
}

function prepareForDB(value,key,obj){
	if (typeof value === "string")
		obj[key] = "'" + _.replace(value,/'/g,"''") + "'";
	else if (typeof value === "object")
		_.forOwn(obj[key],prepareForDB);
}

//************************* END POINT HANDLERS *************************

function getRMember(args){
	var args = args || {};
	var env = args.env || 'DEFAULT',
			status = args.status,
			noDocs = (args.noDocs == 'true');

	console.log('db.js: getRMember');
	var query = " SELECT M.*, P.*, Rand() AS IDX " +
							" FROM TEST.TESTMEMBER M " +
							" JOIN TEST.TESTPARTY P ON P.id = M.id " +
							" WHERE  M.reason IS NULL " +
							(status ? " AND M.status_id = " + status + " " : " ") +
							" AND P.rel_id IN (SELECT id FROM test.test-rel R WHERE  R.name IN ( 'TEST_NEW', 'TEST_INFORCE' )) " +
							(noDocs ? " AND P.ID NOT IN (SELECT PD.PARTY_ID FROM TEST.TEST_DOCUMENT PD) " : " ") +
							" AND M.NO IS NOT NULL " +
							" AND P.ID IS NOT NULL " +
							" ORDER  BY idx " +
							" FETCH first 1 ROWS only;";
	console.log(query);
	return execute(env,query);
}

function getNRMember(args){
	var args = args || {};
	var env = args.env || 'DEFAULT',
			status = args.status,
			noDocs = (args.noDocs == 'true');

	console.log('db.js: getNRMember');
	noDocs = (noDocs == 'true');
	var query = " SELECT M.*, P.*, Rand() AS IDX " +
							" FROM TEST.TESTMEMBER M " +
							" JOIN TEST.TESTPARTY P ON P.id = M.id " +
							" WHERE  M.reason IS NULL " +
							(status ? " AND M.status_id = " + status + " " : " ") +
							" AND P.rel_id IN (SELECT id FROM test.test-rel R WHERE  R.name NOT IN ( 'TEST_NEW', 'TEST_INFORCE' )) " +
							(noDocs ? " AND P.ID NOT IN (SELECT PD.PARTY_ID FROM TEST.TEST_DOCUMENT PD) " : " ") +
							" AND M.NO IS NOT NULL " +
							" AND P.ID IS NOT NULL " +
							" ORDER  BY idx " +
							" FETCH first 1 ROWS only;";
	console.log(query);
	return execute(env,query);
}

function readData(env){
	console.log('db.js: readData');
	var query = 'SELECT * FROM TEST.TESTMEMBER FETCH FIRST 20 ROWS ONLY';
	return execute(env,query);
}

function eMember(args){
	var args = args || {};
	var data = args.body || {},
			env = args.env || 'DEFAULT';

	console.log('db.js: eMember');

	_.forOwn(data, prepareForDB);
	console.log(data);

	var response = {"status": "Data Accepted"};

	var address = data.member.address || {}, phone = data.member.phone || {};
	var title = data.member.title || "''", firstName = data.member.firstName || "''";
	var lastName = data.member.lastName || "''", 	gender = data.member.gender || "''";
	var dateOfBirth = data.member.dateOfBirth || data.member.dob || "'" + (new Date()).toISOString().slice(0,10) + "'";
	var email = data.member.email || "''", addressLine1 = address.line1 || address.addressLine1 || 'null';
	var city = address.suburb || address.city || "null", state = address.state || "null";
	var postcode = address.postcode || "null";
	var mobile = phone.mobileNumber || phone.mobile || "null", workPhone = phone.workNumber || phone.work || "null";
	var homePhone = phone.homeNumber || phone.home || "null";
	var rn = data.rn || "'TESTMEMBER'";
	var nid = data.member.id || data.member.nid || "'" + "RA" + Math.floor(Math.random() * 1000000) + "'";

	var insertQuery = "INSERT INTO TEST.STAGING (RN, TYPE, REC, CN," +
		" N_ID, TITLE, FIRST_NAME, LAST_NAME, GENDER, DOB, EMAIL, MAILING_ADDRESS1, MAILING_ADDRESS2," +
		" MAILING_CITY, MAILING_STATE, MAILING_POSTCODE, MOBILE, WORK_PHONE, HOME_PHONE) " +
		" values ("+ rn +", 'TEST', 'TESTNR', null, " + nid +
		", " + title +", "+ firstName +", "+ lastName +", "+ gender +", "+ dateOfBirth +
		", "+ email +", "+ addressLine1 +" ,null, "+ city +" , "+ state +" , "+ postcode +
		", "+ mobile +", "+ workPhone +", "+ homePhone +")";

	console.log("*********** INSERT QUERY ***********");
	console.log(insertQuery);
	return new Promise(function(fulfill,reject){
		execute(env,insertQuery).then(function success(){fulfill(response);}, function error(err){reject(err);});
	});
}

function documentDetails(args){
	console.log(args);
	var args = args || {};
	var env = args.env || 'DEFAULT';
	var eno = args.eno || '';
	var tid = args.tid || '';

	console.log('db.js: documentDetails: ' + env + ' E: ' + eno + ' T: ' + tid);

	if (eno.length == 0 && tid.length == 0)
		return new new Promise(function(resolve, reject) {
			reject("Invalid Parameters");
		});

	var query = "SELECT M.NO,M.DNO,M.DYNO,M.NNO,M.EDATE,P.ID,P.CNO,P.EM,"
							+ "D.*,ACT.* FROM TEST.TESTMEMBER M "
							+ " JOIN TEST.TEST P ON P.ID = M.ID "
							+ " JOIN TEST.TEST_DOCUMENT PD ON PD.ID = P.ID "
							+ " JOIN TEST.TESTD D ON D.ID = PD.ID "
							+ " JOIN TEST.TEST_ACT_TYPE DAT ON DAT.DT_ID = D.ID "
							+ " JOIN TEST.TEST_ACT_TYPES ACT ON ACT.ID = DAT.AT_ID ";
	var whereClause = [];

	tid.length > 0 ? whereClause.push(" D.DT_ID = '" + tid + "' ") : "";
	eno.length > 0 ? whereClause.push(" M.DYNO = '" + eno + "' ") : "";

	query += (whereClause.length > 0 ? " WHERE " + whereClause.join(" AND ") : "");
	console.log(query);

	return execute(env,query);
}

function documentData(args){
	var args = args || {};
	var env = args.env || 'DEFAULT',
			tid = args.tid || "randominvalidvalue0923489723";

	console.log('db.js: doc');
	var query = "SELECT * FROM TEST.D WHERE DT_ID = '" + tid + "' FETCH FIRST 1 ROWS ONLY";
	console.log(query);
	return execute(env,query);
}

function bankdetails(args){
	var args = args || {};
	var env = args.env || 'DEFAULT',
			eno = args.eno || "randominvalidvalue0923489723";

	console.log('db.js: bd');
	var query = " SELECT M.VNO,M.DNO,M.DPNO,M.NNO,P.EMAIL,P.CNO,B.BS,B.BN,B.ACN,B.ACNO " +
							" FROM TEST.TEST P " +
							" JOIN TEST.TEST_DETAIL B ON B.PARTY_ID = P.ID " +
							" JOIN TEST.TEST_M M ON P.ID = M.PARTY_ID " +
							" WHERE M.DNO ='"+ eno +"'; ";
	console.log(query);
	return execute(env,query);
}

