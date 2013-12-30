(function(global, $) {    
  var log,
      eventLogger,
      defaultEventHandler,
      completeEventHandler,
      startUpload;
      
  /* Prepends a namespace prefix to the given message 
   * and logs it to the console.
   */
  log = function(message) {
    global.console.log('[fm.ws.filetransfer] ' + message);
  };
 
  /* Creates a default event handler method that just logs a message.
   */
  eventLogger = function(message) {
    return function() {
      log(message);  
    };
  };
  
  /* A default event handler to be used as a "no op" handler or as a template 
   * for the completion of an incomplete handler.
   */
  defaultEventHandler = {
    onProgress: eventLogger('onProgress'),
    onError: eventLogger('onError'),
    onAbort: eventLogger('onAbort'),
    onDone: eventLogger('onDone')
  };
  
  /* Completes the given event handler, replacing all missing methods with
   * methods from the default event handler.  
   */
  completeEventHandler = function(eventHandler) {
    eventHandler = (eventHandler || {});
    eventHandler.onProgress = (eventHandler.onProgress || 
                               defaultEventHandler.onProgress);
    eventHandler.onError = (eventHandler.onError || 
                            defaultEventHandler.onError);
    eventHandler.onAbort = (eventHandler.onAbort || 
                            defaultEventHandler.onAbort);
    eventHandler.onDone = (eventHandler.onDone || defaultEventHandler.onDone);
    
    return eventHandler;
  };

  /* Reads the given file in slices of the specified size, uploading each slice
   * through the given WebSockets channel. Sends the following events to the
   * optionally given event handler (if the corresponding slots are defined):
   *
   * onProgress(sliceIndex, sliceCount)
   * onError(error)
   * onAbort()
   * onDone()
   *
   * Returns a function that can be called to abort the upload.
   */
  startUpload = function(file, channel, sliceSize, eventHandler) {
    var sliceSent,
        handleProgress,
        handleFailure,
        handleDispose,
        openChannel,
        writeData,
        closeChannel,
        uploadNextSlice,
        abortUpload,
        failUpload,
        abortSlicing;
        
    if (!file) {
      $.fm.core.raise('ArgumentError', 'Missing value for "file"!');  
    }
    
    if (!channel) {
      $.fm.core.raise('ArgumentError', 'Missing value for "channel"!');  
    }
        
    eventHandler = completeEventHandler(eventHandler);
    
    handleProgress = function(slice) {
      log('Uploaded slice no. ' + slice.index 
          + ' of file "' + file.name + '".');
      eventHandler.onProgress(slice.index, slice.total);
      slice.next();
    };
    
    handleFailure = function(error) {
      log('Operation failed (file: ' + file.name 
          + ', error: ' + error.message + ')!');
      channel = null;
      abortSlicing();
      eventHandler.onError(error);
    };
    
    handleDispose = function() {
      channel = null;
      abortSlicing();
      eventHandler.onAbort();
    };
    
    openChannel = function(slice) {
      if (!channel) {
        return;
      }
      
      log('Starting upload of file "' + file.name + '"...');
      channel.open(file.name, slice.data, {
        onSuccess: function(result) { handleProgress(slice); },
        onFailure: handleFailure,
        dispose: handleDispose
      });
    };
    
    writeData = function(slice) {
      if (!channel) {
        return;
      }
      
      log('Uploading slice no. ' + slice.index 
          + ' of file "' + file.name + '"...');
      channel.write(slice.data, {
        onSuccess: function(result) { handleProgress(slice); },
        onFailure: handleFailure,
        dispose: handleDispose
      });
    };
    
    closeChannel = function() {
      var close;
      
      if (!channel) {
        return;
      }
      
      log('Finishing upload of file "' + file.name + '"...');
      close = channel.close;
      channel = null;
      close({
        onSuccess: function(result) {
          log('Upload of file "' + file.name + '" finished.');
          eventHandler.onDone();
        },
        onFailure: handleFailure,
        dispose: handleDispose
      });  
    };
    
    uploadNextSlice = function(slice) {
      if (slice.endOfFile) {
        closeChannel();
      } else {
        if (!sliceSent) {
          sliceSent = true;
          openChannel(slice);
        } else {
          writeData(slice);            
        }            
      }                    
    };
    
    abortUpload = function() {
      var abort;
      
      if (!channel) {
        return;
      }
      
      log('Aborting upload of file "' + file.name + '"...');
      abort = channel.abort;
      channel = null;
      abortSlicing();
      
      if (!sliceSent) {
        log('Upload of file "' + file.name + '" aborted.');
        
        return;
      }
            
      abort({
        onSuccess: function(result) {
          log('Upload of file "' + file.name + '" aborted.');
          eventHandler.onAbort();
        },
        onFailure: handleFailure  
      });
    };
    
    failUpload = function(error) {
      var abort;
      
      if (!channel) {
        return;
      }
      
      log('Aborting upload because slicing of file failed (file: ' + 
          file.name + ', error: ' + error.message + ').');
      abort = channel.abort;
      channel = null;      
      eventHandler.onError(error);
      abort({
        onSuccess: function() {},
        onFailure: function() {}            
      });
    };
    
    abortSlicing = $.fm.files.slice(file, {
      size: sliceSize, 
      onSlice: uploadNextSlice,
      onError: failUpload
    });
    
    return abortUpload;
  };

  $.fm.core.ns('fm.ws.filetransfer').startUpload = startUpload;  
})(this, (this.jQuery || this));

