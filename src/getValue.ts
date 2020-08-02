import * as ts from "typescript";
import * as vscode from "vscode";
import { findInterface } from "./interface";
import {
  generateZodCall,
  generateZodObjectVar,
  generateZodInferredType,
} from "./zod/generate";
import { GetValueProps } from "./types";

// function doTypescriptDiagnostics(
//   program: ts.Program,
//   output: vscode.OutputChannel
// ) {
//   const diagnostics = ts.getPreEmitDiagnostics(program);

//   const error = diagnostics.find(
//     (d) => d.category === ts.DiagnosticCategory.Error
//   );

//   if (error !== undefined) {
//     const msg = `TS Compilation Error: ${ts.flattenDiagnosticMessageText(
//       error.messageText,
//       "\n"
//     )}`;
//     output.appendLine(`Typescript Compilation Error:\n${msg}`);
//     vscode.window.showErrorMessage(
//       "Failed: Typescript Compilation Error (See Output)"
//     );
//     return;
//   }
// }

/* Get export interface identifiers */
export const getValue = (props: GetValueProps) => {
  const { filename, range } = props;

  // TODO - surely we can use the actual tsserver program?
  const program = ts.createProgram({
    rootNames: [filename],
    options: {},
  });

  // doTypescriptDiagnostics(program, output)

  const sourceFile = program.getSourceFile(filename)!;

  const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });

  const pos = sourceFile.getPositionOfLineAndCharacter(
    range.start.line,
    range.start.character
  );

  const typeChecker = program.getTypeChecker();

  const {
    interfaceNode,
    // zodImportNode,
    zodImportValue,
    isExported,
  } = findInterface({ filename, sourceFile, range, pos }, props);

  const interfaceType = typeChecker.getTypeAtLocation(interfaceNode);
  const interfaceName = interfaceNode.name.text;
  const zodConstName = `${interfaceName}Schema`;

  // Get Fixture
  const fixture = generateZodCall({
    interfaceType,
    typeChecker,
    zodImportValue,
    sourceFile,
  });

  const start = sourceFile.getLineAndCharacterOfPosition(
    interfaceNode.getStart()
  );

  const end = sourceFile.getLineAndCharacterOfPosition(interfaceNode.getEnd());

  // const ${interfaceName}Schema = ${zodImportValue}.object({ ... });
  const zodObj = generateZodObjectVar(
    zodConstName,
    zodImportValue,
    fixture,
    isExported
  );
  // type ${interfaceName} = ${zodImportValue}.infer<typeof ${zodConstName}>;
  const zodInferred = generateZodInferredType(
    interfaceName,
    zodImportValue,
    zodConstName,
    isExported
  );

  // converted values into string
  const sourceString = [
    printer.printNode(ts.EmitHint.Unspecified, zodObj, sourceFile),
    printer.printNode(ts.EmitHint.Unspecified, zodInferred, sourceFile),
  ].join("\n\n");

  // replace in vscode
  props.replace(
    new vscode.Range(
      new vscode.Position(start.line, start.character),
      new vscode.Position(end.line, end.character)
    ),
    sourceString
  );
};
