/**
 * Copyright (c) 2021, WSO2 Inc. (http://www.wso2.org) All Rights Reserved.
 *
 * WSO2 Inc. licenses this file to you under the Apache License,
 * Version 2.0 (the "License"); you may not use this file except
 * in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied. See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
import { BallerinaExtension, DocumentIdentifier, ExtendedLangClient } from 'src/core';
import {
    Event, EventEmitter, ProviderResult, TreeDataProvider, TreeItem, TreeItemCollapsibleState, Uri, window, workspace
} from 'vscode';
import { Module, ProjectTreeItem, Package, ChildrenData, PROJECT_KIND } from './model';
import { dirname, join, parse } from 'path';
import { existsSync, readdirSync } from 'fs';
import { homedir } from 'os';

const BAL_TOML = "Ballerina.toml";
const BALLERINA = "ballerina";

/**
 * Data provider class for package tree.
 */
export class PackageOverviewDataProvider implements TreeDataProvider<ProjectTreeItem> {
    private langClient?: ExtendedLangClient;
    private ballerinaExtension: BallerinaExtension;
    private extensionPath: string;

    constructor(ballerinaExtension: BallerinaExtension) {
        this.ballerinaExtension = ballerinaExtension;
        this.langClient = ballerinaExtension.langClient;
        this.extensionPath = ballerinaExtension.extension.extensionPath;
        window.onDidChangeActiveTextEditor(activatedTextEditor => {
            if (activatedTextEditor && activatedTextEditor.document.languageId === BALLERINA) {
                this.refresh();
            }
        });
        workspace.onDidOpenTextDocument(document => {
            if (document.languageId === BALLERINA) {
                this.refresh();
            }
        });
        workspace.onDidChangeTextDocument(activatedTextEditor => {
            if (activatedTextEditor && activatedTextEditor.document.languageId === BALLERINA) {
                this.refresh();
            }
        });
    }
    private _onDidChangeTreeData: EventEmitter<ProjectTreeItem | undefined> = new EventEmitter<ProjectTreeItem | undefined>();
    readonly onDidChangeTreeData: Event<ProjectTreeItem | undefined> = this._onDidChangeTreeData.event;

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: ProjectTreeItem): TreeItem | Thenable<TreeItem> {
        return element;
    }

    getParent?(element: ProjectTreeItem): ProviderResult<ProjectTreeItem> {
        return element.getParent();
    }

    getChildren(element?: ProjectTreeItem): ProviderResult<ProjectTreeItem[]> {
        if (!element) {
            return this.getPackageStructure();
        } else if (element.kind === PROJECT_KIND.PACKAGE) {
            return this.getModuleStructure(element);
        } else if (element.kind === PROJECT_KIND.MODULE) {
            return this.getComponentStructure(element);
        } else if (element.kind === PROJECT_KIND.SERVICE) {
            return this.getResourceStructure(element);
        }
    }

    /**
     * Returns the tree structure for packages.
     * @returns An array of tree nodes with package data.
     */
    public getPackageStructure(): Promise<ProjectTreeItem[]> {
        return new Promise<ProjectTreeItem[]>((resolve) => {
            this.getPackageList().then(documentIdentifiers => {
                if (documentIdentifiers.length > 0) {
                    this.ballerinaExtension.onReady().then(() => {
                        this.langClient!.getBallerinaProjectComponents({ documentIdentifiers }).then((response) => {
                            if (response.packages) {
                                const projectItems: ProjectTreeItem[] = this.createPackageData(response.packages);
                                resolve(projectItems);
                            }
                        });
                    });
                } else {
                    resolve([]);
                }
            });
        });
    }

    /**
     * Returns the tree structure for functions and services.
     * @returns An array of tree nodes with module component data.
     */
    private getComponentStructure(parent: ProjectTreeItem, isDefaultModule: boolean = false,
        childrenData: ChildrenData = {}): ProjectTreeItem[] {
        let components: ProjectTreeItem[] = [];
        const children: ChildrenData = isDefaultModule ? childrenData : parent.getChildrenData();
        //Process function nodes
        if (children.functions) {
            const functionNodes = children.functions;
            functionNodes.sort((fn1, fn2) => {
                return fn1.name!.localeCompare(fn2.name!);
            });
            functionNodes.forEach(fn => {
                components.push(new ProjectTreeItem(fn.name, `${fn.filePath}`, TreeItemCollapsibleState.None,
                    PROJECT_KIND.FUNCTION, join(parent.getFilePath(), fn.filePath), this.extensionPath, true,
                    parent, {}, fn.startLine, fn.startColumn, fn.endLine, fn.endColumn));
            });
        }

        //Process service nodes
        if (children.services) {
            const serviceNodes = children.services.filter(service => {
                return service.name;
            });
            serviceNodes.sort((service1, service2) => {
                return service1.name!.localeCompare(service2.name!);
            });
            serviceNodes.forEach(service => {
                components.push(new ProjectTreeItem(service.name, `${service.filePath}`,
                    TreeItemCollapsibleState.Collapsed, PROJECT_KIND.SERVICE, join(parent.getFilePath(),
                        service.filePath), this.extensionPath, true, parent, { resources: service.resources },
                    service.startLine, service.startColumn, service.endLine, service.endColumn));
            });

            const serviceNodesWithoutName = children.services.filter(service => {
                return !service.name;
            });
            let count: number = 0;
            serviceNodesWithoutName.forEach(service => {
                components.push(new ProjectTreeItem(`${PROJECT_KIND.SERVICE} ${++count}`, `${service.filePath}`,
                    TreeItemCollapsibleState.Collapsed, PROJECT_KIND.SERVICE, join(parent.getFilePath(),
                        service.filePath), this.extensionPath, true, parent, { resources: service.resources },
                    service.startLine, service.startColumn, service.endLine, service.endColumn));
            });
        }
        return components;
    }

    private createPackageData(packages: Package[]): ProjectTreeItem[] {
        let packageItems: ProjectTreeItem[] = [];
        packages.sort((package1, package2) => {
            return package1.name.localeCompare(package2.name!);
        });
        packages.forEach(projectPackage => {
            if (projectPackage.name) {
                packageItems.push(new ProjectTreeItem(projectPackage.name, '',
                    TreeItemCollapsibleState.Collapsed, PROJECT_KIND.PACKAGE, projectPackage.filePath,
                    this.extensionPath, true, null, { modules: projectPackage.modules }));
            }
        });
        return packageItems;
    }

    /**
     * Returns the tree structure for modules.
     * @returns An array of tree nodes with module data.
     */
    private getModuleStructure(parent: ProjectTreeItem): ProjectTreeItem[] {
        let moduleItems: ProjectTreeItem[] = [];
        if (parent.getChildrenData().modules) {
            const defaultModules: Module[] = parent.getChildrenData().modules!.filter(module => {
                return !module.name;
            });
            if (defaultModules.length === 1) {
                const defaultModuleItems: ProjectTreeItem[] = this.getComponentStructure(parent, true,
                    { functions: defaultModules[0].functions, services: defaultModules[0].services });
                if (defaultModuleItems.length > 0) {
                    moduleItems = moduleItems.concat(defaultModuleItems);
                }
            }

            const nonDefaultModules: Module[] = parent.getChildrenData().modules!.filter(module => {
                return module.name;
            });
            nonDefaultModules.sort((mod1, mod2) => {
                return mod1.name!.localeCompare(mod2.name!);
            });
            nonDefaultModules.forEach(module => {
                moduleItems.push(new ProjectTreeItem(module.name!, '',
                    TreeItemCollapsibleState.Collapsed, PROJECT_KIND.MODULE, join(parent.getFilePath(),
                        module.name!), this.extensionPath, false, parent,
                    {
                        functions: module.functions,
                        services: module.services
                    }));
            });
        }
        return moduleItems;
    }

    /**
      * Returns the tree structure for resources.
      * @returns An array of tree nodes with resource data.
      */
    private getResourceStructure(parent: ProjectTreeItem): ProjectTreeItem[] {
        let resources: ProjectTreeItem[] = [];
        const children: ChildrenData = parent.getChildrenData();
        if (children.resources) {
            const resourceNodes = children.resources;
            resourceNodes.sort((resource1, resource2) => {
                return resource1.name!.localeCompare(resource2.name!);
            });
            resourceNodes.forEach(resource => {
                resources.push(new ProjectTreeItem(resource.name, '',
                    TreeItemCollapsibleState.None, PROJECT_KIND.RESOURCE, parent.getFilePath(), this.extensionPath, true,
                    parent, {}, resource.startLine, resource.startColumn, resource.endLine, resource.endColumn));
            });
        }
        return resources;
    }

    /**
     * List packages in the workspace.
     * @returns A list of all the package identifiers
     */
    private getPackageList(): Promise<DocumentIdentifier[]> {
        return new Promise<DocumentIdentifier[]>(async (resolve) => {
            const openFolders = workspace.workspaceFolders;
            let documentIdentifiers: DocumentIdentifier[] = [];
            if (openFolders) {
                openFolders.filter((openFolder) => {
                    return existsSync(join(openFolder.uri.fsPath, BAL_TOML));
                }).map((root) => {
                    documentIdentifiers.push({
                        uri: root.uri.toString(true)
                    });
                });
            }

            if (documentIdentifiers.length === 0 && openFolders && openFolders.length > 0) {
                const rootPath = openFolders[0].uri;
                readdirSync(rootPath.path).filter((openFolder) => {
                    return existsSync(join(rootPath.path, openFolder, BAL_TOML));
                }).map(file => {
                    documentIdentifiers.push({
                        uri: Uri.file(join(rootPath.path, file)).toString()
                    });
                });
            }

            if (documentIdentifiers.length === 0) {
                const activeEditor = window.activeTextEditor;
                if ((activeEditor && activeEditor.document && activeEditor.document.languageId === BALLERINA)) {
                    const activePath = activeEditor.document.uri.path;
                    const activeSourceRoot = this.getSourceRoot(activePath, parse(activePath).root);

                    if (activeSourceRoot) {
                        readdirSync(parse(activeSourceRoot).dir).filter((openFolder) => {
                            return existsSync(join(parse(activeSourceRoot).dir, openFolder, BAL_TOML));
                        }).map(file => {
                            documentIdentifiers.push({
                                uri: Uri.file(join(parse(activeSourceRoot).dir, file)).toString()
                            });
                        });
                    }
                }
            }

            resolve(documentIdentifiers);
        });
    }

    private getSourceRoot(currentPath: string, root: string): string | undefined {
        if (existsSync(join(currentPath, BAL_TOML))) {
            if (currentPath !== homedir()) {
                return currentPath;
            }
        }
        if (currentPath === root) {
            return;
        }
        return this.getSourceRoot(dirname(currentPath), root);
    }
}
