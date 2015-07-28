"use babel";

let path = require('path'),
    fs = require('fs-plus'),
    File = require('pathwatcher').File,
    React = require('react'),
    CompositeDisposable = require('atom').CompositeDisposable,
    _ = require('lodash'),
    Immutable = require('immutable'),

    Dispatcher = require('./dispatcher'),
    DisplayArea = require('./jupyter-display-area'),
    Editor = require('./text-editor');

export default class NotebookCell extends React.Component {
    constructor(props) {
        super(props);
    }

    render() {
        console.log("Cell rendering.");
        return (
            <div className="notebook-cell">
                <div className="cell-sidebar">
                    <div
                        className="execution-count-label" >
                        Execution: [{this.props.data.get('execution_count')}]
                    </div>
                    <button
                        className="btn btn-primary icon icon-playback-play"
                        onClick={this.runCell} >
                        Run
                    </button>
                </div>
                <div className="cell-main">
                    <Editor
                        data={this.props.data}
                        language={this.props.language} />
                    <DisplayArea
                        data={this.props.data} />
                </div>
            </div>
        );
    }

    runCell = () => {
        Dispatcher.dispatch({
            actionType: Dispatcher.actions.run_cell,
            cellID: this.props.data.get('id')
        });
    }
}
