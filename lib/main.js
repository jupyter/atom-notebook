'use babel';

import path from 'path';
import React from 'react';
import uuid from 'uuid';
import _ from 'lodash';
import {CompositeDisposable} from 'atom';
import NotebookEditor from './notebook-editor';
import NotebookEditorView from './notebook-editor-view';``

export default {

  activate(state) {
    console.log('Activated.');
    this.openerDisposable = atom.workspace.addOpener(openURI);
    atom.views.addViewProvider({
      modelConstructor: NotebookEditor,
      createView: model => {
        let el = document.createElement('div');
        el.classList.add('notebook-wrapper');
        let viewComponent = React.render(
          <NotebookEditorView store={model} />,
          el);
        return el;
      }
    });
  },

  deactivate() {
    this.openerDisposable.dispose()
  },

  toggle() {
    console.log('JupyterNotebookAtom was toggled!');
    if (this.modalPanel.isVisible()) {
      return this.modalPanel.hide();
    } else {
      return this.modalPanel.show();
    }
  }

};

function openURI(uriToOpen) {
  const notebookExtensions = ['.ipynb'];
  let uriExtension = path.extname(uriToOpen).toLowerCase();
  if (_.include(notebookExtensions, uriExtension)) return new NotebookEditor(uriToOpen);
}
