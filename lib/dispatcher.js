"use babel";

let flux = require('flux');

var Dispatcher = new flux.Dispatcher();
Dispatcher.actions = {
    file_loaded: Symbol('file_loaded'),
    output_received: Symbol('output_received'),
    file_loaded: Symbol('file_loaded'),
    cell_source_changed: Symbol('cell_source_changed')
}

export default Dispatcher;
