'use babel';

import path from 'path';
import fs from 'fs-plus';
import React from 'react';
import uuid from 'uuid';
import Immutable from 'immutable';
import {CompositeDisposable} from 'atom';
import {File} from 'pathwatcher';
import {Emitter} from 'event-kit';
import {
  listRunningKernels,
  connectToKernel,
  startNewKernel,
  getKernelSpecs
} from 'jupyter-js-services';
import {XMLHttpRequest} from 'xmlhttprequest';
import ws from 'ws';
import {
  spawn,
  execSync
} from 'child_process';
import Dispatcher from './dispatcher';
import NotebookEditorView from './notebook-editor-view';
import NotebookCell from './notebook-cell';
global.XMLHttpRequest = XMLHttpRequest;
global.WebSocket = ws;

export default class NotebookEditor {

    constructor(uri) {
      console.log('NotebookEditor created for', uri);
      this.loadNotebookFile(uri);
      this.emitter = new Emitter();
      this.subscriptions = new CompositeDisposable();
      this.launchKernelGateway();
      Dispatcher.register(this.onAction);
      //TODO: remove these development handles
      global.editor = this;
      global.Dispatcher = Dispatcher;
    }

    findCellByID(id) {
      return this.state.get('cells').findEntry(cell => cell.getIn(['metadata', 'id']) == id);
    }

    findActiveCell() {
      return this.state.get('cells').findEntry(cell => cell.getIn(['metadata', 'focus']));
    }

    onAction = (payload) => {
      console.log(`Action '${payload.actionType.toString()}'received in NotebookEditor`);
      //TODO: add a notebook ID field to events and filter on it
      this.setModified(true);
      let cellInfo,
          cellIndex,
          cell;
      switch (payload.actionType) {
        case Dispatcher.actions.add_cell:
          let newCell = Immutable.fromJS({
            cell_type: 'code',
            execution_count: null,
            metadata: {
              collapsed: false
            },
            outputs: [],
            source: []
          });
          this.state = this.state.set('cells', this.state.get('cells').push(newCell));
          this._onChange();
          break;
        case Dispatcher.actions.cell_source_changed:
          cellInfo = this.findCellByID(payload.cellID);
          if (!cellInfo || cellInfo === undefined || cellInfo === null) {
            // return console.log('Message is for another notebook');
            return;
          } else {
            [cellIndex, cell] = cellInfo;
          }
          this.state = this.state.setIn(['cells', cellIndex, 'source'], payload.source);
          break;
        case Dispatcher.actions.cell_focus:
          let activeCellInfo = this.findActiveCell();
          if (!activeCellInfo || activeCellInfo === undefined || activeCellInfo === null) {
            // return console.log('Message is for another notebook');
            return;
          } else {
            [activeCellIndex, activeCell] = activeCellInfo;
            // console.log(`Cell is at index ${cellIndex}`);
          }
          this.state = this.state.setIn(['cells', activeCellIndex, 'metadata', 'focus'], false);
          cellInfo = this.findCellByID(payload.cellID);
          if (!cellInfo || cellInfo === undefined || cellInfo === null) {
            // return console.log('Message is for another notebook');
            return;
          } else {
            [cellIndex, cell] = cellInfo;
          }
          this.state = this.state.setIn(['cells', cellIndex, 'metadata', 'focus'], payload.isFocused);
          this._onChange();
          break;
        case Dispatcher.actions.run_cell:
          cellInfo = this.findCellByID(payload.cellID);
          if (!cellInfo || cellInfo === undefined || cellInfo === null) {
            // return console.log('Message is for another notebook');
            return;
          } else {
            [cellIndex, cell] = cellInfo;
          }
          if (this.session === undefined || this.session === null) return console.log('No session, can\'t run.');
          this.state = this.state.setIn(['cells', cellIndex, 'outputs'], Immutable.List());
          var future = this.session.execute({code: cell.get('source')}, false);
          var timer;
          future.onDone = () => {
            console.log('output_received', 'done');
            timer = setTimeout(() => future.dispose(), 3000);
          }
          future.onIOPub = (msg) => {
            Dispatcher.dispatch({
              actionType: Dispatcher.actions.output_received,
              cellID: payload.cellID,
              message: msg
            });
            clearTimeout(timer);
          }
          this._onChange();
          break;
        case Dispatcher.actions.run_active_cell:
          cellInfo = this.findActiveCell();
          if (!cellInfo || cellInfo === undefined || cellInfo === null) {
            // return console.log('Message is for another notebook');
            return;
          } else {
            [cellIndex, cell] = cellInfo;
            // console.log(`Cell is at index ${cellIndex}`);
          }
          if (this.session === undefined || this.session === null) {
            return atom.notifications.addError('atom-notebook', {
              detail: 'No running Jupyter session. Try closing and re-opening this file.',
              dismissable: true
            });
          }
          if (cell.get('cell_type') !== 'code') return;
          this.state = this.state.setIn(['cells', cellIndex, 'outputs'], Immutable.List());
          var future = this.session.execute({code: cell.get('source')}, false);
          var timer;
          future.onDone = () => {
            console.log('output_received', 'done');
            timer = setTimeout(() => future.dispose(), 3000);
          }
          future.onIOPub = (msg) => {
            Dispatcher.dispatch({
              actionType: Dispatcher.actions.output_received,
              cellID: cell.getIn(['metadata', 'id']),
              message: msg
            });
            clearTimeout(timer);
          }
          this._onChange();
          break;
        case Dispatcher.actions.output_received:
          cellInfo = this.findCellByID(payload.cellID);
          if (!cellInfo || cellInfo === undefined || cellInfo === null) {
            // return console.log('Message is for another notebook');
            return;
          } else {
            [cellIndex, cell] = cellInfo;
          }
          console.log('output_received', payload.message.content);
          let outputBundle = this.makeOutputBundle(payload.message);
          if (outputBundle) {
            let outputs = this.state.getIn(['cells', cellIndex, 'outputs']).toJS();
            let index = outputs.findIndex(output => output.output_type === outputBundle.output_type);
            if (index > -1) {
              if (outputBundle.data) {
                outputs[index].data = outputs[index].data.concat(outputBundle.data);
              }
              if (outputBundle.text) {
                if (outputs[index].name === outputBundle.name) {
                  outputs[index].text = outputs[index].text.concat(outputBundle.text);
                } else {
                  outputs = outputs.concat(outputBundle);
                }
              }
            } else {
              outputs = outputs.concat(outputBundle);
            }
            let execution_count = this.state.getIn(['cells', cellIndex, 'execution_count']);
            if (outputBundle.execution_count) execution_count = outputBundle.execution_count;
            let newCell = this.state.getIn(['cells', cellIndex]).merge({
              execution_count,
              outputs
            });
            this.state = this.state.setIn(['cells', cellIndex], newCell);
            this._onChange();
          }
          break;
        case Dispatcher.actions.interrupt_kernel:
          if (this.session === undefined || this.session === null) {
            return atom.notifications.addError('atom-notebook', {
              detail: 'No running Jupyter session. Try closing and re-opening this file.',
              dismissable: true
            });
          }
          this.session.interrupt().then(() => console.log('this.session.interrupt'));
          break;
        case Dispatcher.actions.destroy:
          if (this.session === undefined || this.session === null) {
            return atom.notifications.addError('atom-notebook', {
              detail: 'No running Jupyter session. Try closing and re-opening this file.',
              dismissable: true
            });
          }
          destroy();
          break;
      }
    }

