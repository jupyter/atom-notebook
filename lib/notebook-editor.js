"use babel";

let path = require('path'),
    fs = require('fs-plus'),
    File = require('pathwatcher').File,
    React = require('react'),
    CompositeDisposable = require('atom').CompositeDisposable,
    _ = require('lodash',)
    Immutable = require('immutable'),

    Dispatcher = require('./dispatcher'),
    NotebookEditorView = require('./notebook-editor-view'),
    NotebookCell = require('./notebook-cell');

export default class NotebookEditor {
    static deserialize({filePath}) {
        if (fs.isFileSync(filePath)) {
            new NotebookEditor(filePath);
        } else {
            console.warn(`Could not deserialize notebook editor for path \
                         '${filePath}' because that file no longer exists.`);
        }
    }


    constructor(uri) {
        console.log("NotebookEditor created for", uri);
        this.loadNotebookFile(uri)
        this.subscriptions = new CompositeDisposable();

        Dispatcher.register(this.onAction);
    }

    onAction = (payload) => {
        console.log(`Action '${payload.actionType.toString()}'received in NotebookEditor`);
    }

    getState() {
        return this.state;
    }

    loadNotebookFile(uri) {
        this.file = new File(uri);
        this.state = this.parseNotebookFile(this.file);
    }

    parseNotebookFile(file) {
        let fileString = this.file.readSync();
        return Immutable.fromJS(JSON.parse(fileString));
    }





    onDidChange() {
        console.log("onDidChange called");
    }

    onDidChangeTitle() {
        console.log("onDidChangeTitle called");
    }

    getTitle() {
        console.log("getTitle called");
        return "three";
    }
    getURI() {
        console.log("getURI called");
        return this.getPath();
    }
    getPath() {
        console.log("getPath called");
        return this.file.getPath();
    }
    isEqual() {
        console.log("isEqual called");
        return false;
    }
    dispose() {
        console.log("dispose called");
    }

    serialize() {
        return {
            filePath: this.getPath(),
            deserializer: this.constructor.name
        }
    }
}

atom.deserializers.add(NotebookEditor);
