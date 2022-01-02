import { extensionCtx, getExtensionId } from "vscode-framework";
import { commands, ExtensionContext, extensions, workspace } from "vscode";
import { createConfigFile } from "./commands";
import { LoggingService } from "./LoggingService";
import { ModuleResolver } from "./ModuleResolver";
import PrettierEditService from "./PrettierEditService";
import { StatusBar } from "./StatusBar";
import { TemplateService } from "./TemplateService";
import { getConfig } from "./util";
import { RESTART_TO_ENABLE, EXTENSION_DISABLED } from "./message";
import { setGlobalState, setWorkspaceState } from "./stateUtils";

export function activate() {
  const conflictingExtensions = ["esbenp.prettier-vscode"];
  const conflictingExtension = extensions.all.find(({ id }) => {
    return conflictingExtensions.includes(id);
  });
  if (conflictingExtension)
    throw new Error(
      `Found conflicting extension: ${conflictingExtension.id}. Disable it first.`
    );
  const loggingService = new LoggingService();
  const context = extensionCtx;

  loggingService.logInfo(`Extension Name: ${getExtensionId(true)}.`);
  loggingService.logInfo(
    `Extension Version: ${context.extension.packageJSON.version}.`
  );

  const { enable, enableDebugLogs } = getConfig();

  if (enableDebugLogs) {
    loggingService.setOutputLevel("DEBUG");
  }

  if (!enable) {
    loggingService.logInfo(EXTENSION_DISABLED);
    context.subscriptions.push(
      workspace.onDidChangeConfiguration((event) => {
        if (event.affectsConfiguration("prettier.enable")) {
          loggingService.logWarning(RESTART_TO_ENABLE);
        }
      })
    );
    return;
  }

  setGlobalState(context.globalState);
  setWorkspaceState(context.workspaceState);

  const moduleResolver = new ModuleResolver(loggingService);

  const templateService = new TemplateService(
    loggingService,
    moduleResolver.getGlobalPrettierInstance()
  );

  const statusBar = new StatusBar();

  const editService = new PrettierEditService(
    moduleResolver,
    loggingService,
    statusBar
  );
  editService.registerGlobal();

  const createConfigFileFunc = createConfigFile(templateService);
  const createConfigFileCommand = commands.registerCommand(
    "prettier.createConfigFile",
    createConfigFileFunc
  );
  const openOutputCommand = commands.registerCommand(
    "prettier.openOutput",
    () => {
      loggingService.show();
    }
  );
  const forceFormatDocumentCommand = commands.registerCommand(
    "prettier.forceFormatDocument",
    editService.forceFormatDocument
  );

  context.subscriptions.push(
    editService,
    createConfigFileCommand,
    openOutputCommand,
    forceFormatDocumentCommand,
    ...editService.registerDisposables()
  );
}