    addStateChangeListener(callback) {
      return this.emitter.on('state-changed', callback);
    }

    _onChange = () => {
      this.emitter.emit('state-changed');
    }

    getState() {
      return this.state;
    }

    loadNotebookFile(uri) {
      // console.log('LOAD NOTEBOOK FILE');
      this.file = new File(uri);
      let parsedFile = this.parseNotebookFile(this.file);
      parsedFile.cells = parsedFile.cells.map(cell => {
        cell.metadata.id = uuid.v4();
        cell.metadata.focus = false;
        return cell;
      });
      if (parsedFile.cells.length > 0) parsedFile.cells[0].metadata.focus = true;
      this.state = Immutable.fromJS(parsedFile);
    }

    parseNotebookFile(file) {
      let fileString = this.file.readSync();
      return JSON.parse(fileString);
    }

    launchKernelGateway() {
      let language = this.state.getIn(['metadata', 'kernelspec', 'language']);
      let port = 8888;
      try {
        do {
          execSync(`lsof -i:${port}`);
          port++;
        } while (port < 9000);
      } catch(error) {
        this.kernelGateway = spawn('jupyter', ['kernelgateway', '--KernelGatewayApp.ip=localhost', `--KernelGatewayApp.port=${port}`], {
          cwd: atom.project.getPaths()[0]
        });
        this.kernelGateway.stdout.on('data', (data) => {
          console.log('kernelGateway.stdout  ' + data);
        });
        this.kernelGateway.stderr.on('data', (data) => {
          console.log('kernelGateway.stderr ' + data);
          if (data.toString().includes('The Jupyter Kernel Gateway is running at')) {
            getKernelSpecs(`http://localhost:${port}`).then((kernelSpecs) => {
              let spec = Object.keys(kernelSpecs.kernelspecs).find(kernel => kernelSpecs.kernelspecs[kernel].spec.language === language);
              console.log('Kernel: ', spec);
              if (spec) {
                startNewKernel({
                  baseUrl: `http://localhost:${port}`,
                  wsUrl: `ws://localhost:${port}`,
                  name: spec
                }).then((kernel) => {
                  this.session = kernel;
                });
              }
            });
          }
        });
        this.kernelGateway.on('close',  (code) => {
          console.log('kernelGateway.close ' + code);
        });
        this.kernelGateway.on('exit', (code) => {
          console.log('kernelGateway.exit ' + code);
        });
      }
    }

