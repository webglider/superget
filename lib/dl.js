// AJAX Multithreaded piecewise file downloader (modified to work with node.js)
// Author: Midhul Varma
// This part deals with performing requests for file chunks in a concurrent manner
// It expects a stream generator interface which should take care of storage of data
// on disk / main memory.

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



var Download = function(url, chunkSize, concurrency, cookie, streamGen) {
    this.url = url;
    this.chunkSize = chunkSize;
    this.cookie = cookie;
    // assert(chunkSize >= 1);
    this.concurrency = concurrency;
    this.parts = [];
    // tracking completenes for parts (Boolean)
    this.completed = [];
    this.progress = 0;
    this.terminated = false;

    this.todoIdx = 0;
    this.totalSize = 0;
    this.totalChunks = 0;

    // stream array interface
    this.streamGen = streamGen;

    // this.onFinish

};


// GET chunk of file in byte range and execute callback
// streams into the supplied writeable stream
Download.prototype.getChunk = function(byteStart, byteEnd, stream, callback) {
    var self = this;

    var headers = {
            'Content-type': 'application/x-www-form-urlencoded',
            'Range': ( 'bytes=' + byteStart.toString() + '-'
                                           + byteEnd.toString() )

        }

    if(self.cookie) {
        // TODO: clean this up
        console.log('Cookie being sent');
        headers['Cookie'] = self.cookie;
    }

    request({
        encoding: null,
        method: 'GET',
        url: self.url,
        headers: headers
    }).on('end', function() {
        callback(self);
    }).pipe(stream);
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
        // allocate a new stream from the stream array
        var stream = this.streamGen.generate();
        this.getChunk(idx*this.chunkSize, 
            idx*this.chunkSize + this.chunkSize - 1,
            stream,
            function(dl) {
                callback(dl, idx);
            });

        this.todoIdx += 1;
    }
    else {
        // check if all chunks have been downloaded
        for(var i = 0; i < this.totalChunks; i++) {
            if(!this.completed[i]) {
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

            // populate the completed array
            for(var i = 0; i < self.totalChunks; i++) {
                self.completed[i] = false;
            }

            var chunkCallback = function(dl, idx) {
                // // Non-empty blob ?
                // if(blob.length > 0) {
                //     dl.parts[idx] = blob;
                // }

                // // last chunk ?
                // if(blob.length < dl.chunkSize) {
                //     dl.terminated = true;
                // }
                
                // Temporary progress printing  
                dl.progress += dl.chunkSize;
                console.log(dl.progress);
                dl.completed[idx] = true;
                dl.getNextChunk(chunkCallback);
                

            };

            for(var i=0; i < self.concurrency ; i++) {
                self.getNextChunk(chunkCallback);
            }

        }
    });
    
};


module.exports = Download;