import * as vscode from "vscode";
import { traversNode } from "@ballerina/syntax-tree/src/ast-utils";
import { Visitor } from "@ballerina/syntax-tree/src/base-visitor";
import * as Ballerina from "@ballerina/syntax-tree/src/syntax-tree-interfaces";

enum NODE_KIND { FUNCTION = "Function", CLASS = "ClassDefn", TYPE = "TypeDefinition", RECORD = "RecordType" }
enum API_DOC_DIR { FUNCTION = "functions", CLASS = "classes", RECORD = "records", OBJECT = "abstractObjects" }

class DocGenVisitor implements Visitor {
    private codeLenses: vscode.CodeLens[];
    private isInsideNode: boolean;
    private hasInnerDocChild: boolean;
    private moduleName: string;

    constructor(moduleName: string) {
        this.moduleName = moduleName;
        this.codeLenses = [];
        this.isInsideNode = false;
        this.hasInnerDocChild = false;
    }

    public beginVisitFunctionDefinition(node: Ballerina.FunctionDefinition, parent?: Ballerina.STNode): void {
        if (node.metadata && this.isPublic(node.qualifierList)) {
            if (!this.isInsideNode) {
                this.codeLenses.push(this.createCodeLens(node.position!, node.functionName.value, API_DOC_DIR.FUNCTION));
            } else if (!this.hasInnerDocChild && this.isInsideNode) {
                this.hasInnerDocChild = true;
            }
        }
    }

    public beginVisitTypeDefinition(node: Ballerina.TypeDefinition, parent?: Ballerina.STNode): void {
        this.isInsideNode = true;
    }

    public endVisitTypeDefinition(node: Ballerina.TypeDefinition, parent?: Ballerina.STNode): void {
        if (this.hasInnerDocChild || (node.metadata && node.visibilityQualifier)) {
            if (node.kind === NODE_KIND.TYPE) {
                this.codeLenses.push(this.createCodeLens(node.position!, node.typeName.value, API_DOC_DIR.OBJECT));
            } else {
                this.codeLenses.push(this.createCodeLens(node.position!, node.typeName.value, API_DOC_DIR.RECORD));
            }
        }
        this.isInsideNode = false;
        this.hasInnerDocChild = false;
    }

    beginVisitClassDefinition(node: Ballerina.ClassDefinition, parent?: Ballerina.STNode): void {
        this.isInsideNode = true;
    }

    endVisitClassDefinition(node: Ballerina.ClassDefinition, parent?: Ballerina.STNode): void {
        if (this.hasInnerDocChild || (node.metadata && node.visibilityQualifier)) {
            this.codeLenses.push(this.createCodeLens(node.position!, node.className.value, API_DOC_DIR.CLASS));
        }
        this.isInsideNode = false;
        this.hasInnerDocChild = false;
    }

    beginVisitMethodDeclaration(node: Ballerina.MethodDeclaration, parent?: Ballerina.STNode): void {
        if (!this.hasInnerDocChild && node.metadata && this.isPublic(node.qualifierList)) {
            this.hasInnerDocChild = true;
        }
    }

    beginVisitObjectMethodDefinition(node: Ballerina.ObjectMethodDefinition, parent?: Ballerina.STNode): void {
        if (!this.hasInnerDocChild && node.metadata && this.isPublic(node.qualifierList)) {
            this.hasInnerDocChild = true;
        }
    }

    public getCodeLens(): vscode.CodeLens[] {
        return this.codeLenses;
    }

    private createCodeLens(position: Ballerina.NodePosition, nodeName: string, nodeType: string): vscode.CodeLens {
        const startLine: number = position.startLine!;
        const startColumn: number = position.startColumn!;
        const endLine: number = position.endLine!;
        const endColumn: number = position.endColumn!;
        const codeLens = new vscode.CodeLens(new vscode.Range(startLine, startColumn, endLine, endColumn));
        codeLens.command = {
            arguments: [
                {
                    moduleName: this.moduleName,
                    nodeName,
                    nodeType
                }
            ],
            command: "ballerina.showDocs",
            title: "Preview Docs",
            tooltip: "Click to preview documentation"
        };
        return codeLens;
    }

    private isPublic(qualifierList: Ballerina.STNode[]): Boolean {
        let isPublic: Boolean = false;
        qualifierList.forEach(qualifier => {
            if (!isPublic && qualifier.value && qualifier.value === 'public') {
                isPublic = true;
            }
        });
        return isPublic;
    }
}

export function getCodeLens(syntaxTree: Ballerina.STNode, moduleName: string): vscode.CodeLens[] {
    const docGenVisitor = new DocGenVisitor(moduleName);
    traversNode(syntaxTree, docGenVisitor);
    return docGenVisitor.getCodeLens();
}