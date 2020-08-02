// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import * as ts from "typescript";
import * as path from "path";

import { COMMAND_GENERATE_ZOD, EXTENSION_NAME } from "./constants";
import { ZodSchemaGenerator } from "./generator";
import { getValue } from "./getValue";

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  const output = vscode.window.createOutputChannel("Zod");
  output.show();
  output.appendLine("Zod Extension Started");


  // The command has been defined in the package.json file
  // Now provide the implementation of the command with registerCommand
  // The commandId parameter must match the command field in package.json
  let disposable = vscode.commands.registerCommand("zod.helloWorld", () => {
    // The code you place here will be executed every time your command is executed

    // Display a message box to the user
    vscode.window.showInformationMessage("Hello World from zod!");
  });

  context.subscriptions.push(disposable);

  context.subscriptions.push(
    vscode.languages.registerCodeActionsProvider(
      ["typescript", "typescriptreact"],
      new ZodSchemaGenerator(),
      {
        providedCodeActionKinds: ZodSchemaGenerator.providedCodeActionKinds,
      }
    )
  );

  const diagnostics = vscode.languages.createDiagnosticCollection(
    EXTENSION_NAME
  );

  context.subscriptions.push(diagnostics, output);

  context.subscriptions.push(
    vscode.commands.registerCommand(
      COMMAND_GENERATE_ZOD,
      (
        document: vscode.TextDocument,
        action: "replace" | "generate",
        props
      ) => {

        const { range, line, text } = props;
				
				const edit = new vscode.WorkspaceEdit();

				const insert = (pos: ts.LineAndCharacter | vscode.Position, value: string) => {
            edit.insert(
              document.uri,
              new vscode.Position(pos.line, pos.character),
              `${value}\n`
						);
				};

				const replace = (range: vscode.Range, value: string) => {
					edit.replace(document.uri, range, value);
				};

        // Get Fixture
        getValue({
          filename: document.uri.path,
          range,
          output,
					insert,
					replace
        });
				

				vscode.workspace.applyEdit(edit);
      }
    )
  );
}

// this method is called when your extension is deactivated
export function deactivate() {}
