const request = require('superagent');
const parseString = require('xml2js').parseString;
const xmlpath = require('xpath');
const dom = require('xmldom').DOMParser;
const Promise = require('promise');
const config = require('../assets/config.js');

process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = 0;

exports.waitForXpathToExist = function({env = 'DEFAULT',url,repeat,interval,timeout,body:xml,xpath}){
	interval = interval < 250 ? 1000 : interval;

	if (!url || !xml || !xpath)
		return new Promise(function(fulfill,reject){reject("Invalid Parameters")});
	return repeatTillSuccess(repeat,interval, xpathExists,{'url':url, 'xml': xml, 'xpath': xpath});
};

function repeatTillSuccess(repeat,interval,toRepeat,args){
	console.log('API.js repeatTillSuccess');
	return new Promise(function(fulfill,reject){
		var executedTimes = 0;
		var _flagCheck = setInterval(function() {
			toRepeat(args).done(function success(result){
				console.log('************** INTERVAL SUCCESS **************');
				clearInterval(_flagCheck);
				fulfill(result);
			},
			function error(err){
				console.log('************** INTERVAL REPEAT ************** : ' + executedTimes);
				if (executedTimes++ > repeat)
				{
					console.log('************** INTERVAL TIMEOUT **************');
					clearInterval(_flagCheck);
					reject(err);
				}
			});
		}, interval);
	});
}

// params: {email, interval, times}
exports.waitForActivation = function(env,email,times,interval){
	console.log('API.js waitForActivation');
	var executedTimes = 0;
	var _flagCheck = setInterval(function() {
		executedTimes++;
		checkActivation(email).done(function success(result){
			console.log('INTERVAL SUCCESS');
			clearInterval(_flagCheck);
			res.send(result);
			next();
		},
		function error(err){
			console.log('INTERVAL REPEAT');
			if (executedTimes >= params.times)
			{
				console.log('INTERVAL TIMEOUT');
				clearInterval(_flagCheck);
				res.send(err);
				next();
			}
		});
	}, params.interval);
}

function xpathExists({url, xml, xpath}){
	console.log('api: xpathExists');
	return new Promise(function(fulfill,reject){
		console.log('SENDING REQUEST');
		request
			.post(url)
			.buffer(true)
			.send(xml)
			.set('Content-Type','text/xml')
			.end(function(err,response){
				console.log('Request END');
				if (err)
					reject(err);
				else{
					console.log(response.text);
					let doc = new dom().parseFromString(response.text);
					let nodes = xmlpath.select(xpath,doc);
					if (nodes && nodes.length > 0)
						fulfill("Xpath found");
					else
						reject("XPATH not found");
				}
			});
	});
}

function checkActivation(email){
console.log('In check: ' + email);
var umsRequest = `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"">
	   <soapenv:Header/>
	   <soapenv:Body>
		  <ser:searchUserRequest>
			 <source>SOURCE</source>
			 <userType></userType>
			 <userDetails>
				<userName></userName>
				<userId></userId>
				<userDN></userDN>
				<email>` + email + `</email>
			 </userDetails>
		  </ser:searchUserRequest>
	   </soapenv:Body>
	</soapenv:Envelope>`;

	return new Promise(function(fulfill,reject){
		console.log('SENDING REQUEST');
		console.log(env);
		request
		.post('https://test.service.com:9444/restapi-test-service/User')
		.send(umsRequest)
		.set('Content-Type','text/xml')
		.end(function(err,response){
			console.log('Request END');
			if (err)
				reject(err);
			else{
				parseString(response.text,function(err, result){
					console.log('ParseString Done');
					if (err)
						reject(err);
					var status = result["soapenv:Envelope"]["soapenv:Body"]["0"]["ns2:searchUserResponse"]["0"].userDetails["0"].userStatus[0];
					if (status == "I")
						fulfill(status);
					else
						reject(status);
				});
			}
		});
	});
}
