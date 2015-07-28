"use babel";

let flux = require('flux');

var Dispatcher = new flux.Dispatcher();
Dispatcher.actions = {
    add_cell: Symbol('add_cell'),
    run_cell: Symbol('run_cell'),
    output_received: Symbol('output_received'),
    cell_source_changed: Symbol('cell_source_changed')
}

export default Dispatcher;
