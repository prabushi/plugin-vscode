import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

import { BallerinaExtension, ExtendedLangClient } from '../core/index';
import { ProjectTreeElement } from './project-tree';

const errorNode: ProjectTreeElement = {
    name: "Couldn't create the project overview. Please make sure your code compiles successfully and refresh.",
    kind: 'Info',
};

const noBalFileNode: ProjectTreeElement = {
    name: "Please open a ballerina project to see the ballerina project overview",
    kind: 'Info',
};

interface Packages {
    [packages: number]: Package;
}

interface Package {
    name: string;
    modules: Module[];
}

interface Module {
    name?: string;
    default?: boolean;
    functions: FunctionOrResource[];
    services: Service[];
}

interface FunctionOrResource {
    name: string;
    filePath: string;
    position: {
        startLine: number;
        startColumn: number;
    };
}

interface Service {
    name: string;
    filePath: string;
    position: {
        startLine: number;
        startColumn: number;
    };
    resources: FunctionOrResource[];
}

const treeItemKinds = {
    PROJECT_ROOT: 'ProjectRoot',
    MODULE: 'Module',
    FUNCTION: 'Function',
    SERVICE: 'Service',
    RESOURCE: 'Resource',
};

const itemKindsWithIcons = [
    treeItemKinds.SERVICE,
    treeItemKinds.FUNCTION,
    treeItemKinds.RESOURCE,
    treeItemKinds.PROJECT_ROOT,
];

const collapsibleKinds = [
    treeItemKinds.PROJECT_ROOT,
    treeItemKinds.MODULE,
    treeItemKinds.SERVICE,
];

/**
 * This class will provide Tree Data required to draw the Ballerina Project Overview 
 * on the explorer panel. 
 */
export class ProjectTreeProvider implements vscode.TreeDataProvider<ProjectTreeElement> {

    private _onDidChangeTreeData: vscode.EventEmitter<ProjectTreeElement | undefined> = new vscode.EventEmitter<ProjectTreeElement | undefined>();
    readonly onDidChangeTreeData: vscode.Event<ProjectTreeElement | undefined> = this._onDidChangeTreeData.event;
    private langClient?: ExtendedLangClient;
    private ballerinaExtInstance!: BallerinaExtension;

    constructor(balExt: BallerinaExtension) {
        this.ballerinaExtInstance = balExt;
        this.langClient = balExt.langClient;

        vscode.window.onDidChangeActiveTextEditor((activatedTextEditor) => {
            if (activatedTextEditor && activatedTextEditor.document.languageId === "ballerina") {
                this.refresh();
            }
        });

        vscode.commands.registerCommand("ballerina.refreshProjectTree", () => {
            this.refresh();
        });
    }

    private refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getChildren(element?: ProjectTreeElement | undefined): vscode.ProviderResult<ProjectTreeElement[]> {
        if (!element) {
            return this.getRoots();
        } else {
            if (element.path) {
                return this.getProjectStructure(element.path);
            }
            if (element.topLevelNodes) {
                return element.topLevelNodes;
            }
            if (element.resources) {
                return element.resources;
            }
        }
    }

