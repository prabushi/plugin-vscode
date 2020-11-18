import { ExtendedLangClient } from "src/core";
import { CancellationToken, FoldingContext, FoldingRange, FoldingRangeProvider, TextDocument } from "vscode";

// import { FoldingRangeParams, TextDocumentIdentifier } from "vscode-languageclient";
// import { FoldingRangeKind } from "vscode-languageclient";

export class BallerinaFoldingRangeProvider implements FoldingRangeProvider {

    // private client: ExtendedLangClient;

    constructor(client: ExtendedLangClient) {
        // this.client = client;

    }

    provideFoldingRanges(document: TextDocument, context: FoldingContext, token: CancellationToken): FoldingRange[] {


        // const textDocument: TextDocumentIdentifier = { uri: document.uri.toString() };
        // const foldingRangeParams: FoldingRangeParams = { textDocument };
        // this.client.getFoldingRange(foldingRangeParams).then((foldingRange) => {
        //     return foldingRange;
        // });
        // return this.getFoldRanges(foldingRangeParams);

        // return this.client.getFoldingRange(foldingRangeParams);

        let foldingRangeList: FoldingRange[] = [];
        foldingRangeList.push({ start: 2, end: 3, kind: undefined });
        foldingRangeList.push({ start: 4, end: 7, kind: undefined });
        foldingRangeList.push({ start: 11, end: 12, kind: undefined });
        foldingRangeList.push({ start: 9, end: 10, kind: undefined });


        // let foldingRange1: FoldingRange = { start: 2, end: 3, sta }
        // foldingRange1.setKind("comment");
        // foldingRange1.setStartCharacter(1);
        // foldingRange1.setEndCharacter(3);
        // foldingRangeList.add(foldingRange1);

        // FoldingRange foldingRange2 = new FoldingRange(4, 7);
        // foldingRange2.setKind("region");
        // foldingRange2.setStartCharacter(26);
        // foldingRange2.setEndCharacter(0);
        // foldingRangeList.add(foldingRange2);

        // FoldingRange foldingRange3 = new FoldingRange(11, 12);
        // foldingRange3.setKind("region");
        // foldingRange3.setStartCharacter(12);
        // foldingRange3.setEndCharacter(15);
        // foldingRangeList.add(foldingRange3);

        // FoldingRange foldingRange4 = new FoldingRange(9, 10);
        // foldingRange4.setKind("region");
        // foldingRange4.setStartCharacter(0);
        // foldingRange4.setEndCharacter(20);
        // foldingRangeList.add(foldingRange4);

        return foldingRangeList;
    }

    // private async getFoldRanges(foldingRangeParams: FoldingRangeParams): Promise<FoldingRange[]> {
    //     // return this.client.getAST(document.uri).then((response) => this.loadCodeLensList(response));
    //     // return this.client.getFoldingRange(foldingRangeParams).then( response => return response);
    //     return new Promise((resolve, reject) => {
    //         this.client.getFoldingRange(foldingRangeParams);
    //     });
    //     // await this.client.getFoldingRange(foldingRangeParams).then((foldingRange) => {
    //     //     return foldingRange;
    //     // });
    // }
}