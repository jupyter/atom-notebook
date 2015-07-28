"use babel";

let path = require('path'),
    fs = require('fs-plus'),
    File = require('pathwatcher').File,
    React = require('react'),
    CompositeDisposable = require('atom').CompositeDisposable,
    _ = require('lodash'),
    Immutable = require('immutable'),

    Dispatcher = require('./dispatcher'),
    DisplayArea = require('./display-area'),
    Editor = require('./text-editor');

export default class NotebookCell extends React.Component {
    constructor(props) {
        super(props);
    }

    render() {
        console.log("Cell rendering.");

        let focusClass = "";
        if (this.props.data.get('focus')) {
            focusClass = " focused";
        }

        return (
            <div className={"notebook-cell" + focusClass}
                onFocus={this.triggerFocused.bind(this, true)} >
                <div
                    className="execution-count-label" >
                In [{this.props.data.get('execution_count') || ' '}]:
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

        // <button
        //     className="btn btn-primary icon icon-playback-play"
        //     onClick={this.runCell} >
        //     Run
        // </button>
    }

    triggerFocused(isFocused) {
        Dispatcher.dispatch({
            actionType: Dispatcher.actions.cell_focus,
            cellID: this.props.data.get('id'),
            isFocused: isFocused
        });
    }

    runCell = () => {
        Dispatcher.dispatch({
            actionType: Dispatcher.actions.run_cell,
            cellID: this.props.data.get('id')
        });
    }
}
