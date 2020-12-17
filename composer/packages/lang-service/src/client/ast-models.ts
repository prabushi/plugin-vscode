export interface BallerinaSyntaxTree {
    id: string;
    kind: string;
    topLevelNodes: BallerinaASTNode[];
}
export interface BallerinaASTNode {
    kind: string;
}
export interface BallerinaEndpoint {
    packageName: string;
    name: string;
}
