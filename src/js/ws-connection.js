(function(global, $) {
  var makeSocketProducer = function(url, retryDelayMillis, eventHandler) {
    if (!global.WebSocket) {
      $.fm.core.raise('ConnectionError', 'WebSockets are not supported!');
    }
    
    var webSocket,
        retryTaskId,
        destroyed;
    
    var produce = function() {
      if (!destroyed && !webSocket) {
        webSocket = new global.WebSocket(url);
        webSocket.onopen = function(event) {
          if (destroyed) {
            return;
          }
          
          eventHandler.onReady(webSocket);
        };
        webSocket.onclose = function(event) {
          if (destroyed) {
            return;
          }
          
          detachHandlers(webSocket);
          eventHandler.onClose(webSocket);
          webSocket = undefined;
          retryTaskId = global.setTimeout(produce, retryDelayMillis);
        };
        webSocket.onmessage = function(event) {
          if (destroyed) {
            return;
          }
          
          eventHandler.onMessage(webSocket, event.data);
        };
        webSocket.onerror = function(error) {
          if (destroyed) {
            return;
          }
          
          eventHandler.onError(webSocket, error);
        };
      }            
    }
    
    var detachHandlers = function(webSocket) {
      webSocket.onopen = undefined;
      webSocket.onclose = undefined;
      webSocket.onmessage = undefined;
      webSocket.onerror = undefined;
    };
    
    var stopRetryTask = function() {
      if (retryTaskId) {
        global.clearTimeout(retryTaskId);
        retryTaskId = undefined;
      }
    };
    
    var destroy = function() {
      if (destroyed) {
        return;
      }
      
      destroyed = true;
      stopRetryTask();
            
      if (webSocket) {
        detachHandlers(webSocket);
        webSocket.close();
        webSocket = undefined;
      }
    };
    
    return {produce: produce, destroy: destroy};
  };
    
  var makeConnection = function(spec, eventHandler) {
    var url,
        socketProducer,
        messages,
        sendTaskId,
        webSocket;
        
    if (!eventHandler) {
      $.fm.core.raise('ArgumentError', 'Invalid event handler!');
    }
    
    url = $.fm.ws.buildURL(spec);    
    messages = [];     
        
    var open = function() {
      if (!socketProducer) {
        socketProducer = makeSocketProducer(url, 2000, {
          onReady: function(socket) {
            if (!webSocket) {
              webSocket = socket;
              eventHandler.onConnect();
            }
          },
          onMessage: function(socket, message) {
            if (socket === webSocket) {
              eventHandler.onMessageReceived(message);
            }
          },
          onError: function(socket, error) {
            if (socket === webSocket) {
              eventHandler.onError(error);
            }
          },
          onClose: function(socket) {
            if (!webSocket) {
              eventHandler.onConnectFailed();
            } else if (socket === webSocket) {
              webSocket = undefined;
              eventHandler.onDisconnect();
            }
          }
        });
        socketProducer.produce();
      }
    };
        
    var stopSendTask = function() {
      if (sendTaskId) {
        global.clearInterval(sendTaskId);
        sendTaskId = undefined;
      }
    };    
        
    var send = function(message) {
      if (!socketProducer) {
        $.fm.core.raise('ConnectionError', 'Connection is closed!');
      }
      
      var currentMessage;
      
      var sendPendingMessages = function() {
        if (!socketProducer) {
          currentMessage = undefined;
          stopSendTask();                    
        } else if (webSocket) {
          if (webSocket.bufferedAmount <= 0) {
            if (currentMessage) {
              // TODO: how to utilize this? May be obsolete!
              eventHandler.onMessageSent(currentMessage);
            }
            
            currentMessage = messages.shift();
            
            if (currentMessage) {
              webSocket.send(currentMessage);
            } else {
              stopSendTask();
            }
          }
        }
      } 
      
      if ((messages.push(message) === 1) && !sendTaskId) {
        sendTaskId = global.setInterval(sendPendingMessages, 25);
      }
    };
    
    var close = function() {
      var activeProducer = socketProducer,
          activeSocket = webSocket;
      
      socketProducer = undefined;
      webSocket = undefined;
      
      if (activeProducer) {
        messages.length = 0;        
        activeProducer.destroy(); 
        stopSendTask();
        
        if (activeSocket) {
          eventHandler.onConnectionClosed();
        }
      }            
    };
                
    return {open: open, send: send, close: close};        
  };
  
  $.fm.core.ns('fm.ws').makeConnection = makeConnection;
})(this, (this.jQuery || this));

