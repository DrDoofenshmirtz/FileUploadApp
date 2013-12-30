(function(global, $) {
    var makeError = function(errorType, message) {
      var errorToString = errorType + ': ' + message;
      
      return {
        errorType: errorType,
        message: message,
        toString: function() { 
          return errorToString; 
        }
      };
    };
    var raise = function(errorType, message) {
      throw makeError(errorType, message);
    };    
    var namespace = function(path, parent) {
      path = (path || '').toString();
      parent = (parent || $);
      
      if (path.length <= 0) {
        raise('ArgumentError', 'Namespace path must be a non-empty string!');        
      }
      
      var createNamespace = function(parent, elements) {
        if (elements.length <= 0) {
          return parent;
        }
        
        var childName = elements.shift();
        
        if (childName.length <= 0) {
          raise('NamespaceError', 'Namespace element is empty!');
        }
        
        var child = parent[childName];
        
        if (child) {
          if (typeof child !== 'object') {
            raise('NamespaceError', 'Namespace exists and is not an object!');              
          }
        } else {
          child = {};
          parent[childName] = child;
        }
        
        return createNamespace(child, elements);
      };
      
      return createNamespace(parent, path.split(/\s*\.\s*/));            
    };
    
    namespace('fm.core').ns = namespace;
    namespace('fm.core').makeError = makeError;
    namespace('fm.core').raise = raise;
})(this, (this.jQuery || this));