    getTreeItem(element: ProjectTreeElement): vscode.TreeItem | Thenable<vscode.TreeItem> {
        const {
            Expanded, None
        } = vscode.TreeItemCollapsibleState;
        const collapsibleState = (collapsibleKinds.indexOf(element.kind) > -1) ? Expanded : None;
        const { extensionPath } = this.ballerinaExtInstance.extension;

        const treeItem: vscode.TreeItem = {
            label: element.name,
            collapsibleState,
        };

        const sourceRoot = element.sourceRoot ? vscode.Uri.file(element.sourceRoot).toString(true) : undefined;

        if (itemKindsWithIcons.indexOf(element.kind) > -1) {
            treeItem.iconPath = {
                light: vscode.Uri.file(
                    path.join(extensionPath, `resources/images/icons/${element.kind.toLowerCase()}.svg`)),
                dark: vscode.Uri.file(
                    path.join(extensionPath, `resources/images/icons/${element.kind.toLowerCase()}-inverse.svg`))
            };

            treeItem.command = {
                command: "ballerina.executeTreeElement",
                title: "Execute Tree Command",
                arguments: [
                    sourceRoot,
                    element.filePath,
                    element.moduleName,
                    undefined,
                    element.name,
                    element.startLine,
                    element.startColumn
                ]
            };

            if (element.kind === treeItemKinds.RESOURCE) {
                treeItem.command.arguments = [
                    sourceRoot,
                    element.filePath,
                    element.moduleName,
                    element.serviceName,
                    element.name,
                    element.startLine,
                    element.startColumn
                ];
            }
        }

        if (element.kind === treeItemKinds.PROJECT_ROOT) {
            treeItem.tooltip = element.path;
        }

        return treeItem;
    }

    public getRoots(): ProjectTreeElement[] {
        const openFolders = vscode.workspace.workspaceFolders;
        let sourceRoots: ProjectTreeElement[] = [];
        if (openFolders) {
            sourceRoots = openFolders.filter((openFolder) => {
                return fs.existsSync(path.join(openFolder.uri.fsPath, "Ballerina.toml"));
            }).map((root) => {
                return {
                    kind: 'ProjectRoot',
                    name: root.name,
                    path: root.uri.fsPath,
                };
            });
        }

        const activeEditor = vscode.window.activeTextEditor;
        if ((activeEditor && activeEditor.document && activeEditor.document.languageId === "ballerina")) {
            const activePath = activeEditor.document.uri.path;
            const activeSourceRoot = this.getSourceRoot(activePath, path.parse(activePath).root);

            if (activeSourceRoot && (sourceRoots.filter((root) => (root.path === activeSourceRoot)).length === 0)) {
                sourceRoots.push({
                    kind: 'ProjectRoot',
                    name: path.parse(activeSourceRoot).base,
                    path: activeSourceRoot,
                });
            }
        }

        if (sourceRoots.length === 0) {
            sourceRoots.push(noBalFileNode);
        }

        return sourceRoots;
    }

    private getProjectStructure(sourceRoot: string): Promise<any> {
        return new Promise<any>((resolve) => {
            this.ballerinaExtInstance.onReady().then(() => {
                if (!this.langClient) {
                    resolve('Language Client is not initialized.');
                    return;
                }

                this.langClient.getPackages(vscode.Uri.file(sourceRoot).toString(true)).then((result: any) => {
                    if (result.packages && (Object.keys(result.packages).length > 0)) {
                        const balProjectTree = this.buildProjectTree(result.packages, sourceRoot);
                        resolve(balProjectTree);
                    } else {
                        resolve([errorNode]);
                    }
                }, () => {
                    resolve([errorNode]);
                });

                return;
            });
        });
    }

