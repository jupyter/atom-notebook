"use babel";

let path = require('path'),
    fs = require('fs-plus'),
    File = require('pathwatcher').File,
    React = require('react'),
    CompositeDisposable = require('atom').CompositeDisposable,
    _ = require('lodash'),
    Immutable = require('immutable'),
    {Emitter} = require('event-kit'),

    KernelLauncher = require('jupyter-kernel-launcher'),

    Dispatcher = require('./dispatcher'),
    NotebookEditorView = require('./notebook-editor-view'),
    NotebookCell = require('./notebook-cell');

import {Transformime} from 'transformime';
import {
        StreamTransformer,
        TracebackTransformer,
        MarkdownTransformer,
    } from 'transformime-jupyter-transformers';

_.oldUniqueId = _.uniqueId;
_.uniqueId = function() {
    console.log("Getting a unique ID!");
    // debugger;
    return _.oldUniqueId();
}

export default class NotebookEditor {
    constructor(uri) {
        console.log("NotebookEditor created for", uri);
        this.loadNotebookFile(uri);

        this.emitter = new Emitter();
        this.subscriptions = new CompositeDisposable();

        this.transformer = new Transformime();

        this.transformer.transformers.push(new StreamTransformer());
        this.transformer.transformers.push(new TracebackTransformer());
        this.transformer.transformers.push(new MarkdownTransformer());

        let language = this.state.getIn([
            'metadata', 'kernelspec', 'language'
        ]);

        if (KernelLauncher.languageHasKernel(language)) {
            KernelLauncher.startKernel(language, (session) => {
                this.session = session;
            });
        }

        Dispatcher.register(this.onAction);

        //TODO: remove these
        global.editor = this;
        global.Dispatcher = Dispatcher;
    }

    findCellByID(id) {
        return this.state.get('cells').findEntry(cell => {
            return cell.get('id') == id;
        });
    }

    findActiveCell() {
        let activeCellInfo = this.state.get('cells').findEntry(cell => {
            return cell.get('focus');
        });
        console.log("Active cell:", activeCellInfo);
        return activeCellInfo;
    }

