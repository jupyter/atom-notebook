"use babel";

let path = require('path'),
    fs = require('fs-plus'),
    File = require('pathwatcher').File,
    React = require('react'),
    CompositeDisposable = require('atom').CompositeDisposable,
    _ = require('lodash'),
    Immutable = require('immutable'),

    Editor = require('./text-editor');

export default class NotebookCell extends React.Component {
    constructor(props) {
        super(props);
    }

    render() {
        console.log("Cell rendering.");
        return (
            <div>
                <Editor data={this.props.data} />
            </div>
        );
    }
}
