// Stream generator interface for storing file chunks in main memory
var concat = require('concat-stream');

var Gen = function() {
    this.parts = [];
}

Gen.prototype.generate = function() {
    var self = this;
    var idx = self.parts.length;
    self.parts[idx] = null;
    return concat(function(buf) {
        self.parts[ idx ] = buf;
    });
}

// Condense the chunks to a single file
Gen.prototype.condenseFile = function(filename) {
    var fileBlob = Buffer.concat(this.parts);
    fs.writeFileSync(filename, fileBlob);
};

module.exports = Gen;