(function(global, $) {
  var makeClient = function(connectionSpec, connectionHandler) {
    var client = {path: ''},
        slots = {},
        responseHandlers = {},
        closed = true,
        connectionId,
        connection = $.fm.ws.makeConnection(connectionSpec, {
          onError: function(error) {
            if (!closed) {
              handleError(error);
            }
          },
          onConnectFailed: function() {
            if (!closed) {
              handleConnectFailed();
            }
          },
          onConnect: function() {
            if (!closed) {
              handleConnect();
            }
          },
          onMessageSent: function(message) {          
            // TODO: how to utilize this? May be obsolete!
          },
          onMessageReceived: function(message) {
            if (!closed) {
              handleMessageReceived(message);
            }                       
          },
          onDisconnect: function() {
            if (!closed) {
              handleDisconnect();
            }
          }        
        });
        
    var Slot = function(signalHandler) {
      this.onSignal = function() {
        if (!closed) {
          signalHandler.apply(client, arguments);
        }
      };
    };
       
    var resetResponseHandlers = function() {
      var handlers = responseHandlers;
      
      responseHandlers = {};
      
      return handlers;
    };
    
    var disposeResponseHandlers = function(responseHandlers) {
      var handler;
      
      for (var entry in Iterator(responseHandlers)) {
        handler = entry[1];
        
        if (handler && handler.dispose) {
          try { 
            handler.dispose(); 
          } catch (ignored) {}                    
        }
      }
    };
       
    var handleError = function(error) {
      disposeResponseHandlers(resetResponseHandlers());      
      connectionHandler.onError(error);
    };

    var handleConnectFailed = function() {
      connectionId = undefined;
      disposeResponseHandlers(resetResponseHandlers());
      connectionHandler.onConnectFailed();
    }
    
    var handleConnect = function() {
      connectionId = undefined;
      disposeResponseHandlers(resetResponseHandlers());
    };
        
    var handleMessageReceived = function(message) {
      var responseData;
            
      message = (message || '').toString();

      if (message.length < 1) {
        return;
      }

      try { 
        responseData = JSON.parse(message); 
      } catch (ignored) { 
        return; 
      }
                        
      if (responseData.id !== null) {
        handleResponse(responseData);        
      } else {
        handleNotification(responseData);
      }      
    };
    
    var handleNotification = function(notification) {
      var target = slots[notification.method];
      
      if (target instanceof Slot) {
        target.onSignal(notification.params);
      }            
    };
    
    var handleResponse = function(response) {
      var responseHandler = responseHandlers[response.id];
      
      delete responseHandlers[response.id];

      if (!responseHandler) {
        return;
      }

      if (response.result !== null) {
        responseHandler.onSuccess(response.result);
      } else if (response.error !== null) {
        responseHandler.onFailure(response.error);
      }
    };
    
    var handleDisconnect = function() {
      connectionId = undefined;
      disposeResponseHandlers(resetResponseHandlers());
      connectionHandler.onDisconnect();
    };
                            
    client.open = function() {
      if (!closed) {
        return;
      }
            
      closed = false;
      connectionId = undefined;
      connection.open();            
    };
    
    client.close = function() {
      var responseHandlers;
      
      if (closed) {
        return;
      }
      
      closed = true;
      connectionId = undefined;
      responseHandlers = resetResponseHandlers();      
                       
      try {
        connection.close();
      } catch (ignored) {}
      
      disposeResponseHandlers(responseHandlers);
      connectionHandler.onDisconnect();
    };
    
    var validateSlotName = function(name) {
      name = (name || '').toString();
            
      if (name.length < 1) {
        $.fm.core.raise('ArgumentError', 'Invalid name!');
      }
      
      if (name === 'connectionAcknowledged') {
        $.fm.core.raise('ArgumentError', 'Reserved name!');
      }
            
      return name;
    };
    
    var ensureIsConnected = function() {
      if (closed || !connectionId) {
        $.fm.core.raise('ConnectionError', 'Client is disconnected!');
      }
    };
    
    var nextRequestId = (function() {
      var requestId = 0;
      
      return function() {
        var nextId = requestId.toString();
        
        requestId = requestId + 1;
        
        return nextId;
      };
    })();

    var makeRequest = function(name) {
      return function() {
        ensureIsConnected();
        
        var args = Array.prototype.slice.call(arguments),
            responseHandler = args.pop(),
            requestId = connectionId + '.' + nextRequestId(),
            requestData = {id: requestId, method: name, params: args};
            
        if (!responseHandler) {
          $.fm.core.raise('ArgumentError', 'Missing response handler!');
        }
        
        requestData = JSON.stringify(requestData);
        responseHandlers[requestId] = responseHandler;
        connection.send(requestData);        
      };  
    };
    
    var makePath = function(path, name) {
      return ((path && (path + '.')) + name); 
    };
        
    client.defRequest = function(name) {
      name = validateSlotName(name);
      this[name] = makeRequest(makePath(this.path, name));      
    };
    
    client.defSignal = function(name) {
      var path;
      
      name = validateSlotName(name);
      path = makePath(this.path, name);
      this[name] = function() {
        ensureIsConnected();
        
        var args = Array.prototype.slice.call(arguments),
            requestData = {id: null, method: path, params: args};
            
        requestData = JSON.stringify(requestData);        
        connection.send(requestData);        
      };     
    };
    
    client.defSlot = function(name, signalHandler) {      
      if (!signalHandler) {
        $.fm.core.raise('ArgumentError', 'Missing signal handler!');
      }
      
      name = validateSlotName(name);
      name = makePath(this.path, name);
      slots[name] = new Slot(signalHandler);  
    };
    
    client.defChannel = function(name) {
      name = validateSlotName(name);
      this[name] = function() {
        return $.fm.ws.makeChannel(makeRequest(makePath(this.path, name)));
      };  
    };
    
    client.defNamespace = function(name) {
      var namespace = $.fm.core.ns(name, this); 
      
      namespace.path = makePath(this.path, name);
      namespace.defRequest = this.defRequest;
      namespace.defSignal = this.defSignal;
      namespace.defSlot = this.defSlot;
      namespace.defChannel = this.defChannel;
      namespace.defNamespace = this.defNamespace;
      
      return namespace;
    };
    
    slots.connectionAcknowledged = new Slot(function(id) {
      connectionId = id;
      connectionHandler.onConnect();
    });
        
    return client;                
  };
  
  $.fm.core.ns('fm.ws').makeClient = makeClient;
})(this, (this.jQuery || this));

