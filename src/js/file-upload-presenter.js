(function(global, $) {
  var findWidgets,
      updateView,
      attach,
      install;    

  findWidgets = function(parent) {
    var widgets = {};
    
    widgets.fileSelection = parent.find('.fuapp-file-selection').first();
    widgets.button = parent.find('.fuapp-upload-button').first();
    widgets.progressBar = parent.find('.fuapp-progress-bar').first();
    
    return widgets;
  };    
      
  updateView = function(command, widgets) {
    var progress = command.getProgress();
    
    widgets.button.text(command.getText());
    widgets.button.prop('disabled', command.isExecutable() ? false : true);
    widgets.fileSelection.prop('disabled', command.isBusy() ? true : false);
    
    if (progress < 0) {
      widgets.progressBar.hide();
      widgets.progressBar.prop('value', 0);
    } else {
      widgets.progressBar.show();
      widgets.progressBar.prop('value', Math.min(1, progress));
    }
  };    
      
  attach = function(command, widgets) {
    var getFiles = function() { return widgets.fileSelection.prop('files'); };
    
    widgets.fileSelection.change(function() { command.setFiles(getFiles()); });
    widgets.button.click(function() { command.execute(); });
    command.setFiles(getFiles());
    command.onChange(function() { updateView(command, widgets); });
    updateView(command, widgets);
    
    return function() {
      delete command.onChange;
      widgets.fileSelection.off('change');
      widgets.button.off('click');
    };
  };
      
  install = function(parent, command) {
    if (!parent) {
      $.fm.core.raise('ArgumentError', 'Illegal value for "parent"!');
    }
    
    if (!command) {
      $.fm.core.raise('ArgumentError', 'Illegal value for "command"!');
    }
    
    return attach(command, findWidgets($(parent)));
  };
  
  $.fm.core.ns('fm.fuapp').installPresenter = install;
})(this, (this.jQuery || this));

