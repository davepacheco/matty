#!/usr/bin/env node
// vim: ft=javascript

/*
 * matty: MLB Gameday website crawler.
 */

var mod_extsprintf = require('extsprintf');
var mod_fs = require('fs');
var mod_path = require('path');

var mod_bunyan = require('bunyan');

var mod_matty = require('../lib/matty');

var sprintf = mod_extsprintf.sprintf;
var gArg0 = mod_path.basename(process.argv[1]);

function main()
{
	if (process.argv.length < 3)
		usage();

	var log, conf, crawler;

	log = new mod_bunyan({
	    'name': 'matty',
	    'level': process.env['LOG_LEVEL'] || 'info',
	    'serializers': {} /* XXX for restify */
	});

	try {
		conf = JSON.parse(mod_fs.readFileSync(process.argv[2]));
		crawler = mod_matty.createCrawler(conf, log);
	} catch (ex) {
		console.log(ex.stack);
		fatal('failed: %s', ex.message);
	}

	crawler.start();

	crawler.on('ready', function () {
		console.log('Loaded configuration.');
	});

	crawler.on('end', function () {
		var stats = crawler.stats();
		console.log('Finished crawl (%d requests, %d ms)',
		    stats['nrequests'], stats['time']);
	});

	crawler.on('directory', function (name) {
		console.log('  %s', name);
	});
}

function usage(message)
{
	if (arguments.length > 0) {
		var args = Array.prototype.slice.call(arguments);
		var msg = sprintf.apply(null, args);
		console.error('%s: %s', gArg0, msg);
	}

	console.error('usage: %s CONFIG_FILE', gArg0);
	process.exit(2);
}

function fatal()
{
	var args = Array.prototype.slice.call(arguments);
	var msg = sprintf.apply(null, args);
	console.error('%s: %s', gArg0, msg);
	process.exit(1);
}

main();
