(function(global, $) {
  var ChannelState = {
    NONE:   'NONE',
    OPENED: 'OPENED',
    READY:  'READY',
    CLOSED: 'CLOSED'
  };
      
  var makeChannel = function(request) {
    var channelId,
        pendingClose,
        channel = {},
        state = ChannelState.NONE;      
    
    var stateIsIn = function() {
      var acceptedStates = Array.prototype.slice.call(arguments);
      
      return (acceptedStates.indexOf(state) !== -1);
    };
        
    var ensureStateIsIn = function() {
      if (!stateIsIn.apply(undefined, arguments)) {
        $.fm.core.raise('ChannelError', 
                        'Illegal channel state: "' + state + '"!');
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
    
    var transmitData = function(operation, args) {
      var argsAndResponseHandler,
          responseHandler;
            
      ensureStateIsIn(ChannelState.READY);
      argsAndResponseHandler = dissectArguments(args);
      args = argsAndResponseHandler[0];
      responseHandler = argsAndResponseHandler[1];
      args.unshift(channelId);
      args.unshift(operation);
      args.push({
        onSuccess: function(result) { responseHandler.onSuccess(result); },
        onFailure: function(error) { responseHandler.onFailure(error); },
        dispose: function() {
          state = ChannelState.CLOSED;
          channelId = undefined;
          responseHandler.dispose && responseHandler.dispose(); 
        }
      });
      request.apply(this, args);
    };
    
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
      state = ChannelState.CLOSED;
      channelId = undefined;
      request.apply(this, args);
    };
    
    var closeChannel = function(operation, args) {
      if (stateIsIn(ChannelState.NONE, ChannelState.CLOSED)) {
        return false;
      }
      
      if (stateIsIn(ChannelState.READY)) {
        transmitClose(operation, args);
      } else {
        pendingClose = function() { transmitClose(operation, args); };
      }

      return true;
    };
    
    channel.open = function() {
      var argsAndResponseHandler,
          args,
          responseHandler;
      
      ensureStateIsIn(ChannelState.NONE, 
                      ChannelState.OPENED, 
                      ChannelState.READY);
      
      if (stateIsIn(ChannelState.OPENED, ChannelState.READY)) {
        return false;
      }
      
      argsAndResponseHandler = dissectArguments(arguments);
      args = argsAndResponseHandler[0];
      responseHandler = argsAndResponseHandler[1];
      args.unshift('open');
      args.push({
        onSuccess: function(result) {
          channelId = result;
          state = ChannelState.READY;
          
          if (transmitPendingClose()) {
            responseHandler.dispose && responseHandler.dispose();    
          } else {
            responseHandler.onSuccess(true);
          }
        },
        onFailure: function(error) {
          state = ChannelState.NONE;
          pendingClose = undefined;
          responseHandler.onFailure(error);  
        },  
        dispose: function() {
          state = ChannelState.CLOSED;
          pendingClose = undefined;
          responseHandler.dispose && responseHandler.dispose();
        }
      });
      state = ChannelState.OPENED;
      request.apply(this, args);
      
      return true;
    };
    channel.read = function() { transmitData('read', arguments); };
    channel.write = function() { transmitData('write', arguments); };
    channel.abort = function() { return closeChannel('abort', arguments); };    
    channel.close = function() { return closeChannel('close', arguments); };
    
    return channel;
  };
  
  $.fm.core.ns('fm.ws').makeChannel = makeChannel;
})(this, (this.jQuery || this));