    onAction = (payload) => {
        console.log(`Action '${payload.actionType.toString()}'received in NotebookEditor`);

        //TODO: add a notebook ID field to events and filter on it
        this.setModified(true);

        let cellInfo, cellIndex, cell;
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
                this.state = this.state.set(
                    'cells',
                    this.state.get('cells').push(newCell));
                this._onChange();
                break;
            case Dispatcher.actions.cell_source_changed:
                cellInfo = this.findCellByID(payload.cellID);
                if (!cellInfo || cellInfo === undefined || cellInfo === null) {
                    console.log("Message is for another notebook");
                    return;
                } else {
                    [cellIndex, cell] = cellInfo;
                }

                this.state = this.state.setIn(
                    ['cells', cellIndex, 'source'],
                    payload.source);
                break;
            case Dispatcher.actions.cell_focus:
                let activeCellInfo = this.findActiveCell();
                if (!activeCellInfo || activeCellInfo === undefined || activeCellInfo === null) {
                    console.log("Message is for another notebook");
                    return;
                } else {
                    [activeCellIndex, activeCell] = activeCellInfo;
                    console.log(`Cell is at index ${cellIndex}`);
                }

                this.state = this.state.setIn(
                    ['cells', activeCellIndex, 'focus'],
                    false);

                cellInfo = this.findCellByID(payload.cellID);
                if (!cellInfo || cellInfo === undefined || cellInfo === null) {
                    console.log("Message is for another notebook");
                    return;
                } else {
                    [cellIndex, cell] = cellInfo;
                }

                this.state = this.state.setIn(
                    ['cells', cellIndex, 'focus'],
                    payload.isFocused);

                this._onChange();
                break;
            case Dispatcher.actions.run_cell:
                cellInfo = this.findCellByID(payload.cellID);
                if (!cellInfo || cellInfo === undefined || cellInfo === null) {
                    console.log("Message is for another notebook");
                    return;
                } else {
                    [cellIndex, cell] = cellInfo;
                }

                if (this.session === undefined || this.session === null) {
                    console.log("No session, can't run.");
                    return;
                }

                this.state = this.state.setIn(
                    ['cells', cellIndex, 'outputs'],
                    Immutable.List()
                );

                var code = cell.get('source');
                this.session.execute(code, (resultMessage) => {
                    Dispatcher.dispatch({
                        actionType: Dispatcher.actions.output_received,
                        cellID: payload.cellID,
                        message: resultMessage
                    });
                });

                this._onChange();
                break;
            case Dispatcher.actions.run_active_cell:
                cellInfo = this.findActiveCell();
                if (!cellInfo || cellInfo === undefined || cellInfo === null) {
                    console.log("Message is for another notebook");
                    return;
                } else {
                    [cellIndex, cell] = cellInfo;
                    console.log(`Cell is at index ${cellIndex}`);
                }

                if (this.session === undefined || this.session === null) {
                    console.log("No session, can't run.");
                    return;
                }

                this.state = this.state.setIn(
                    ['cells', cellIndex, 'outputs'],
                    Immutable.List()
                );

                var code = cell.get('source');
                this.session.execute(code, (resultMessage) => {
                    Dispatcher.dispatch({
                        actionType: Dispatcher.actions.output_received,
                        cellID: cell.get('id'),
                        message: resultMessage
                    });
                });

                this._onChange();
                break;
            case Dispatcher.actions.output_received:
                cellInfo = this.findCellByID(payload.cellID);
                if (!cellInfo || cellInfo === undefined || cellInfo === null) {
                    console.log("Message is for another notebook");
                    return;
                } else {
                    [cellIndex, cell] = cellInfo;
                }
                let mimeBundle = this.makeMimeBundle(payload.message);

                if (mimeBundle) {
                    this.transformer.transformRichest(mimeBundle, document).then(res => {
                        let {el} = res;
                        let outputs = this.state.getIn(['cells', cellIndex, 'outputs']);
                        outputs = outputs.push(el.outerHTML);
                        this.state = this.state.setIn(
                            ['cells', cellIndex, 'outputs'],
                            outputs
                        );
                        this._onChange();
                    }).catch(e => {
                        debugger;
                    });
                }

                break;

            case Dispatcher.actions.interrupt_kernel:
                if (this.session === undefined || this.session === null) {
                    console.log("No session, can't interrupt.");
                    return;
                }

                this.session.interrupt();

                break;
        }
    }

    addStateChangeListener(callback) {
        return this.emitter.on('state-changed', callback);
    }

    _onChange = () => {
        this.emitter.emit('state-changed');
    }

    //TODO: make this less dirty
    makeMimeBundle(msg) {
        var json = {};
        var msg_type = json.output_type = msg.header.msg_type;
        var content = msg.content;
        switch (msg_type) {
            case 'clear_output':
                // msg spec v4 had stdout, stderr, display keys
                // v4.1 replaced these with just wait
                // The default behavior is the same (stdout=stderr=display=True, wait=False),
                // so v4 messages will still be properly handled,
                // except for the rarely used clearing less than all output.

                console.log("Not handling clear message!");
                this.clear_output(msg.content.wait || false);
                return;
            case 'stream':
                json.text = content.text;
                json.name = content.name;
                break;
            case 'display_data':
                json.data = content.data;
                json.metadata = content.metadata;
                break;
            case 'execute_result':
                json.data = content.data;
                json.metadata = content.metadata;
                json.execution_count = content.execution_count;
                break;
            case 'error':
                json.ename = content.ename;
                json.evalue = content.evalue;
                json.traceback = content.traceback;
                break;
            case 'status':
            case 'execute_input':
                // Explicit ignore of status changes and input
                return false;
            default:
                console.log('unhandled output message', msg);
                return false;
        }
        // this.append_output(json);

        let bundle, el;
        bundle = {};

        switch(json.output_type) {
            case 'execute_result':
            case 'display_data':
                bundle = json.data;
                break;
            case 'stream':
                // bundle = {'text/plain': json.text};
                bundle = {'jupyter/stream': json};
                break;
            case 'error':
                bundle = {'jupyter/traceback': json};
                break;
            default:
                console.warn('Unrecognized output type: ' + json.output_type);
                bundle = {'text/plain': 'Unrecognized output type' + JSON.stringify(json)};
        }
        return bundle;
    }

    getState() {
        return this.state;
    }

    loadNotebookFile(uri) {
        console.log("LOAD NOTEBOOK FILE");
        this.file = new File(uri);
        let parsedFile = this.parseNotebookFile(this.file);
        parsedFile.cells = _.map(parsedFile.cells, cell => {
            cell.id = _.uniqueId().toString();
            cell.outputs = [];
            cell.focus = false;
            return cell;
        });
        parsedFile.cells[0].focus = true;
        this.state = Immutable.fromJS(parsedFile);
    }

    parseNotebookFile(file) {
        let fileString = this.file.readSync();
        return JSON.parse(fileString);
    }

    //----------------------------------------
    // Saving
    //----------------------------------------

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

    //----------------------------------------
    // Modification state
    //----------------------------------------

    modified = false;
    // modifiedCallbacks = [];

    isModified() {
        return this.modified;
    }

    setModified(modified) {
        console.log("setting modified");
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
        console.log("getURI called");
        return this.getPath();
    }

    getPath() {
        console.log("getPath called");
        return this.file.getPath();
    }

    isEqual(other) {
        return (other instanceof ImageEditor
                && this.getURI() == other.getURI());
    }

    destroy() {
        console.log("destroy called");
        this.subscriptions.dispose();
        try {
            this.session.destroy();
        } catch(e) {}
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
