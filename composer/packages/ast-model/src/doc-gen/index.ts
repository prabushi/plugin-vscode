// import { BallerinaEndpoint } from "@ballerina/lang-service";
// tslint:disable-next-line:no-implicit-dependencies
import * as vscode from "vscode";
import * as Ballerina from "../ast-interfaces";
import { Visitor } from "../base-visitor";
// import { ASTKindChecker } from "../check-kind-util";
// import * as defaults from "../default-nodes";
// import { emitTreeModified } from "../events";
import { traversNode } from "../model-utils";

enum API_DOC_DIR { FUNCTION = "functions", CLASS = "classes", RECORD = "records", OBJECT = "abstractobjects" }

const mod = "mod1";

class DocGenVisitor implements Visitor {
    private codeLenses: vscode.CodeLens[];
    private isInsideTypeNode: boolean;
    private isInsideClassNode: boolean;
    private hasInnerDocChild: boolean;
    // private hasDocChildInsideClass = false;
    constructor() {
        this.codeLenses = [];
        this.isInsideTypeNode = false;
        this.isInsideClassNode = false;
        this.hasInnerDocChild = false;
    }

    public reset() {
        this.codeLenses = [];
        this.isInsideTypeNode = false;
        this.hasInnerDocChild = false;
        // this.isInsideClass = false;
        // this.hasDocChildInsideClass = false;
    }

    // doc generation for consts
    public beginVisitFunction(node: Ballerina.Function, parent?: Ballerina.ASTNode): void {
        if (!this.isInsideTypeNode && !this.isInsideClassNode && node.public && node.markdownDocumentationAttachment) {
            this.codeLenses.push(this.createCodeLens(node.markdownDocumentationAttachment.position!, mod,
                node.name.value, API_DOC_DIR.FUNCTION)); // node.typeInfo.modName
        } else if (!this.hasInnerDocChild && (this.isInsideTypeNode || this.isInsideClassNode)
            && node.markdownDocumentationAttachment) {
            this.hasInnerDocChild = true;
        }
    }

    public beginVisitTypeDefinition(node: Ballerina.TypeDefinition, parent?: Ballerina.ASTNode): void {
        this.isInsideTypeNode = true;
        if (node.public && node.markdownDocumentationAttachment) {
            if (!this.hasInnerDocChild && this.isInsideClassNode) {
                this.hasInnerDocChild = true;
            } else {
                this.codeLenses.push(this.createCodeLens(node.markdownDocumentationAttachment.position!,
                    node.name.value, node.name.value, API_DOC_DIR.FUNCTION));
            }
            // node.typeInfo.modName
            // } else {
            //     const typeChildrenArray = node.typeNode.functions;
            //     for (let index = 0; index < typeChildrenArray.length; index++) {
            //         const childFunction = typeChildrenArray[index];
            //         if (childFunction.markdownDocumentationAttachment && childFunction.public) {
            //             this.codeLenses.push(this.createCodeLens(node));
            //             break;
            //         }
            //     }

        }

    }

    public endVisitTypeDefinition?(node: Ballerina.TypeDefinition, parent?: Ballerina.ASTNode): void {
        if (this.hasInnerDocChild) {
            this.codeLenses.push(this.createCodeLens(node.position!, node.name.value,
                node.name.value, API_DOC_DIR.FUNCTION)); // node.typeInfo.modName
        }
        if (!this.isInsideClassNode) {
            this.hasInnerDocChild = false;
        }
        this.isInsideTypeNode = false;
    }

    public getCodeLensList(): vscode.CodeLens[] {
        return this.codeLenses;
    }

    private createCodeLens(position: Ballerina.NodePosition, moduleName: string, nodeName: string, nodeType: string)
        : vscode.CodeLens {
        const startLine = position.startLine;
        const startColumn = position.startColumn;
        const endLine = position.endLine;
        const endColumn = position.endColumn;
        const codeLens = new vscode.CodeLens(new vscode.Range(startLine, startColumn, endLine, endColumn));
        codeLens.command = {
            arguments: [
                {
                    moduleName,
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

}

const docGenVisitor = new DocGenVisitor();

export function getCodeLensList(ast: Ballerina.ASTNode): vscode.CodeLens[] {
    docGenVisitor.reset();
    traversNode(ast, docGenVisitor);
    return docGenVisitor.getCodeLensList();
}
