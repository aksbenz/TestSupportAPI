var restify = require('restify');
var ibmdb = require('ibm_db');
var SwaggerParser = require('swagger-parser');
var _ = require('lodash');
var fs = require('fs');
var routemap =  require('./routes/mapper.js')
const uuidv1 = require('uuid/v1');

process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = 0;

var port = process.argv[2] || 8040;
var apispecFilepath = __dirname + '/assets/apispec.json';
var validRequestTypes = ['post','get','put'];

var server = restify.createServer({name: 'TestHelperServices'});
server.use(restify.bodyParser({mapFiles: true}));
server.use(restify.queryParser());

// ENABLE CORS to allow making calls from Swagger UI/Editor
server.use(restify.CORS());

// Generate Restify Endpoints for all Swagger spec paths
SwaggerParser.validate(apispecFilepath)
	.then(function(api){
		_.forOwn(api.paths,function(path,key){
			
			//Convert path parameter from format {param} to :param required by restify
			var endpoint = key.replace(/({)([A-Za-z][A-Za-z0-9]+)(})/g,':$2');
			var requestTypes = _.intersection(_.keys(path),validRequestTypes) || ['get'];
			requestTypes.forEach(function(requestType){
			// var requestType = _.head(_.intersection(_.keys(path),validRequestTypes)) || 'get';
				var pathObject = path[requestType];

				// If Request Type not defined in spec or not part of allowed list
				// then return error response
				if (!pathObject)
					return next(new restify.MethodNotAllowedError('Method Not Found'));

				// the OperationId defined in Spec must be defined in mapper.js module
				var operation = routemap[pathObject.operationId] || routemap.default;

				// Get parameter names as an array from parameters in Spec
				var params = pathObject.parameters.map(function(param){return param.name});
				var requiredParams = pathObject.parameters.reduce(function(acc,value){if (value.required) acc.push(value.name); return acc; },[]);

				console.log(requestType + " " + endpoint + " : " + pathObject.operationId + " : " + params );

				// Define the endpoint
				server[requestType](endpoint,function(req,res,next){			
					console.log("\n*******************************************************************");
					let reqId = uuidv1();
					console.log('GOT REQUEST: ' + endpoint + " --- " + reqId);
					console.log('Expected Params:' + params);

					// Create a parameter object with values from Request OR Default Values in spec
					// for all parameters defined in Swagger Spec
					// format: {'param1':'value','param2':'value2'}
					var opArgs = params.reduce(function(acc,value){
						var defaultValue = pathObject.parameters.find(function(param){return param.name === value}).default;
						if(value == 'body')
							acc[value] = req.body;
						else if (req.params[value] || defaultValue) // Ignore parameter if not sent and default value is also undefined
							acc[value] = req.params[value] || defaultValue;
						return acc;
					},{});
					console.log('Received Params: ' + JSON.stringify(opArgs));
					console.log('Required Params: ' + requiredParams);

					if (_.keys(opArgs).length < requiredParams.length){
						console.log('ERROR ---' + reqId); 
						return next(new restify.BadRequestError('Following Parameters Mandator: ' + requiredParams));
					}
					else
					{
						// Invoke the handler function with parameter object as argument
						// Operation function must return a Promise
						try {
							operation(opArgs).then(
								function success(result){
									console.log('Success --- ' + reqId);
									console.log("*******************************************************************\n");
									res.send(result);next();},
								function error(err){
									console.log('ERROR ---' + reqId); 
									console.log("\n*******************************************************************");
									return next(new restify.InternalServerError(err));							
								});
						} catch (e) {
							console.log(e);
							return next(new restify.InternalServerError(e));
						}
					}
				});
			});
    	});

		// Define a route to retrieve the SPEC file to be used in Swagger UI/Editor
		function getAPISpec(req, res, next){
			res.send(JSON.parse(fs.readFileSync(apispecFilepath, 'utf8')));
			next();
		}
		server.get('apispec',getAPISpec);
		server.get(':env/apispec',getAPISpec);

		server.listen(port, function() {
			console.log('%s listening at %s', server.name, 'http://localhost:' + port);
			process.send = process.send || function () {};
			process.send('running');
		});
	})
	.catch(function(err){
		console.log("Error in Parsing Swagger Spec File");
		console.log(err);
	});
