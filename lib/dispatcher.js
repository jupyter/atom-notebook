'use babel';

import flux from 'flux';

let Dispatcher = new flux.Dispatcher();
Dispatcher.actions = {
  add_cell: Symbol('add_cell'),
  run_cell: Symbol('run_cell'),
  run_active_cell: Symbol('run_active_cell'),
  output_received: Symbol('output_received'),
  cell_source_changed: Symbol('cell_source_changed'),
  cell_focus: Symbol('cell_focus'),
  interrupt_kernel: Symbol('interrupt_kernel'),
  destroy: Symbol('destroy')
}

export default Dispatcher;
