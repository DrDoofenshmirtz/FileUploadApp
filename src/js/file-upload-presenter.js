(function(global, $) {
  var findWidgets,
      updateView,
      attach,
      install;    

  findWidgets = function() {
    var widgets = {};
    
    widgets.fileSelection = $('#fuapp-file-selection');
    widgets.button = $('#fuapp-upload-button');
    
    return widgets;
  };    
      
  updateView = function(command, widgets) {
    widgets.button.text(command.getText());
    widgets.button.prop('disabled', command.isExecutable() ? false : true);
    widgets.fileSelection.prop('disabled', command.isBusy() ? true : false);
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
      
  install = function(command) {
    var widgets = findWidgets();
    
    return attach(command, widgets);
  };
  
  $.fm.core.ns('fm.fuapp').installPresenter = install;
})(this, (this.jQuery || this));

