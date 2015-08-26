/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author William Buchwalter
 based on jshint-loader by Tobias Koppers
 */
var Linter = require("tslint");
var stripJsonComments = require("strip-json-comments");
var loaderUtils = require("loader-utils");
var fs = require("fs");
var path = require("path");
var typescript = require("typescript");


function loadRelativeConfig(options) {
	var configPath;
	// if config file name is specified, use it !
	if (options.configFilePath) {
		log("Using a custom configFilePath : [" + options.configFilePath + "]");
		configPath = options.configFilePath;
	} else {
		log("No configFilePath specified, trying to find one...");
		configPath = locateConfigFile("tslint.json", path.dirname(this.resourcePath));
	}

	if (typeof configPath !== "string") {
		console.log('tslint.json not found');
	} else {
		this.addDependency(configPath);
		var file = fs.readFileSync(configPath, "utf8");
		options.configuration = JSON.parse(stripJsonComments(file));
	}

	return options;
}

function locateConfigFile(filename, startingPath) {
	var filePath = path.join(startingPath, filename);
	if (typescript.sys.fileExists(filePath)) {
		return filePath;
	}
	var parentPath = path.dirname(startingPath);
	if (parentPath === startingPath)
		return undefined;
	return locateConfigFile(filename, parentPath);
}

function lint(input, options) {
	//Override options in tslint.json by those passed to the compiler
	if (this.options.tslint) {
		merge(options, this.options.tslint);
	}

	//Override options in tslint.json by those passed to the loader as a query string
	var query = loaderUtils.parseQuery(this.query);
	merge(options, query);

	var linter = new Linter(this.resourcePath, input, options);
	var result = linter.lint();
	var emitter = options.emitErrors ? this.emitError : this.emitWarning;
	report(result, emitter, options.failOnHint);
}

function report(result, emitter, failOnHint) {
	if (result.failureCount === 0) return;
	emitter(result.output);
	if (failOnHint) {
		throw new Error("Compilation failed due to tslint errors.");
	}
}

/* Merges two (or more) objects,
 giving the last one precedence */
function merge(target, source) {
	if (typeof target !== 'object') {
		target = {};
	}

	for (var property in source) {
		if (source.hasOwnProperty(property)) {
			var sourceProperty = source[property];
			if (typeof sourceProperty === 'object') {
				target[property] = merge(target[property], sourceProperty);
				continue;
			}
			target[property] = sourceProperty;
		}
	}

	for (var a = 2, l = arguments.length; a < l; a++) {
		merge(target, arguments[a]);
	}

	return target;
};

function log(message) {
	console.info("[ tslint loader ] " + message);
}

module.exports = function (input, map) {
	this.cacheable && this.cacheable();
	var callback = this.async();

	var queryOptions = loaderUtils.parseQuery(this.query);
	var options = {
		formatter: "custom",
		formattersDirectory: 'node_modules/tslint-loader/formatters/',
		configuration: {},
		configFilePath: queryOptions.configFilePath // undefined if not specified by default
	};

	var config = loadRelativeConfig.call(this, options);
	lint.call(this, input, config);
	callback(null, input, map);
};