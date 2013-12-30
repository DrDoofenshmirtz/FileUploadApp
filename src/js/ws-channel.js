(function(global, $) {
  var makeChannel = function(request) {
    var channelId,
        channel = {},
        closed = true;      
 
    var ensureChannelIsClosed = function() {
      if (!closed) {
        $.fm.core.raise('ChannelError', 'Channel is open!');
      }
    };
    
    var isOpen = function() {
      return (!closed && channelId);
    };
    
    var ensureChannelIsOpen = function() {
      if (!isOpen()) {
        $.fm.core.raise('ChannelError', 'Channel is closed!');
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
          responseHandler.onSuccess(true);
        },
        onFailure: function(error) {
          closed = true;
          responseHandler.onFailure(error);  
        },  
        dispose: function() {
          closed = true;
          responseHandler.dispose && responseHandler.dispose();
        }
      });
      closed = false;
      request.apply(this, args);
    };
    
    var transmitData = function(operation, args) {
      var argsAndResponseHandler,
          responseHandler;
            
      ensureChannelIsOpen();
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
    
    channel.read = function() {
      transmitData('read', arguments);
    };
    
    channel.write = function() {
      transmitData('write', arguments);
    };

    var closeChannel = function(operation, args) {
      var argsAndResponseHandler,
          responseHandler;
            
      if (!isOpen()) {
        return false;
      }
            
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

      return true;
    };
    
    channel.abort = function() {
      return closeChannel('abort', arguments);      
    };
    
    channel.close = function() {
      return closeChannel('close', arguments);
    };
    
    return channel;
  };
  
  $.fm.core.ns('fm.ws').makeChannel = makeChannel;
})(this, (this.jQuery || this));