    private buildProjectTree(packages: Packages, sourceRoot: string): ProjectTreeElement[] {
        const moduleElementList: ProjectTreeElement[] = [];
        const allModules: Module[] = packages[0].modules;

        const modules = allModules.filter(module => {
            return !module.default;
        });
        modules.sort((mod1, mod2) => {
            return mod1.name!.localeCompare(mod2.name!);
        });

        const defaultModule = allModules.filter(module => {
            return module.default;
        }).pop();

        // Add default module
        if (defaultModule) {
            const filePath = `${sourceRoot}${path.sep}`;
            const defaultFunctions: FunctionOrResource[] = defaultModule.functions;
            if (defaultFunctions) {
                defaultFunctions.sort((func1, func2) => {
                    return func1.name.localeCompare(func2.name);
                });
                defaultFunctions.forEach(functionNode => {
                    moduleElementList.push(this.createFunctionElement(functionNode, defaultModule, sourceRoot, filePath));
                });
            }

            const defaultServices: Service[] = defaultModule.services;
            if (defaultServices) {
                defaultServices.sort((service1, service2) => {
                    return service1.name.localeCompare(service2.name);
                });
                defaultServices.forEach(serviceNode => {
                    moduleElementList.push(this.createServiceElement(serviceNode, defaultModule, sourceRoot, filePath));
                });
            }
        }

        // Add non default modules
        modules.forEach(module => {
            if (!module.default) {
                const filePath = `${sourceRoot}${path.sep}modules${path.sep}${module.name}${path.sep}`;
                const moduleElement: ProjectTreeElement = {
                    sourceRoot: sourceRoot,
                    name: module.name!,
                    kind: 'Module',
                    topLevelNodes: [],
                };

                const moduleTopLevelNodes: ProjectTreeElement[] = [];
                const functions: FunctionOrResource[] = module.functions;
                if (functions) {
                    functions.sort((func1, func2) => {
                        return func1.name.localeCompare(func2.name);
                    });
                    functions.forEach(functionNode => {
                        moduleTopLevelNodes.push(this.createFunctionElement(functionNode, module, sourceRoot, filePath));
                    });
                }

                const services: Service[] = module.services;
                if (services) {
                    services.sort((service1, service2) => {
                        return service1.name.localeCompare(service2.name);
                    });
                    services.forEach(serviceNode => {
                        moduleTopLevelNodes.push(this.createServiceElement(serviceNode, module, sourceRoot, filePath));
                    });
                }
                moduleElement.topLevelNodes = moduleTopLevelNodes;
                moduleElementList.push(moduleElement);
            }
        });
        return moduleElementList;
    }

    private createFunctionElement(functionNode: FunctionOrResource, module: Module, sourceRoot: string,
        filePath: string): ProjectTreeElement {
        const functionFilePath = `${filePath}${functionNode.filePath}`;
        return {
            sourceRoot,
            name: functionNode.name,
            kind: 'Function',
            moduleName: module.name,
            filePath: functionFilePath,
            startLine: functionNode.position.startLine,
            startColumn: functionNode.position.startColumn
        };
    }

    private createServiceElement(serviceNode: Service, module: Module, sourceRoot: string, filePath: string):
        ProjectTreeElement {
        const serviceFilePath = `${filePath}${serviceNode.filePath}`;
        const serviceElement: ProjectTreeElement = {
            sourceRoot,
            name: serviceNode.name,
            kind: 'Service',
            moduleName: module.name,
            filePath: serviceFilePath,
            startLine: serviceNode.position.startLine,
            startColumn: serviceNode.position.startColumn
        };
        const resources: FunctionOrResource[] = serviceNode.resources.sort((res1, res2) => {
            return res1.name.localeCompare(res2.name);
        });
        serviceElement.resources = resources.map((resourceNode: any) => {
            return {
                sourceRoot,
                name: resourceNode.name,
                kind: 'Resource',
                moduleName: module.name,
                serviceName: serviceNode.name,
                filePath: serviceFilePath,
                startLine: resourceNode.position.startLine,
                startColumn: resourceNode.position.startColumn
            };
        });
        return serviceElement;
    }

    /**
     * Util method to get Ballerina project root.
     * 
     * @param currentPath - current active path
     * @param root - root path
     */
    private getSourceRoot(currentPath: string, root: string): string | undefined {
        if (fs.existsSync(path.join(currentPath, 'Ballerina.toml'))) {
            if (currentPath !== os.homedir()) {
                return currentPath;
            }
        }

        if (currentPath === root) {
            return;
        }

        return this.getSourceRoot(path.dirname(currentPath), root);
    }

    getParent(element: ProjectTreeElement): vscode.ProviderResult<ProjectTreeElement> {
        // This is implemented in-order to make treeView#reveal api work.
        // returns undefined for the moment, indicates no parent. It won't be a problem
        // as we only use reveal api to reveal root element
        return undefined;
    }
}
