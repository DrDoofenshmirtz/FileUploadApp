(function(global, $) {
  var connected,
      upload,
      resetUpload,
      connectedStateChanged,
      connectionSpec,
      client,
      fileUpload,
      uploadFile;
          
  resetUpload = function() {
    upload = undefined;
  };
  connectedStateChanged = function(state) {
    connected = state;
    resetUpload();
  };
  connectionSpec = {port: 17500, serviceName: 'file-upload'};
  client = $.fm.ws.makeClient(connectionSpec, {
    onError: function(error) {
      global.console.log('Connection Error: ' + error);            
      connectedStateChanged(false);
    },
    onConnectFailed: function() {
      global.console.log('Connect failed!');            
      connectedStateChanged(false);
    },
    onConnect: function() {
      global.console.log('Client connected.');                        
      connectedStateChanged(true);
    },
    onDisconnect: function() {
      global.console.log('Client disconnected.');            
      connectedStateChanged(false);
    }
  });
  fileUpload = client.defNamespace('fileUpload');
  fileUpload.defChannel('uploadFile');
  uploadFile = function(file) {
    global.console.log('Starting upload of file "' + file.name + '"...');
    upload = $.fm.ws.filetransfer.startUpload(
      file, 
      fileUpload.uploadFile(), 
      (128 * 1024), 
      {onProgress: function(sliceIndex, sliceCount) {
         global.console.log('Uploaded slice no. ' + (sliceIndex + 1) 
                            + ' of ' + sliceCount + '.');
       },
       onError: function(error) {
         global.console.log('Upload failed! Error: ' + error.message);
         resetUpload();
       },
       onAbort: function() {
         global.console.log('Upload aborted.');
         resetUpload();
       },
       onDone: function() {
         global.console.log('Upload completed.');
         resetUpload();
       }
      });
  };
  
  $(function() {
    $('#fuapp-upload-button').click(function() {
      var files = $('#fuapp-file-selection').prop('files');
                                    
      if (connected && !upload && (files.length > 0)) {
        uploadFile(files[0]);
      }
      
      return false;
    });          
    client.open();          
  }); 
})(this, (this.jQuery || this));

