#!/usr/bin/env node

console.log('Under Construction');

var Download = require('./lib/dl.js');
var Disk = require('./lib/disk.js');
var program = require('commander');
var crypto = require('crypto');
var fs = require('fs');

program.version('0.0.1')
.arguments('<url>')
.option('-s, --chunksize <chunksize>', 'Size of chunks', parseInt)
.option('-c, --concurrency <concurrency>', 'Number of concurrent connections to make', parseInt)
.option('-o, --output <output>', 'Output file name')
.option('-k, --cookie <cookie>', 'Cookies to be passed with requests')
.action(function(url) {
    var shasum = crypto.createHash('sha1');
    shasum.update(url);
    var directory = './' + shasum.digest('hex');
    fs.mkdirSync(directory);
    var dsk = new Disk(directory, 'part');
    var dl = new Download(url, program.chunksize, program.concurrency, program.cookie, dsk);

    // test cookie
    if(program.cookie) {
        console.log(program.cookie);
    }

    dl.begin(function(x) {
        dsk.condenseFile('./' + program.output, function() {
            console.log('Download complete :)');
        });
        
    });

})
.parse(process.argv);
