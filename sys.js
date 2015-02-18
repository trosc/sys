/* Copyright: http://cdn.trosc.com/appsys-copyright.txt */
(function () {

	// GLOBAL
	var Fn = Function, global = Fn('return this')();

	// NAMESPACES
	var generateImports = function(obj) {
		return function(scope) {
			if(!scope) {
				scope = global;
			}

			for (var key in obj){
				if(obj.hasOwnProperty(key)
						&& !scope.hasOwnProperty(key)
						&& key !== "imports"
							&& key !== "namespace"
								&& key !== "require") {
					scope[key] = obj[key];
				}
			}
		};
	};

	var requireNamespace = function(ns,key) {
		if(typeof ns[key] === "undefined") {
			throw new ProgrammingError("'" + key + "' has not been loaded");
		} 
		return ns[key];
	};

	var createNamespace = function(parent,key) {
		if(typeof parent === "object" && typeof parent[key] === "object") {
			return parent[key];
		}

		var namespace = {};
		namespace["imports"] = generateImports(namespace);
		namespace["namespace"] = function(subKey) {
			return createNamespace(namespace,subKey);
		};
		namespace["require"] = function(subKey) {
			return requireNamespace(namespace,subKey);
		};

		if(typeof parent === "object") {
			parent[key] = namespace;
		}

		return namespace;
	};

	// TROSC NAMESPACE 
	var trosc = global.trosc = global.trosc || createNamespace();

	// SYS NAMESPACE
	var sys = trosc.namespace("sys");

	{
		sys.global = global;
		sys.action = function(actionFn) {
			return function() {
				var errorFn = arguments[arguments.length-1];

				try {
					actionFn.apply(this, arguments);
				} catch(err) {
					errorFn(err);
				}
			};
		};
		sys.deferResult = function(res,responseFn) {
			sys.defer(function() {
				responseFn(res);
			});
		};
		sys.deferError = function(res,responseFn) {
			sys.defer(function() {
				responseFn(res);
			});
		};
	}

	// ERROR NAMESPACE
	var error = trosc.namespace("error");

	{
		var _errors = {};
		var makeError = function(code) {
			var errorType = _errors[code];

			if(errorType) {
				return errorType;
			}

			errorType = function(message,payload) {
				Error.call(this); 
				this.stack = this.stack || new Error("").stack;
				this.error_code = code;
				this.message = message;
				this.payload = payload;
			};
			errorType.prototype = Error.prototype;

			_errors[code] = errorType;

			return errorType;
		};

		error.require = makeError;
	}

	var ProgrammingError = makeError("ProgrammingError");
	var ArgumentError = makeError("ArgumentError");
	var InputError = makeError("InputError");
	var ResponseError = makeError("ResponseError");
	var RequestError = makeError("RequestError");
	var HTTPResponseError = makeError("HTTPResponseError");
	var NotImplementedError = makeError("NotImplementedError");

	// TYPE NAMESPACE
	var type = trosc.namespace("type");

	{
		var getType = function (o) {

			// handle null in old IE
			if (o === null) {
				return 'null';
			}

			// handle DOM elements
			if (o && (o.nodeType === 1 || o.nodeType === 9)) {
				return 'element';
			}

			var s = Object.prototype.toString.call(o);
			var typeName = s.match(/\[object (.*?)\]/)[1].toLowerCase();

			// handle NaN and Infinity
			if (typeName === 'number') {
				if (isNaN(o)) {
					return 'nan';
				}
				if (!isFinite(o)) {
					return 'infinity';
				}
			}

			return typeName;
		};

		type.getType = getType;

		var isFunctions = [
		                   'Null',
		                   'Undefined',
		                   'Object',
		                   'Array',
		                   'String',
		                   'Number',
		                   'Boolean',
		                   'Function',
		                   'RegExp',
		                   'Element',
		                   'NaN',
		                   'Infinite'
		                   ];

		var createTypeFn = function(typeName) {
			return function (o) {
				return getType(o) === typeName;
			};
		};

		for(var i = 0; i < isFunctions.length; i++) {
			var typeName = isFunctions[i];
			var typeNameLow = typeName.toLowerCase();

			type['is' + typeName] = createTypeFn(typeNameLow);
		};

		var argCheckList = function(arg,checks) {
			for(var i = 0; i < checks.length; i++) {
				var check = checks[i];

				if(argCheck(arg,check)) {
					return true;
				}
			}

			return false;
		};

		var argCheck = function(arg,check,i) {
			if(type.isArray(check)) {
				return argCheckList(arg,check);
			}

			if(type.isString(check)) {
				return check == getType(arg);
			} else if(type.isFunction(check)) {
				return check.apply(this, [arg]);
			} else {
				throw new ProgrammingError("invalid type " + (i+1) + " in check list: " + getType(check));
			}
		};

		type.check = function() {
			var args = arguments[0];

			if(arguments.length != args.length + 1) {
				throw new ProgrammingError("invalid number of arguments in type check list");
			}

			for(var i = 1; i < arguments.length; i++) {
				var check = arguments[i];
				var argIndex = i-1;
				var arg = args[argIndex];

				if(type.isArray(check)) {
					if(!argCheckList(arg,check)) {
						throw new ProgrammingError("argument " + (argIndex+1) + " has invalid type " + getType(arg));
					}
				} else {
					if(!argCheck(arg,check,argIndex)) {
						throw new ProgrammingError("argument " + (argIndex+1) + " has invalid type " + getType(arg));
					}
				}
			}
		};

		type.containsTypes = function() {
			var args = arguments[0];

			if(arguments.length != args.length + 1) {
				throw new ProgrammingError("invalid number of arguments in type check list");
			}

			for(var i = 1; i < arguments.length; i++) {
				var check = arguments[i];
				var argIndex = i-1;
				var arg = args[argIndex];

				if(type.isArray(check)) {
					if(!argCheckList(arg,check)) {
						return false;
					}
				} else {
					if(!argCheck(arg,check,argIndex)) {
						return false;
					}
				}
			}

			return true;
		};
	}

	var isNull = type.isNull;
	var isUndefined = type.isUndefined;
	var isObject = type.isObject;
	var isArray = type.isArray;
	var isString = type.isString;
	var isNumber = type.isNumber;
	var isBoolean = type.isBoolean;
	var isFunction = type.isFunction;
	var isRegExp = type.isRegExp;
	var isElement = type.isElement;
	var isInfinite = type.isInfinite;

	// Start / close functions
	var closeFn;
	var mainFn;

	var setOnStart = function(fn) {
		if(!isFunction(fn)) {
			throw new ProgrammingError("main() must have a function as its parameter");   
		}
		mainFn = fn;
	};

	var setOnClose = function(fn) {
		if(!isFunction(fn)) {
			throw new ProgrammingError("close() must have a function as its parameter");   
		}
		closeFn = fn;
	};

	sys.main              = setOnStart;
	sys.close             = setOnClose;
	
	sys.address_separator = ';';

	// legacy errors
	sys.ProgrammingError  = ProgrammingError;
	sys.ArgumentError     = ArgumentError;
	sys.InputError        = InputError;
	sys.ResponseError     = ResponseError;
	sys.RequestError      = RequestError;
	sys.HTTPResponseError = HTTPResponseError;
	sys.NotImplementedError = NotImplementedError;

	// RANDOM
	{
		var width = 256;
		var mask = 0xff;
		var chunks = 6;
		var digits = 52;
		var startdenom = Math.pow(width, chunks);
		var significance = Math.pow(2, digits);
		var overflow = significance * 2;

		function ARC4(key) {
			var t, keylen = key.length,
			me = this, i = 0, j = me.i = me.j = 0, s = me.S = [];

			// The empty key [] is treated as [0].
			if (!keylen) { key = [keylen++]; }

			// Set up S using the standard key scheduling algorithm.
			while (i < width) {
				s[i] = i++;
			}
			for (i = 0; i < width; i++) {
				s[i] = s[j = mask & (j + key[i % keylen] + (t = s[i]))];
				s[j] = t;
			}

			// The "g" method returns the next (count) outputs as one number.
			(me.g = function(count) {
				// Using instance members instead of closure state nearly doubles speed.
				var t, r = 0,
				i = me.i, j = me.j, s = me.S;
				while (count--) {
					t = s[i = mask & (i + 1)];
					r = r * width + s[mask & ((s[i] = s[j = mask & (j + t)]) + (s[j] = t))];
				}
				me.i = i; me.j = j;
				return r;
			})(width);
		};

		function generateKeyFromSeed(seed) {
			var key = [];
			var stringseed = seed + '', smear, j = 0;
			while (j < stringseed.length) {
				key[mask & j] =
					mask & ((smear ^= key[mask & j] * 19) + stringseed.charCodeAt(j++));
			}
			return key;
		}

		var arc4 = new ARC4(generateKeyFromSeed(global.seed));

		Math.random = function() {         // Closure to return a random double:
			var n = arc4.g(chunks),             // Start with a numerator n < 2 ^ 48
			d = startdenom,                 //   and denominator d = 2 ^ 48.
			x = 0;                          //   and no 'extra last byte'.
			while (n < significance) {          // Fill up all significant digits by
				n = (n + x) * width;              //   shifting numerator and
				d *= width;                       //   denominator and generating a
				x = arc4.g(1);                    //   new least-significant-byte.
			}
			while (n >= overflow) {             // To avoid rounding up, before adding
				n /= 2;                           //   last byte, shift everything
				d /= 2;                           //   right using integer math until
				x >>>= 1;                         //   we have exactly the desired bits.
			}
			return (n + x) / d;                 // Form the number within [0, 1).
		};

		var HEX_CHARS = "0123456789abcdef".split(''); 

		var uuid = function(msg) {
			var uuid = new Array(36);

			for (var i = 0; i < 36; i++) {
				uuid[i] = HEX_CHARS[arc4.g(1) & 0xf];
			}

			// rfc4122 requires these characters
			uuid[8] = uuid[13] = uuid[18] = uuid[23] = '-';
			uuid[14] = '4';
			uuid[19] = HEX_CHARS[(arc4.g(1) & 0x3) | 0x8]; 

			return uuid.join("");
		};

		sys.randomhex = function(n) {
			if(!type.isNumber(n)) {
				n = 1;
			}
			
			var result = "";
			
			for(var i = 0; i < n; i++) {
				result += HEX_CHARS[arc4.g(1) & 0xf];
			}
			
			return result;
		};
 
		// For robust unpredictability discard an initial batch of values.
		// See http://www.rsa.com/rsalabs/node.asp?id=2009
        arc4.g(10);

		sys.uuid = uuid;
	}

	// PRINTF
	var sprintf = (function() {
		var get_type = function(variable) {
			return Object.prototype.toString.call(variable).slice(8, -1).toLowerCase();
		}
		var str_repeat = function(input, multiplier) {
			for (var output = []; multiplier > 0; output[--multiplier] = input) {/* do nothing */}
			return output.join('');
		}

		var str_format = function() {
			if (!str_format.cache.hasOwnProperty(arguments[0])) {
				str_format.cache[arguments[0]] = str_format.parse(arguments[0]);
			}
			return str_format.format.call(null, str_format.cache[arguments[0]], arguments);
		};

		str_format.format = function(parse_tree, argv) {
			var cursor = 1, tree_length = parse_tree.length, node_type = '', arg, output = [], i, k, match, pad, pad_character, pad_length;
			for (i = 0; i < tree_length; i++) {
				node_type = get_type(parse_tree[i]);
				if (node_type === 'string') {
					output.push(parse_tree[i]);
				}
				else if (node_type === 'array') {
					match = parse_tree[i]; // convenience purposes only
					if (match[2]) { // keyword argument
						arg = argv[cursor];
						for (k = 0; k < match[2].length; k++) {
							if (!arg.hasOwnProperty(match[2][k])) {
								throw(sprintf('[sprintf] property "%s" does not exist', match[2][k]));
							}
							arg = arg[match[2][k]];
						}
					}
					else if (match[1]) { // positional argument (explicit)
						arg = argv[match[1]];
					}
					else { // positional argument (implicit)
						arg = argv[cursor++];
					}

					if (/[^s]/.test(match[8]) && (get_type(arg) != 'number')) {
						throw(sprintf('[sprintf] expecting number but found %s', get_type(arg)));
					}
					switch (match[8]) {
					case 'b': arg = arg.toString(2); break;
					case 'c': arg = String.fromCharCode(arg); break;
					case 'd': arg = parseInt(arg, 10); break;
					case 'e': arg = match[7] ? arg.toExponential(match[7]) : arg.toExponential(); break;
					case 'f': arg = match[7] ? parseFloat(arg).toFixed(match[7]) : parseFloat(arg); break;
					case 'o': arg = arg.toString(8); break;
					case 's': arg = ((arg = String(arg)) && match[7] ? arg.substring(0, match[7]) : arg); break;
					case 'u': arg = Math.abs(arg); break;
					case 'x': arg = arg.toString(16); break;
					case 'X': arg = arg.toString(16).toUpperCase(); break;
					}
					arg = (/[def]/.test(match[8]) && match[3] && arg >= 0 ? '+'+ arg : arg);
					pad_character = match[4] ? match[4] == '0' ? '0' : match[4].charAt(1) : ' ';
					pad_length = match[6] - String(arg).length;
					pad = match[6] ? str_repeat(pad_character, pad_length) : '';
					output.push(match[5] ? arg + pad : pad + arg);
				}
			}
			return output.join('');
		};

		str_format.cache = {};

		str_format.parse = function(fmt) {
			var _fmt = fmt, match = [], parse_tree = [], arg_names = 0;
			while (_fmt) {
				if ((match = /^[^\x25]+/.exec(_fmt)) !== null) {
					parse_tree.push(match[0]);
				}
				else if ((match = /^\x25{2}/.exec(_fmt)) !== null) {
					parse_tree.push('%');
				}
				else if ((match = /^\x25(?:([1-9]\d*)\$|\(([^\)]+)\))?(\+)?(0|'[^$])?(-)?(\d+)?(?:\.(\d+))?([b-fosuxX])/.exec(_fmt)) !== null) {
					if (match[2]) {
						arg_names |= 1;
						var field_list = [], replacement_field = match[2], field_match = [];
						if ((field_match = /^([a-z_][a-z_\d]*)/i.exec(replacement_field)) !== null) {
							field_list.push(field_match[1]);
							while ((replacement_field = replacement_field.substring(field_match[0].length)) !== '') {
								if ((field_match = /^\.([a-z_][a-z_\d]*)/i.exec(replacement_field)) !== null) {
									field_list.push(field_match[1]);
								}
								else if ((field_match = /^\[(\d+)\]/.exec(replacement_field)) !== null) {
									field_list.push(field_match[1]);
								}
								else {
									throw('[sprintf] huh?');
								}
							}
						}
						else {
							throw('[sprintf] huh?');
						}
						match[2] = field_list;
					}
					else {
						arg_names |= 2;
					}
					if (arg_names === 3) {
						throw('[sprintf] mixing positional and named placeholders is not (yet) supported');
					}
					parse_tree.push(match);
				}
				else {
					throw('[sprintf] huh?');
				}
				_fmt = _fmt.substring(match[0].length);
			}
			return parse_tree;
		};

		return str_format;
	})();

	sys.sprintf = sprintf;
 
    // LOGGING
    {
    	function SysLogger(config) {
    		var _logLines = [];

    	    this.log = function(line) {
    	    	if(isString(line)) {
    	    		line = { message : line };
    	    	}
    	    	if(!isString(line.message)) {
    	    		throw new ProgrammingError("no message in log line");
    	    	}
    	    	if(!isNumber(line.level)) {
    	    		line.level = 1;
    	    	}
    	    	if(!isNumber(line.time)) {
                	line.time = new Date().getTime();
    	    	}
                _logLines.push(line);
    	    };

    	    this.getLines = function() {
    	    	return _logLines;
    	    };

    	    this.removeLines = function(maxLinesToRemove) {
    	    	var lines;

    	    	if(_logLines.length > maxLinesToRemove) {
    	    		// Return only the oldest maxLinesToRemove lines
    	    		lines = _logLines.slice(0, maxLinesToRemove);
    	    		_logLines = _logLines.slice(maxLinesToRemove);
    	    	} else {
    	    		lines = _logLines;
    	    		_logLines = [];
    	    	}

    	    	return lines;
    	    };

    	    this.clear = function() {
    	    	_logLines = [];
    	    };
    	}

    	sys.logger = new SysLogger();

    	function SysConsole(config) {

    	    function logFn(level) { return function() {
    	    	var message = sprintf.apply(this, arguments);

                sys.logger.log({
                	level          : level,
                	message        : message
                });
    	    };};

            this.error = logFn(1);
            this.exception = logFn(1);
            this.warn = logFn(2);
            this.log = logFn(3);
            this.info = logFn(4);
    	}

        global.console = global.console || new SysConsole({});
    }

    
    // MESSAGING
	{ 
		var ERROR_TYPE = "error";
	    var SCHEDULER_SERVICE = "service:trosc.com/sys/scheduler";

    	var _maxLogLinesPerMessage = 100;
		var _bufferedContentMessage = null;
		var _printMIME = "text/plain";
		var _responseHandlers = {};
		var _executionQueue = [];
		var _receiving = false;

		var runQueue = function() {
			while(_executionQueue.length > 0) {
				(_executionQueue.shift())();
			}
		};

		var defer = function(fn) {
			if(_receiving) {
				_executionQueue.push(fn);
			} else {
				setTimeout(fn,0);
			}
		};

    	function sendLog() {
    	    var lines = sys.logger.removeLines(100);
    	    
    	    if(lines.length == 0) {
    	    	return;
    	    }

	        var msg = {
    	    		destination : "console",
    	    		type        : "log",
    	    		payload     : {
    	    			lines   : lines
    	    		}
    	    };

    	    sys.send(msg);
    	}

		var flushBufferedContent = function() {
			if(_bufferedContentMessage == null) {
				return;
			}

			var msg = _bufferedContentMessage;
			_bufferedContentMessage = null;
			send(msg);
		};

		var replyError = function(req) { return function(err) {
			var payload = {
					error_code : err.error_code || "Error",
					message : err.message,
					stack   : err.stack
			};
			
			for(var key in err) {
				if(isString(err[key])) {
					payload[key] = err[key];
				}
			}
			
			sys.reply(req, {
				type    : "error",
				payload : payload
			});
		}};

		var send = function(msg,responseFn,errorFn) {
			msg.source = global.address;

			var requestID;

			if(!msg.request_id) {
				var requestID = sys.uuid();
				msg.request_id = requestID;
			} else {
				requestID = msg.request_id;
			}

			if(isFunction(responseFn)) {
				_responseHandlers[requestID] = function(msg) {
					if(!errorFn) {
						responseFn(msg);
					} else if(msg.type == "error") {
						errorFn(msg.payload);
					} else {
						try {
							responseFn(msg.payload);
						} catch(err) {
							errorFn(err);
						}
					}
				};
			}

			if(_bufferedContentMessage != null
					&& (msg.type !== "content"
						|| msg.payload.attributes["content-type"] !== "text/plain")) {
				flushBufferedContent();
			}

			var msgText = JSON.stringify(msg);
			
			if(msg.destination == "local") {
				msg.source = "local";
				global.receiveMessage(msgText);
			} else if(msg.synchronous) {
				if(!isFunction(global.sendMessageSync)) {
					throw new ProgrammingError("synchronous message passing not available in this environment");
				}
				
				var respText = global.sendMessageSync(msgText);
				
				if(isFunction(responseFn)) {
					// Go through the regular receiveMessage to ensure
					// response handlers are properly cleaned up, etc.
					global.receiveMessage(msgText);
				} else {
					var resp = JSON.parse(respText);
					return resp;
				}
			} else {
				global.sendMessage(msgText);
			}
		};

		var sendReply = function(request,response) {
			response.destination = request.source;
			response.response_to = request.request_id;
			send(response);
		};

		if(!global.setTimeout) {
			function setTimeoutClient(fn,delay) {
				var requestID = sys.uuid();

				var msg = {
						request_id  : requestID,
						destination : SCHEDULER_SERVICE,
						type        : "respond",
						payload     : {
							delay   : delay
						}
				};

				send(msg, function(resp) {
					fn.apply(global, []);
				});

				return {
					clear : function() {
						delete _responseHandlers[requestID];
					}
				};
			}
			
			global.setTimeout = function() {
				setTimeoutClient.apply(this, arguments);
			};
			
			function clearTimeout(timer) {
				timer.clear();
			}

			global.clearTimeout = function() {
				clearTimeout.apply(this, arguments);
			};
		}

		var writeError = function() {
			var msg = {
					type : ERROR_TYPE,
					destination : "output",
					payload : {
						message : sprintf.apply(null, arguments)
					}
			};
			send(msg);
		};

		var isErrorResponse = function(msg) {
			return isObject(msg) && msg.type === ERROR_TYPE;
		};

		var writeOutput = function(type,payload) {
			var msg = {
					"destination" : "output",
					"type"        : type,
					"payload"     : payload
			};
			send(msg);
		};

		var createContent = function(data,attributes) {
			if(!isString(data)) {
				data = "";
			}
			if(!isObject(attributes)) {
				attributes = createAttributes();
			}
			if(!isString(attributes["content-type"])) {
				attributes["content-type"] = "text/plain";
			}
			return {
				data : data,
				attributes : attributes
			};
		};

		var createAttributes = function(contentType) {
			if(!isString(contentType)) {
				contentType = "text/plain";
			}
			return {
				"content-type" : "text/plain"
			};
		};

		var writeContent = function(dataObj,attributes) {
			var data;

			if(isObject(dataObj)) {
				attributes = dataObj.attributes;
				data = dataObj.data;
			} else if(isString(dataObj)) {
				data = dataObj;
			} else {
				throw new ProgrammingError("content parameter of sys.content() not a string or Content object");
			}

			if(!attributes) {
				attributes = {};
			}

			var contentType = attributes["content-type"];

			if(contentType == "text/plain") {
				// Buffer text output

				if(_bufferedContentMessage == null) {
					_bufferedContentMessage = {
							destination : "output",
							type        : "content",
							payload     : createContent(data, attributes)
					};
				} else {
					_bufferedContentMessage.payload.data += data;
				}

				if(_bufferedContentMessage.payload.data.length > 1024) {
					flushBufferedContent();
				}
			} else {
				flushBufferedContent();

				var msg = {
						destination : "output",
						type        : "content",
						payload     : isObject(dataObj) ? dataObj : createContent(data, attributes)
				};

				send(msg);
			}
		};

		var setPrintMIME = function(mime) {
			_printMIME = mime;
		};

		var printf = function() {
			var data = sprintf.apply(null, arguments);
			var attributes = { "content-type" : _printMIME };

			writeContent(data, attributes);
		};

		var writeContents = function(contents) {
			if(!isArray(contents)) {
				throw new ProgrammingError("contents parameter of call to sys.contents() is not an array");
			}
			var msg = {
					"destination" : "output",
					"type"        : "contents",
					"payload"     : {
						"content"     : contents
					}
			};
			send(msg);
		};

		var clearOutput = function() {
			flushBufferedContent();

			send({
				destination  : "output",
				type         : "content",
				payload      : {
					reset    : true,
					data     : ""
				}
			});

			flushBufferedContent();
		}

		var exit = function(ec) {
			defer(function() {
				if(isFunction(closeFn)) {
					closeFn();        
				}
				var msg = {
						"destination" : "internal",
						"type"        : "exit",
						"payload"     : {
							"code"        : ec || 0
						}
				};
				send(msg);
			});
		};

		var ready = function(status) {
			runQueue();
			var msg = {
					"destination" : "internal",
					"type"        : "app-ready",
					"payload"     : {
						"success" : isBoolean(status) ? status : true
					}
			};
			send(msg);
		};
		
		function ping(service) {
			var msg = {
					type        : "ping",
					destination : service,
					payload     : {}
			};
			send(msg);
		}

		// receive functions

		var receiveHandlers = {
				"exit" : function(msg) {
					exit(msg.code);
				},
				"die" : function(msg) {
					exit(-1);
				},
				"ping" : function(msg) {
					sendReply(msg, {
							type : "response",
							payload : {}
					});
				},
				"start" : function(msg) {
					if(isFunction(mainFn)) {
						mainFn(msg.payload.parameters, msg.payload);
					}
				},
		}; 

		var defaultReceiveHandler = function(msg) {};
		var allReceiveHandler = function(msg) {};

		var setReceiver = function(type, fn) {
			if(!isString(type)) {
				throw new ProgrammingError("Parameter is not a string"); 
			}
			if(!isFunction(fn)) {
				throw new ProgrammingError("Parameter is not a function"); 
			}
			receiveHandlers[type] = fn;
		};

		var setDefaultReceiver = function(fn) {
			if(!isFunction(fn)) {
				throw new ProgrammingError("Parameter is not a function"); 
			}
			defaultReceiveHandler = fn;
		};

		var setAllReceiver = function(fn) {
			if(!isFunction(fn)) {
				throw new ProgrammingError("Parameter is not a function"); 
			}
			allReceiveHandler = fn;
		};

		var receive = function(msg) {
			var responseTo = msg.response_to;

			if(!isUndefined(responseTo)) {
				var responseFn = _responseHandlers[responseTo];
				if(isFunction(responseFn)) {
					responseFn(msg);
					delete _responseHandlers[responseTo];
				}
				// response to a deleted handler, drop message
			} else if(isString(msg.type)
					&& isFunction(receiveHandlers[msg.type])) {
				receiveHandlers[msg.type](msg); 
			} else {
				defaultReceiveHandler(msg);
			}
			allReceiveHandler(msg);
		};
		
		function receiveMessage(msg) {
			var _receiving = true;
			var amb = JSON.parse(msg);

			try {
				receive(amb);
			} catch(err) {
				if(isString(amb.request_id)) {
					sys.replyError(amb)(err.error_code ? err : {
						error_code : "Error",
						message    : err.message
					});
				} else {
					writeError(err.message);
				}
			} finally {
				runQueue();
				_receiving = false;
				sendLog();
			}
		}

		global.receiveMessage = function() {
			receiveMessage.apply(this, arguments);
		};

		sys.defer  = defer;
		sys.ready  = ready;
		sys.exit   = exit;
		sys.printf = printf;
		sys.flushOutput = flushBufferedContent;
		
		sys.setPrintMIME = setPrintMIME;
		sys.send   = send;
		sys.replyError = replyError;
		sys.reply  = sendReply;
		sys.error  = writeError;
		sys.output = writeOutput;
		sys.content = writeContent;
		sys.contents = writeContents;
		sys.clearOutput = clearOutput;
		sys.ping = ping;

		sys.isErrorResponse = isErrorResponse;

		sys.localReceive    = receive;
		sys.receiver        = setReceiver;
		sys.defaultReceiver = setDefaultReceiver;

	}
	
	global.Counter = function(count,doneFn,defaultErrorFn) {
		var results = [];
		var errors = [];
		var currentCount = count;
		var counterDone = false;

		for(var i = 0; i < count; i++) {
			results.push(null);
			errors.push(null);
		}

		var doDown = function() {
			if(currentCount > 0) {
				currentCount--;
			}

			if(currentCount <= 0 && !counterDone) {
				counterDone = true;
				doneFn(results,errors);
			}
		};

		// Stop counter and don't run doneFn
		var doCancel = function() {
			currentCount = 0;
			counterDone = true;
		};

		var Handler = function(index,errorFn) {
			var handlerDone = false;

			this.result = function() {
				if(!handlerDone) {
					handlerDone = true;

					if(arguments.length == 0) {
						results[index] = true;
					} else if(arguments.length == 1) {
						results[index] = arguments[0];
					} else {
						results[index] = arguments;
					}

					doDown();
				}
			};
			this.error = function(err) {
				if(!handlerDone) {
					handlerDone = true;

					errors[index] = err;

					if(typeof errorFn === "function") {
						errorFn(err);
					} else if(typeof defaultErrorFn == "function") {
						defaultErrorFn(err);
					} else {
						// Ignore error
					}
					doDown();
				}
			};
		};

		var getHandler = function(index,errorFn) {
			if(index >= count) {
				throw new sys.ProgrammingError("index greater than count");
			}
			if(index < 0) {
				throw new sys.ProgrammingError("index less than 0");
			}

			return new Handler(index, errorFn);
		};

		this.results = results;
		this.errors = errors;
		this.getHandler = getHandler;
		this.down = doDown;
		this.cancel = doCancel;
	};


	if(!String.prototype.trim) {
		String.prototype.trim = function(){
			return this.replace(/^\s+/, '').replace(/\s+$/, '');
		};
	}

	if(!String.prototype.startsWith) {
		String.prototype.startsWith = function(str) {
			return this.lastIndexOf(str, 0) === 0;
		};
	};

	if(!String.prototype.ensureStartsWith) {
		String.prototype.ensureStartsWith = function(prefix) {
			if(!this.startsWith(prefix)) {
				return prefix + this;
			} else {
				return this;
			}
		};
	}

	if(!String.prototype.endsWith) {
		String.prototype.endsWith = function(suffix) {
			if(suffix.length > this.length) {
				return false;
			} else {
				return this.substring(this.length - suffix.length) == suffix;
			}
		};
	}

	if(!String.prototype.ensureEndsWith) {
		String.prototype.ensureEndsWith = function(suffix) {
			if(!this.endsWith(suffix)) {
				return this + suffix;
			} else {
				return this;
			}
		};
	}

//	Production steps of ECMA-262, Edition 5, 15.4.4.19
//	Reference: http://es5.github.com/#x15.4.4.19
	if (!Array.prototype.map) {
		Array.prototype.map = function(callback, thisArg) {

			var T, A, k;

			if (this == null) {
				throw new TypeError(" this is null or not defined");
			}

			// 1. Let O be the result of calling ToObject passing the |this| value as the argument.
			var O = Object(this);

			// 2. Let lenValue be the result of calling the Get internal method of O with the argument "length".
			// 3. Let len be ToUint32(lenValue).
			var len = O.length >>> 0;

			// 4. If IsCallable(callback) is false, throw a TypeError exception.
			// See: http://es5.github.com/#x9.11
			if ({}.toString.call(callback) != "[object Function]") {
				throw new TypeError(callback + " is not a function");
			}

			// 5. If thisArg was supplied, let T be thisArg; else let T be undefined.
			if (thisArg) {
				T = thisArg;
			}

			// 6. Let A be a new array created as if by the expression new Array(len) where Array is
			// the standard built-in constructor with that name and len is the value of len.
			A = new Array(len);

			// 7. Let k be 0
			k = 0;

			// 8. Repeat, while k < len
			while(k < len) {

				var kValue, mappedValue;

				// a. Let Pk be ToString(k).
				//   This is implicit for LHS operands of the in operator
				// b. Let kPresent be the result of calling the HasProperty internal method of O with argument Pk.
				//   This step can be combined with c
				// c. If kPresent is true, then
				if (k in O) {

					// i. Let kValue be the result of calling the Get internal method of O with argument Pk.
					kValue = O[ k ];

					// ii. Let mappedValue be the result of calling the Call internal method of callback
					// with T as the this value and argument list containing kValue, k, and O.
					mappedValue = callback.call(T, kValue, k, O);

					// iii. Call the DefineOwnProperty internal method of A with arguments
					// Pk, Property Descriptor {Value: mappedValue, Writable: true, Enumerable: true, Configurable: true},
					// and false.

					// In browsers that support Object.defineProperty, use the following:
					// Object.defineProperty(A, Pk, { value: mappedValue, writable: true, enumerable: true, configurable: true });

					// For best browser support, use the following:
					A[ k ] = mappedValue;
				}
				// d. Increase k by 1.
				k++;
			}

			// 9. return A
			return A;
		};      
	}

	if (!Array.prototype.indexOf) {
		Array.prototype.indexOf = function(searchElement /*, fromIndex */)
		{
			"use strict";

			if (this === void 0 || this === null)
				throw new TypeError();

			var t = Object(this);
			var len = t.length >>> 0;
			if (len === 0)
				return -1;

			var n = 0;
			if (arguments.length > 0)
			{
				n = Number(arguments[1]);
				if (n !== n) // shortcut for verifying if it's NaN
					n = 0;
				else if (n !== 0 && n !== (1 / 0) && n !== -(1 / 0))
					n = (n > 0 || -1) * Math.floor(Math.abs(n));
			}

			if (n >= len)
				return -1;

			var k = n >= 0
			? n
					: Math.max(len - Math.abs(n), 0);

			for (; k < len; k++)
			{
				if (k in t && t[k] === searchElement)
					return k;
			}
			return -1;
		};
	}
	
	if (!Array.prototype.forEach)
	{
	  Array.prototype.forEach = function(fun /*, thisArg */)
	  {
	    "use strict";

	    if (this === void 0 || this === null)
	      throw new TypeError();

	    var t = Object(this);
	    var len = t.length >>> 0;
	    if (typeof fun !== "function")
	      throw new TypeError();

	    var thisArg = arguments.length >= 2 ? arguments[1] : void 0;
	    for (var i = 0; i < len; i++)
	    {
	      if (i in t)
	        fun.call(thisArg, t[i], i, t);
	    }
	  };
	}
}());
