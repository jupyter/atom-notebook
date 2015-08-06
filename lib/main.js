"use babel";

let path = require('path'),
    _ = require('lodash'),
    React = require('react'),
    uuid = require('uuid'),
    CompositeDisposable = require('atom').CompositeDisposable,

    NotebookEditor = require('./notebook-editor'),
    NotebookEditorView = require('./notebook-editor-view');

export default {

    activate: function(state) {
        console.log("Activated.");

        this.openerDisposable = atom.workspace.addOpener(openURI);

        atom.views.addViewProvider({
            modelConstructor: NotebookEditor,
            createView: model => {
                let el = document.createElement("div");
                el.classList.add("notebook-wrapper");
                let viewComponent = React.render(
                    <NotebookEditorView store={model} />,
                    el);
                return el;
            }
        });
        
        //                scope for command     name of command      command function
        //                       |                     |                    |
        atom.commands.add('atom-text-editor', 'jupyter:new-command', this.myNewCommand);
    },
    
    myNewCommand: () => {},

    deactivate: function() {
        this.openerDisposable.dispose()
    },

    toggle: function() {
        console.log('JupyterNotebookAtom was toggled!');
        if (this.modalPanel.isVisible()) {
            return this.modalPanel.hide();
        } else {
            return this.modalPanel.show();
        }
    }
};

const notebookExtensions = ['.ipynb'];
openURI = function(uriToOpen) {
    let uriExtension = path.extname(uriToOpen).toLowerCase();

    if (_.include(notebookExtensions, uriExtension)) {
        return new NotebookEditor(uriToOpen);
    }
}
