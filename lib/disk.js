// Stream generator interface for storing file chunks on disk
var path = require('path');
var fs = require('fs');

// TODO: verify authenticity of this module
var fconcat = require('concat-files');

// Storage directory and prefix of files to be created in the storage directory
var Gen = function(directory, prefix) {
    this.parts = [];
    this.directory = directory;
    this.prefix = prefix;
}

Gen.prototype.generate = function() {
    var self = this;
    var idx = self.parts.length;
    self.parts[idx] = self.prefix + '_' + idx.toString() + '.blob';
    return fs.createWriteStream(path.join(self.directory, self.parts[idx]));
}

// Condense the chunks to a single file
Gen.prototype.condenseFile = function(filename, callback) {
    var chunkFiles = [];
    for(var i = 0; i < this.parts.length; i++) {
        chunkFiles[i] = path.join(this.directory, this.parts[i]);
    }
    fconcat(chunkFiles, filename, callback);
};

module.exports = Gen;