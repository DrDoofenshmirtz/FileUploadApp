(function(global, $) {
  var makeChannel = function(request) {
    var channelId,
        pendingClose,
        channel = {},
        closed = true;      
 
    var ensureChannelIsClosed = function() {
      if (!closed) {
        $.fm.core.raise('ChannelError', 'Channel is open!');
      }
    };
    
    var isReady = function() { return (!closed && channelId); };
    
    var ensureChannelIsReady = function() {
      if (!isReady()) {
        $.fm.core.raise('ChannelError', 'Channel is not ready!');
      }
    };

    var dissectArguments = function(args) {
      var args = Array.prototype.slice.call(args),
          responseHandler = args.pop();
            
      if (!responseHandler) {
        $.fm.core.raise('ArgumentError', 'Missing response handler!');
      }
      
      return [args, responseHandler];
    };

    var transmitPendingClose = function() {
      var transmitClose = pendingClose;
      
      pendingClose = undefined;
      
      if (transmitClose) {
        transmitClose();
        
        return true;
      } else {
        return false;
      }
    };
    
    channel.open = function() {
      var argsAndResponseHandler,
          args,
          responseHandler;
      
      ensureChannelIsClosed();
      argsAndResponseHandler = dissectArguments(arguments);
      args = argsAndResponseHandler[0];
      responseHandler = argsAndResponseHandler[1];
      args.unshift('open');
      args.push({
        onSuccess: function(result) {
          channelId = result;
          
          if (transmitPendingClose()) {
            responseHandler.dispose && responseHandler.dispose();    
          } else {
            responseHandler.onSuccess(true);
          }
        },
        onFailure: function(error) {
          closed = true;
          pendingClose = undefined;
          responseHandler.onFailure(error);  
        },  
        dispose: function() {
          closed = true;
          pendingClose = undefined;
          responseHandler.dispose && responseHandler.dispose();
        }
      });
      closed = false;
      request.apply(this, args);
    };
    
    var transmitData = function(operation, args) {
      var argsAndResponseHandler,
          responseHandler;
            
      ensureChannelIsReady();
      argsAndResponseHandler = dissectArguments(args);
      args = argsAndResponseHandler[0];
      responseHandler = argsAndResponseHandler[1];
      args.unshift(channelId);
      args.unshift(operation);
      args.push({
        onSuccess: function(result) { responseHandler.onSuccess(result); },
        onFailure: function(error) { responseHandler.onFailure(error); },
        dispose: function() {
          closed = true;
          channelId = undefined;
          responseHandler.dispose && responseHandler.dispose(); 
        }
      });
      request.apply(this, args);
    };
    
    channel.read = function() { transmitData('read', arguments); };
    
    channel.write = function() { transmitData('write', arguments); };

    var transmitClose = function(operation, args) {
      var argsAndResponseHandler,
          responseHandler;
            
      argsAndResponseHandler = dissectArguments(args);
      args = argsAndResponseHandler[0];
      responseHandler = argsAndResponseHandler[1];
      args.unshift(channelId);
      args.unshift(operation);
      args.push({
        onSuccess: function(result) { responseHandler.onSuccess(result); },
        onFailure: function(error) { responseHandler.onFailure(error); },
        dispose: function() {
          responseHandler.dispose && responseHandler.dispose(); 
        }
      });
      closed = true;
      channelId = undefined;
      request.apply(this, args);
    };
    
    var closeChannel = function(operation, args) {
      if (closed) {
        return false;
      }
      
      if (channelId) {
        transmitClose(operation, args);
      } else {
        pendingClose = function() { transmitClose(operation, args); };
      }

      return true;
    };
    
    channel.abort = function() { return closeChannel('abort', arguments); };
    
    channel.close = function() { return closeChannel('close', arguments); };
    
    return channel;
  };
  
  $.fm.core.ns('fm.ws').makeChannel = makeChannel;
})(this, (this.jQuery || this));

