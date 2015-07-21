"use babel";

let path = require('path'),
    _ = require('lodash'),
    // Immutable = require('immutable'),
    React = require('react'),
    uuid = require('uuid'),
    CompositeDisposable = require('atom').CompositeDisposable,

    NotebookEditor = require('./notebook-editor'),
    NotebookEditorView = require('./notebook-editor-view');

export default {

    activate: function(state) {
        console.log("Activated.");

        // this.dispatcher = new Dispatcher();
        // this.CellStore = Immutable.fromJS({
        //     cells: []
        // });
        //
        // this.dispatcher.register(payload => {
        //     if (payload.actionType === 'cell-create') {
        //         this.CellStore.cells = this.CellStore.cells.push(payload.newCell)
        //     }
        // });


        this.openerDisposable = atom.workspace.addOpener(openURI)

        atom.views.addViewProvider({
            modelConstructor: NotebookEditor,
            createView: model => {
                let el = document.createElement("div");
                React.render(
                    <NotebookEditorView store={model}/>,
                    el);
                // debugger;
                return el;
            }
        });


        // this.jupyterNotebookAtomView = new JupyterNotebookAtomView(state.jupyterNotebookAtomViewState);
        //
        // this.modalPanel = atom.workspace.addModalPanel({
        //     item: this.jupyterNotebookAtomView.getElement(),
        //     visible: false
        // });
        //
        // this.subscriptions = new CompositeDisposable;
        //
        // return this.subscriptions.add(atom.commands.add('atom-workspace', {
        //     'jupyter-notebook-atom:toggle': (function(_this) {
        //         return function() {
        //             return _this.toggle();
        //         };
        //     })(this)
        // }));
    },

    deactivate: function() {
        this.openerDisposable.dispose()
    },

    // serialize: function() {
    //     return {
    //         jupyterNotebookAtomViewState: this.jupyterNotebookAtomView.serialize()
    //     };
    // },

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
        // let mountPoint = document.createElement('div');
        // React.render(
        //     <NotebookEditor id={uuid.v4()} uri={uriToOpen} />,
        //     mountPoint
        // );
        // return mountPoint;
        return new NotebookEditor(uriToOpen);
    }
}
