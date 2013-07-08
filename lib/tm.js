var _ = require('underscore');
var fs = require('fs');
var path = require('path');
var yaml = require('js-yaml');
var mkdirp = require('mkdirp');
var chrono = require('chrono');
var crypto = require('crypto');

var tm = {};

// Set or get config.
tm.db;
tm._config = {};
tm.config = function(opts, callback) {
    if (!opts) return tm._config;

    tm._config = _(opts).defaults(tm._config);
    // @TODO create other paths (cache, etc.)
    try {
        mkdirp.sync(path.dirname(tm.config().db));
        mkdirp.sync(tm.config().cache);
    } catch(err) { throw err; }

    // Load + compact the app database.
    var old = require('dirty')(tm.config().db);
    old.on('load', function() {
        fs.unlinkSync(tm.config().db);
        tm.db = require('dirty')(tm.config().db);
        old.forEach(function(k,v) { tm.db.set(k,v); });
        if (callback) return callback();
    });

    return tm._config;
};
tm.config({
    db: path.join(process.env.HOME, '.tilemill', 'v2', 'app.db'),
    cache: path.join(process.env.HOME, '.tilemill', 'v2', 'cache')
});

// Set or remove a project id from recent history.
tm.history = function(type, id, invalidate) {
    var history = tm.db.get('history') || {};
    history = _(history).isArray() ? { style: history } : history;
    history.style = history.style || [];
    history.source = history.source || [];

    if (id && type) {
        if (!history[type]) throw new Error('History set requires valid type');
        var update = invalidate
            ? _(history[type]).reject(function(k) { return k === id; })
            : _(history[type].concat([id])).uniq();
        if (!_(update).isEqual(history[type])) {
            history[type] = update;
            tm.db.set('history', history);
        }
    }
    return history;
};

// Load templates.
tm.templates = _(fs.readdirSync(__dirname + '/../templates')).reduce(function(memo, file) {
    if (file.charAt(0) === '.') return memo;
    memo[file.split('.')[0]] = _(fs.readFileSync(__dirname + '/../templates/' + file, 'utf8')).template();
    return memo;
}, {});

// Generate or verify that an id is a temporary one.
tm.tmpid = function(id) {
    if (id) return /tmp-[0-9a-f]{8}/.test(id);

    id = 'tmp-';
    var base16 = '0123456789abcdef';
    for (var i = 0; i < 8; i++) id += base16[Math.random() * 16 | 0];
    return id;
};

// Generate a temporary id (passes the above check) that is
// based on the md5 of a string.
tm.md5id = function(id) {
    return 'tmp-' + crypto.createHash('md5').update(id).digest('hex').substr(0,8);
};

// Writes an array of files defined by { basename:[basename], data:[data] }
tm.writefiles = function(basepath, files, callback) {
    var write = function() {
        if (!files.length) return callback();
        var file = files.shift();
        fs.writeFile(path.join(basepath, file.basename), file.data, function(err) {
            if (err) return callback(err);
            write();
        });
    };
    mkdirp(basepath, function(err) {
        if (err) return callback(err);
        write();
    });
};

// Reads a directory of files.
tm.dirfiles = function(basepath, callback) {
    fs.readdir(path.resolve(basepath), function(err, files) {
        if (err) return callback(err);
        files = files.filter(function(f) { return f[0] !== '.' });

        var stats = [];
        var stat = function() {
            if (!files.length) {
                stats.sort(function(a,b) {
                    if (a.type < b.type) return -1;
                    if (a.type > b.type) return 1;
                    if (a.basename.toLowerCase() < b.basename.toLowerCase()) return -1;
                    if (a.basename.toLowerCase() > b.basename.toLowerCase()) return 1;
                    return 0;
                });
                return callback(null, stats);
            }
            var p = path.join(basepath, files.shift());
            fs.stat(p, function(err, s) {
                if (err) return callback(err);
                if (s.isFile()) s.type = 'file';
                if (s.isDirectory()) s.type = 'dir';
                if (s.type) {
                    s.path = p;
                    s.extname = path.extname(p);
                    s.basename = path.basename(p);
                    stats.push(s);
                }
                stat();
            });
        };
        stat();
    });
};

// Return an object with sorted keys, ignoring case.
tm.sortkeys = function(obj) {
    try {
        return obj.map(tm.sortkeys);
    } catch(e) {};
    try {
        return Object.keys(obj).sort(function(a, b) {
            a = a.toLowerCase();
            b = b.toLowerCase();
            if (a > b) return 1;
            if (b < a) return -1;
            return 0;
        }).reduce(function(memo, key) {
            memo[key] = tm.sortkeys(obj[key]);
            return memo;
        }, {});
    } catch(e) { return obj };
};

// Named projections.
tm.srs = {
  'WGS84': '+proj=longlat +ellps=WGS84 +datum=WGS84 +no_defs',
  '900913': '+proj=merc +a=6378137 +b=6378137 +lat_ts=0.0 +lon_0=0.0 +x_0=0.0 +y_0=0.0 +k=1.0 +units=m +nadgrids=@null +wktext +no_defs +over'
};

module.exports = tm;