    makeOutputBundle(msg) {
  		let json = {};
  		json.output_type = msg.header.msg_type;
  		switch (json.output_type) {
  			case 'clear_output':
  				// msg spec v4 had stdout, stderr, display keys
  				// v4.1 replaced these with just wait
  				// The default behavior is the same (stdout=stderr=display=True, wait=False),
  				// so v4 messages will still be properly handled,
  				// except for the rarely used clearing less than all output.
  				console.log('Not handling clear message!');
  				this.clear_output(msg.content.wait || false);
  				return;
  			case 'stream':
  				json.text = msg.content.text.match(/[^\n]+(?:\r?\n|$)/g);
  				json.name = msg.content.name;
  				break;
  			case 'display_data':
  				json.data = Object.keys(msg.content.data).reduce((result, key) => {
            result[key] = msg.content.data[key].match(/[^\n]+(?:\r?\n|$)/g);
            return result;
          }, {});
  				json.metadata = msg.content.metadata;
  				break;
  			case 'execute_result':
  				json.data = Object.keys(msg.content.data).reduce((result, key) => {
            result[key] = msg.content.data[key].match(/[^\n]+(?:\r?\n|$)/g);
            return result;
          }, {});
  				json.metadata = msg.content.metadata;
  				json.execution_count = msg.content.execution_count;
  				break;
  			case 'error':
  				json.ename = msg.content.ename;
  				json.evalue = msg.content.evalue;
  				json.traceback = msg.content.traceback;
  				break;
  			case 'status':
  			case 'execute_input':
  				return false;
  			default:
  				console.log('unhandled output message', msg);
  				return false;
  		}
      return json;
  	}

    save() {
      this.saveAs(this.getPath());
    }

    saveAs(uri) {
      let nbData = this.asJSON()
      try {
        fs.writeFileSync(uri, nbData);
        this.modified = false;
      } catch(e) {
        console.error(e.stack);
        debugger;
      }
      this.emitter.emit('did-change-modified');
    }

    asJSON() {
      return JSON.stringify(this.state.toJSON(), null, 4);
    }

    shouldPromptToSave() {
      return this.isModified();
    }

    getSaveDialogOptions() {
      return {};
    }

    modified = false;
    // modifiedCallbacks = [];

    isModified() {
      return this.modified;
    }

    setModified(modified) {
      // console.log('setting modified');
      this.modified = modified;
      this.emitter.emit('did-change-modified');
    }

    onDidChangeModified(callback) {
      return this.emitter.on('did-change-modified', callback);
    }

    //----------------------------------------
    // Listeners, currently never called
    //----------------------------------------

    onDidChange(callback) {
      return this.emitter.on('did-change', callback);
    }

    onDidChangeTitle(callback) {
      return this.emitter.on('did-change-title', callback);
    }

    //----------------------------------------
    // Various info-fetching methods
    //----------------------------------------

    getTitle() {
      let filePath = this.getPath();
      if (filePath !== undefined && filePath !== null) {
        return path.basename(filePath);
      } else {
        return 'untitled';
      }
    }

    getURI() {
      // console.log('getURI called');
      return this.getPath();
    }

    getPath() {
      // console.log('getPath called');
      return this.file.getPath();
    }

    isEqual(other) {
      return (other instanceof ImageEditor && this.getURI() == other.getURI());
    }

    destroy() {
      console.log('destroy called');
      this.subscriptions.dispose();
      if (this.session) {
        this.session.shutdown().then(() => {
          this.kernelGateway.stdin.pause();
          this.kernelGateway.kill();
        });
      }
    }

    //----------------------------------------
    // Serialization (one of these days...)
    //----------------------------------------

    // static deserialize({filePath}) {
    //     if (fs.isFileSync(filePath)) {
    //         new NotebookEditor(filePath);
    //     } else {
    //         console.warn(`Could not deserialize notebook editor for path \
    //                      '${filePath}' because that file no longer exists.`);
    //     }
    // }

    // serialize() {
    //     return {
    //         filePath: this.getPath(),
    //         deserializer: this.constructor.name
    //     }
    // }

}

// atom.deserializers.add(NotebookEditor);
