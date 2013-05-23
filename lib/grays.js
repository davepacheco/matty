#!/usr/bin/env node
// vim: ft=javascript

var mod_assert = require('assert');
var mod_events = require('events');
var mod_fs = require('fs');
var mod_http = require('http');
var mod_path = require('path');
var mod_util = require('util');

var mod_extsprintf = require('extsprintf');
var mod_jsprim = require('jsprim');
var mod_restify = require('restify');
var mod_vasync = require('vasync');
var mod_verror = require('verror');

var sprintf = mod_extsprintf.sprintf;
var EventEmitter = mod_events.EventEmitter;
var VError = mod_verror.VError;

/* Public interface */
exports.createCrawler = createCrawler;

function createCrawler(conf, log)
{
	var c = new Crawler(conf, log);
	c.init();
	return (c);
}

function parseDate(str)
{
	var d = Date.parse(str);
	if (isNaN(d))
		return (null);
	return (new Date(d));
}

function Crawler(conf, log)
{
	EventEmitter.call(this);

	var s, e;

	mod_assert.equal(typeof (conf), 'object');
	mod_assert.ok(conf !== null);

	if ((s = parseDate(conf['start'])) === null)
		throw (new VError('invalid start date: "%s"', conf['start']));
	if ((e = parseDate(conf['end'])) === null)
		throw (new VError('invalid end date: "%s"', conf['end']));

	this.c_conf = mod_jsprim.deepCopy(conf);
	this.c_start = s;
	this.c_end = e;
	this.c_log = log;
	this.c_queue = null;
	this.c_dfl = null;
	this.c_go = false;
	this.c_client = null;
}

mod_util.inherits(Crawler, EventEmitter);

Crawler.prototype.init = function ()
{
	var c = this;
	var dflpath = mod_path.join(__dirname, '../etc/defaults.json');

	mod_fs.readFile(dflpath, function (err, contents) {
		if (err) {
			c.emit('error',
			    new VError(err, 'failed to read defaults'));
			return;
		}

		try {
			c.c_dfl = JSON.parse(contents);
			c.c_conf.__proto__ = c.c_dfl;
		} catch (ex) {
			c.emit('error',
			    new VError(ex, 'failed to parse defaults'));
			return;
		}

		c.initFini();
	});
};

Crawler.prototype.initFini = function ()
{
	var c = this;
	this.c_queue = mod_vasync.queue(this.fetchOne.bind(this),
	    this.c_conf['concurrency']);
	this.c_queue.drain = function () { c.emit('end'); };

	this.c_client = mod_restify.createHttpClient({
	    'log': this.c_log,
	    'url': this.c_conf['server']
	});

	mod_http.globalAgent.maxSockets = this.c_conf['concurrency'];

	this.emit('ready');

	if (this.c_go)
		this.start();

	this.on('end', function () { c.c_client.close(); });
};

Crawler.prototype.start = function ()
{
	var c = this;

	if (this.c_dfl === null) {
		this.c_go = true;
		return;
	}

	var start = this.c_start.getTime();
	var end = this.c_end.getTime();
	var when;

	for (when = start; when <= end; when += 86400000)
		this.c_queue.push(this.urlDate(new Date(when)));

	if (this.c_queue.queued.length + this.c_queue.npending === 0)
		process.nextTick(function () { c.emit('end'); });
};

Crawler.prototype.urlDate = function (when)
{
	return (sprintf('year_%s/month_%02d/day_%02d/', when.getUTCFullYear(),
	    when.getUTCMonth() + 1, when.getUTCDate()));
};

Crawler.prototype.fetchOne = function (url, callback)
{
	var c = this;
	var path = mod_path.join(this.c_conf['root'], url);
	this.c_log.debug('fetch', path);
	this.c_client.get(path, function (err, request) {
		if (err) {
			c.emit('error', err);
			return;
		}

		request.on('result', function (err2, response) {
			if (err2) {
				c.emit('error', err2);
				return;
			}

			if (mod_jsprim.startsWith(
			    response.headers['content-type'], 'text/html'))
				c.gotDirectory(url, response, callback);
			else
				c.gotFile(url, response, callback);
		});
	});
};

Crawler.prototype.gotDirectory = function (url, response, callback)
{
	this.emit('directory', url);

	var c = this;
	var data = '';

	response.on('data', function (chunk) {
		data += chunk.toString('utf8');
	});

	response.on('end', function () {
		/*
		 * This is not especially robust.
		 */
		data.split(/\n/).forEach(function (line) {
			/* JSSTYLED */
			var match = /<li><a href="([^"]+)">.*<\/a><\/li>/.
			    exec(line);
			if (!match || match.length < 2 || match[1][0] == '/')
				return;

			if (match[1][match[1].length - 1] != '/') {
				/* XXX skip files for now */
				console.error('skipping %s (not dir)',
				    match[1]);
				return;
			}

			c.c_queue.push(mod_path.join(url, match[1]));
		});

		callback();
	});
};

Crawler.prototype.gotFile = function (url, response, callback)
{
	if (this.listeners('file').length > 0)
		this.emit('file', url, response);
	else
		response.on('data', function () {});

	response.on('end', function () { callback(); });
};