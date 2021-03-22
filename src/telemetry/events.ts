// feature usage events
export const TM_EVENT_EXTENSION_INIT = "ballerina.extension.init";

// events for opening custom views
export const TM_EVENT_OPEN_EXAMPLES = "open.examples";
export const TM_EVENT_OPEN_DIAGRAM = "open.diagram";
export const TM_EVENT_OPEN_PACKAGE_OVERVIEW = "open.project.overview.via.tree.view";
export const TM_EVENT_OPEN_NETWORK_LOGS = "open.network.logs";
export const TM_EVENT_OPEN_DOC_PREVIEW = "open.doc.preview";
export const TM_EVENT_OPEN_API_DESIGNER = "open.api.designer";

// event for opening auto detected project folder through the prompt we provide
export const TM_EVENT_OPEN_DETECTED_PROJECT_ROOT_VIA_PROMPT = "open.api.designer";

// event for starting debug sessions for ballerina files
export const TM_EVENT_START_DEBUG_SESSION = "start.debug.session";

// event for running tests in current project
export const TM_EVENT_PROJECT_TEST = "execute.project.tests";

// event for running build for current project
export const TM_EVENT_PROJECT_BUILD = "execute.project.build";

// event for executing the ballerina run command
export const TM_EVENT_PROJECT_RUN = "execute.project.run";

// event for executing the ballerina doc command
export const TM_EVENT_PROJECT_DOC = "execute.project.doc";

// event for executing the ballerina add command
export const TM_EVENT_PROJECT_ADD = "execute.project.add";

// event for generating Cloud.toml for current project
export const TM_EVENT_PROJECT_CLOUD = "execute.project.cloud";

// events for language server
export const TM_EVENT_LANG_SERVER = "ballerina.langserver.event";
export const TM_ERROR_LANG_SERVER = "ballerina.langserver.error";
