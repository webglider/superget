// AJAX Multithreaded piecewise file downloader (modified to work with node.js)
// Author: Midhul Varma

var request = require('request');
var headers = require('./headers.js');
var fs = require('fs');

// HEAD to obtain response header attirbutes
// This is a synchronous request
// Unfortunately all servers dont respond with 'Content-Length' :(
// TODO: Hack xhr GET midway to get headers
function getHead(targetUrl, attribute) {
    var xhr = new XMLHttpRequest();
    xhr.open('HEAD', targetUrl, false);
    xhr.send();
    return xhr.getResponseHeader(attribute);
} 



var Download = function(url, chunkSize, concurrency) {
    this.url = url;
    this.chunkSize = chunkSize;
    // assert(chunkSize >= 1);
    this.concurrency = concurrency;
    this.parts = [];
    this.terminated = false;

    this.todoIdx = 0;
    this.totalSize = 0;
    this.totalChunks = 0;

    // this.onFinish

};


// GET chunk of file in byte range and execute callback
Download.prototype.getChunk = function(byteStart, byteEnd, callback) {
    var self = this;

    request({
        encoding: null,
        method: 'GET',
        url: self.url,
        headers: {
            'Content-type': 'application/x-www-form-urlencoded',
            'Range': ( 'bytes=' + byteStart.toString() + '-'
                                           + byteEnd.toString() )

        }
    }, function(err, res, body) {
        if(err || res.statusCode != 206) {
            if(err) console.log(err);
            if(res.statusCode) console.log(res.statusCode);
        }
        else {
           callback(self, body); 
        }
    });
    // var xhr = new XMLHttpRequest();
    // xhr.open('GET', this.url, true);
    // xhr.responseType = 'blob';

    // xhr.onload = function() {
    //     callback(self, this.response);
    // };

    // xhr.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
    // xhr.setRequestHeader('Range', 'bytes=' + byteStart.toString() + '-'
    //                                        + byteEnd.toString());
    // xhr.send();
}

// Dispatch request for next chunk in sequence
Download.prototype.getNextChunk = function(callback) {
    var idx = this.todoIdx;
    if(idx < this.totalChunks) {
        this.getChunk(idx*this.chunkSize, 
            idx*this.chunkSize + this.chunkSize - 1,
            function(dl, blob) {
                callback(dl, blob, idx);
            });

        this.todoIdx += 1;
    }
    else {
        // check if all chunks have been downloaded
        for(var i = 0; i < this.totalChunks; i++) {
            if(!this.parts[i]) {
                return;
            }
        }
        // Download completed
        this.terminated = true;
        this.onFinish(this);
        
    }
};

// Begin the download
// Keeps pulling chunks until chunk size hits zero 
// Invalid range => zero size chunk
// Update: changing blob to Buffer for node
// Reference to dl object is passed to on finish callback
Download.prototype.begin = function(callback) {
    var self  = this;
    self.onFinish = callback;
    // get download size
    // Todo: add required headers
    headers(request.get(self.url), function(status, headers) {
        if(status != 200) {
            console.log('Error: Server responded with status code ' + status.toString());
        }
        else {
            // Todo: check headers case sensitivity
            self.totalSize = parseInt(headers['content-length']);
            self.totalChunks = Math.ceil(self.totalSize/self.chunkSize);

            var chunkCallback = function(dl, blob, idx) {
                // // Non-empty blob ?
                // if(blob.length > 0) {
                //     dl.parts[idx] = blob;
                // }

                // // last chunk ?
                // if(blob.length < dl.chunkSize) {
                //     dl.terminated = true;
                // }

                dl.parts[idx] = blob;
                dl.getNextChunk(chunkCallback);
                

            };

            for(var i=0; i < self.concurrency ; i++) {
                self.getNextChunk(chunkCallback);
            }

        }
    });
    
};

// Condense the chunks to a single file
// Returns Data URI of file
Download.prototype.condenseFile = function(filename) {
    var fileBlob = Buffer.concat(this.parts);
    fs.writeFileSync(filename, fileBlob);
};

// Auxillary helper functions
function download(url) {
    var dl = window.dl = new Download(url, 67108864, 4);
    dl.begin();
    console.log('File download should have started, See the `Network` tab of Chrome Dev Tools');
}

function getFile() {
    var dl = window.dl;
    var url = dl.condenseFile();
    window.location = url;
}

module.exports = Download;