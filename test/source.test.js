var fs = require('fs');
var path = require('path');
var assert = require('assert');
var source = require('../lib/source');

describe('source remote', function() {
    it('loads', function(done) {
        source({id:'mapbox://mapbox.mapbox-streets-v2'}, function(err, source) {
            assert.ifError(err);
            assert.equal('MapBox Streets', source.data.name);
            assert.equal(0, source.data.minzoom);
            assert.equal(14, source.data.maxzoom);
            done();
        });
    });
    it('loads legacy mbstreets', function(done) {
        source({id:'mbstreets'}, function(err, source) {
            assert.ifError(err);
            assert.equal('MapBox Streets', source.data.name);
            assert.equal(0, source.data.minzoom);
            assert.equal(14, source.data.maxzoom);
            done();
        });
    });
    it('error bad protocol', function(done) {
        source({id:'http://www.google.com'}, function(err, source) {
            assert.ok(err);
            assert.equal('Unsupported source protocol', err.message);
            done();
        });
    });
    it('noop remote write', function(done) {
        source({id:'mapbox://mapbox.mapbox-streets-v2', data:{}}, function(err, source) {
            assert.ifError(err);
            done();
        });
    });
});

describe('source local', function() {
    var tmp = '/tmp/tm2-source-' + (+new Date);
    var data = {
        name: 'Test source',
        attribution: '&copy; John Doe 2013.',
        minzoom: 0,
        maxzoom: 6,
        Layer: [ {
            id: 'land',
            name: 'land',
            geometry: 'polygon',
            srs: '+proj=merc +a=6378137 +b=6378137 +lat_ts=0.0 +lon_0=0.0 +x_0=0.0 +y_0=0.0 +k=1.0 +units=m +nadgrids=@null +wktext +no_defs +over',
            Datasource: {
                type: 'postgis',
                table: 'land',
                geometry_field: 'geom',
                extent: '-20037508.34,-20037508.34,20037508.34,20037508.34',
                dbname: 'test',
                user: 'postgres',
                host: 'localhost'
            }
        } ]
    };
    after(function(done) {
        setTimeout(function() {
            ['data.xml','data.yml'].forEach(function(file) {
                try { fs.unlinkSync(tmp + '/' + file) } catch(err) {};
            });
            try { fs.rmdirSync(tmp) } catch(err) {};
            try { fs.unlinkSync(tmp + '.tm2z') } catch(err) {};
            done();
        }, 250);
    });
    it('loads', function(done) {
        source({id:__dirname + '/fixtures-localsource'}, function(err, source) {
            assert.ifError(err);
            assert.equal('Test source', source.data.name);
            assert.equal(0, source.data.minzoom);
            assert.equal(6, source.data.maxzoom);
            done();
        });
    });
    it('saves source in memory', function(done) {
        source({id:'tmp-1234', data:data}, function(err, source) {
            assert.ifError(err);
            assert.ok(source);
            done();
        });
    });
    it('saves source to disk', function(done) {
        source({id:tmp, data:data, perm:true}, function(err, source) {
            assert.ifError(err);
            assert.ok(source);
            // @TODO data.yml is currently not saved because it blows away
            // multiline strings.
            // assert.ok(/maxzoom: 6/.test(fs.readFileSync(tmp + '/data.yml', 'utf8')), 'saves data.yml');
            assert.ok(/<Map srs/.test(fs.readFileSync(tmp + '/data.xml', 'utf8')), 'saves data.xml');
            done();
        });
    });
});
