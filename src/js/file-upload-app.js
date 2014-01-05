(function(global, $) {
  var connected,
      connectionSpec,
      client,
      fileUpload,
      channelConstructor,
      uploadCommand;
  
  connectionSpec = {port: 17500, serviceName: 'file-upload'};
  client = $.fm.ws.makeClient(connectionSpec, {
    onError: function(error) {
      global.console.log('Connection Error: ' + error);            
      uploadCommand.setEnabled(false);
    },
    onConnectFailed: function() {
      global.console.log('Connect failed!');            
      uploadCommand.setEnabled(false);
    },
    onConnect: function() {
      global.console.log('Client connected.');                        
      uploadCommand.setEnabled(true);
    },
    onDisconnect: function() {
      global.console.log('Client disconnected.');            
      uploadCommand.setEnabled(false);
    }
  });
  fileUpload = client.defNamespace('fileUpload');
  fileUpload.defChannel('uploadFile');
  channelConstructor = fileUpload.uploadFile.bind(fileUpload);
  uploadCommand = $.fm.fuapp.makeCommand(channelConstructor);
  
  $(function() {
    $.fm.fuapp.installPresenter($('.fuapp-view').first(), uploadCommand);            
    
    client.open();          
  }); 
})(this, (this.jQuery || this));

