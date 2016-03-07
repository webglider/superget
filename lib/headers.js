// Small hack to obtain original response headers without waiting for response body
// This is done beacuse many servers do not send all header fields in response to HEAD requests
// The request is terminated after headers have been recieved
 
// var request = require('request');

// Todo: handle the 'error' event
// Todo: check if this works while folowing redirects
var headers = function(req, callback) {
    req.on('response', function(res) {
        this.abort();
        callback(res.statusCode, res.headers);
    });
}

module.exports = headers;