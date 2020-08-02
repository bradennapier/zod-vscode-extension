import * as vscode from 'vscode';
import { COMMAND_GENERATE_ZOD } from './constants';

export class ZodSchemaGenerator implements vscode.CodeActionProvider {
  public static readonly providedCodeActionKinds: vscode.CodeActionKind[] = [
    vscode.CodeActionKind.RefactorRewrite,
    vscode.CodeActionKind.RefactorInline,
  ];

  public provideCodeActions(
    document: vscode.TextDocument,
    range: vscode.Range
  ): vscode.CodeAction[] | undefined {
    const text = document.getText(range);
    const line = document.lineAt(range.start.line).text;
    const wordRange = document.getWordRangeAtPosition(range.start);
    console.log('LINE: ', { range, text, line, wordRange});

    if (!line.includes("interface") && !line.includes("type")) {
      return [];
    }

    const generateAction = new vscode.CodeAction(
      `Convert to Zod Schema`,
      vscode.CodeActionKind.RefactorExtract
    );

    const props = { range, line, text, wordRange };
  
    generateAction.command = {
      arguments: [document, 'generate', props],
      command: COMMAND_GENERATE_ZOD,
      title: `Generate Zod Schema`,
      tooltip:
        "This will create a Zod schema from a Typescript type",
    };

    const replaceAction = new vscode.CodeAction(
      `Replace With Zod Schema`,
      vscode.CodeActionKind.RefactorInline
    );

    replaceAction.command = {
      arguments: [document, 'replace', props],
      command: COMMAND_GENERATE_ZOD,
      title: `Replace With Zod Schema`,
      tooltip:
        "This will create a Zod schema from a Typescript type",
    };
    return [generateAction, replaceAction];
  }
}