(function(global, $) {
  var makeCommand;
 
  makeCommand = function(channelConstructor) {
    var text,
        progress,
        enabled,
        files,
        changeListener,
        execute;
    
    var getText = function() { return text; };
    
    var getProgress = function() { return progress; };
        
    var isBusy = function() { return (progress >= 0); };
        
    var isExecutable = function() { 
      return (enabled && ((files && (files.length > 0)) || isBusy()));
    };
    
    var onChange = function(listener) { changeListener = listener; };
    
    var fireStateChanged = function() { changeListener && changeListener(); };
    
    var setEnabled = function(value) {
      enabled = value;
      fireStateChanged();
    };
    
    var setFiles = function(value) {
      files = value;
      fireStateChanged();
    };
    
    var startUpload = function() {
      var file,
          channel,
          eventHandler;
      
      if (isBusy() || !isExecutable()) {
        return;
      }
      
      file = files[0];
      channel = channelConstructor();
      eventHandler = {
        onProgress: function(sliceIndex, sliceCount) {
          progress = ((sliceIndex + 1) / sliceCount);
          fireStateChanged();
        },
        onError: reset,
        onAbort: reset,
        onDone: reset
      }; 
      progress = 0;
      text = 'Abort Upload';
      fireStateChanged();
      execute = $.fm.ws.filetransfer.startUpload(
        file, channel, 
        (128 * 1024), 
        eventHandler);
    };
    
    var reset = function() {
      progress = -1;    
      text = 'Start Upload';
      execute = startUpload;
      fireStateChanged();
    };
    
    reset();
    
    return {
      getText: getText,
      getProgress: getProgress,
      isBusy: isBusy,
      isExecutable: isExecutable,
      onChange: onChange,
      setFiles: setFiles,
      setEnabled: setEnabled,
      execute: function() { execute(); }
    };
  }

  $.fm.core.ns('fm.fuapp').makeCommand = makeCommand; 
})(this, (this.jQuery || this));

