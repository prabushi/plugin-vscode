import * as vscode from 'vscode';
import { ExtendedLangClient } from '../core/extended-language-client';
import { getCodeLens } from './documentation-visitor';
import * as path from 'path';

/**
 * CodelensProvider for API document generation.
 */
export class CodelensProvider implements vscode.CodeLensProvider {

    private client: ExtendedLangClient;
    private _onDidChangeCodeLenses: vscode.EventEmitter<void> = new vscode.EventEmitter<void>();
    public readonly onDidChangeCodeLenses: vscode.Event<void> = this._onDidChangeCodeLenses.event;

    constructor(client: ExtendedLangClient) {
        this.client = client;
        vscode.workspace.onDidChangeConfiguration((_) => {
            this._onDidChangeCodeLenses.fire();
        });
    }

    public provideCodeLenses(document: vscode.TextDocument, token: vscode.CancellationToken): vscode.CodeLens[] | Thenable<vscode.CodeLens[]> {
        let codeLenses: vscode.CodeLens[] = [];
        if (vscode.workspace.getConfiguration("codelens-docs").get("enableCodeLens", true)) {
            return this.getCodeLensList(document);
        }
        return codeLenses;
    }

    public resolveCodeLens(codeLens: vscode.CodeLens, token: vscode.CancellationToken) {
        if (vscode.workspace.getConfiguration("codelens-docs").get("enableCodeLens", true)) {
            return codeLens;
        }
        return null;
    }

    private getCodeLensList(document: vscode.TextDocument): Thenable<vscode.CodeLens[]> {
        return this.client.getSyntaxTree(document.uri).then((response) => this.loadCodeLensList(response, document.fileName));
    }

    private loadCodeLensList(response, filePath: string) {
        const emptyCodeLens: vscode.CodeLens[] = [];
        if (!vscode.workspace.workspaceFolders || vscode.workspace.workspaceFolders.length === 0) {
            return emptyCodeLens;
        }
        const rootPath: string = vscode.workspace.workspaceFolders![0].uri.fsPath;
        const workspacePath: string = rootPath.substring(0, rootPath.lastIndexOf(path.sep));
        let paths: string[] = filePath.substring(workspacePath.length + 1).split(path.sep);
        let moduleName;
        if (paths.length === 2) {
            moduleName = paths[0];
        } else if (paths.length === 4) {
            moduleName = paths[2];
        } else {
            return emptyCodeLens;
        }

        if (response.syntaxTree) {
            return getCodeLens(response.syntaxTree, moduleName);
        }
        return emptyCodeLens;
    }
}

