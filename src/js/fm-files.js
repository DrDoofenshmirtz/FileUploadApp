(function(global, $) {  
  var defaultOnSlice = function(slice) {
    if (slice.endOfFile) {
      global.console.log('EOF');
    } else {
      global.console.log('onSlice: ' + slice.data);      
      slice.next();
    }        
  };  

  var defaultOnError = function(error) {
    global.console.log('onError: ' + error);
  };      

  var slice = function(file, options) {
    var onSlice,
        onError,
        fileSize, 
        size, 
        sliceIndex,
        sliceCount, 
        reader, 
        position,
        aborted,
        readNextSlice;
    
    try {
      fileSize = file.size;
    } catch (fileReadError) {
      onError($.fm.core.makeError('FileReadError', 'Reading of file failed!'));
      
      return;
    }
    
    options = (options || {});
    onSlice = (options.onSlice || defaultOnSlice);
    onError = (options.onError || defaultOnError);
    size = (options.size || fileSize);
    sliceIndex = -1;
    sliceCount = Math.ceil(fileSize / size);
    reader = new FileReader();
    position = 0;
    readNextSlice = function() {
      var start;
      
      if (aborted) {
        return;
      }
      
      start = position;
      
      if (start >= fileSize) {
        onSlice({endOfFile: true});
      } else {
        position = Math.min(start + size, fileSize);
        
        try {
          reader.readAsBinaryString(file.slice(start, position));
        } catch (fileReadError) {
          position = start;
          onError($.fm.core.makeError(
            'FileReadError', 
            'Reading of file failed!'));     
        }                        
      }
    };
        
    reader.onloadend = function(event) {
      var slice;
      
      if (event.target.readyState == FileReader.DONE) {
        ++sliceIndex;
        slice = {data: event.target.result, 
                 next: readNextSlice,
                 index: sliceIndex,
                 total: sliceCount};
        onSlice(slice);                       
      }
    };
    reader.onerror = function(event) {
      var errorMessage;
      
      switch(event.target.error.code) {
        case event.target.error.NOT_FOUND_ERR:
          errorMessage = 'File not found!';
          
          break;
        case event.target.error.NOT_READABLE_ERR:
          errorMessage = 'File is not readable!';
          
          break;
        case event.target.error.ABORT_ERR:
          errorMessage = 'Reading of file has been aborted!';
                    
          break;
        default:
          errorMessage = 'Reading of file failed for an unknown reason!';
          
          break;
      }
      
      onError($.fm.core.makeError('FileReadError', errorMessage));      
    };    
    readNextSlice();
    
    return (function() {
      var doNothing = function() {};
          
      return function() {
        if (!aborted) {
          aborted = true;
          onSlice = doNothing;
          onError = doNothing;
          
          try {
            reader.abort();
          } catch (ignored) {}
        }
      };  
    })();
  };
  
  $.fm.core.ns('fm.files').slice = slice;
})(this, (this.jQuery || this));
