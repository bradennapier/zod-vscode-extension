import * as ts from "typescript";
import * as vscode from "vscode";
import { GetValueProps, ZodConverterConfig } from "./types";
import { EXTENSION_NAME } from './constants';

export type InterfaceishNode =
  | ts.InterfaceDeclaration
  | ts.TypeAliasDeclaration;

export type InterfacePropertyNode =
  | ts.InterfaceDeclaration
  | ts.TypeAliasDeclaration
  | ts.PropertySignature;

function report(sourceFile: ts.SourceFile, node: ts.Node, message: string) {
  const { line, character } = sourceFile.getLineAndCharacterOfPosition(
    node.getStart()
  );
  console.log(
    `${sourceFile.fileName} (${line + 1},${character + 1}): ${message}`
  );
}

function getZodImport(config: ZodConverterConfig) {
  return config.importStarAs
    ? ts.createImportDeclaration(
        undefined,
        undefined,
        ts.createImportClause(
          undefined,
          ts.createNamespaceImport(
            ts.createIdentifier(config.defaultZodValueName)
          ),
          false
        ),
        ts.createStringLiteral("zod")
      )
    : ts.createImportDeclaration(
        undefined,
        undefined,
        ts.createImportClause(ts.createIdentifier(config.defaultZodValueName), undefined, false),
        ts.createStringLiteral("zod")
      );
}

function getZodImportValueName(node: ts.ImportDeclaration) {
  const { importClause } = node;
  if (!importClause) {
    throw new Error("Unexpected undefined for importClause of Zod");
  }
  if (ts.isImportClause(importClause) && importClause.name) {
    return importClause.name.text;
  } else if (
    importClause?.namedBindings &&
    ts.isNamespaceImport(importClause.namedBindings)
  ) {
    return importClause.namedBindings.name.text;
  }
  throw new Error("Unable to get Zod import name");
}

export const findInterface = (
  {
    sourceFile,
    pos,
  }: {
    sourceFile: ts.SourceFile;
    filename: string;
    range: vscode.Range;
    pos: number;
  },
  props: GetValueProps
) => {
  // filter for interface-like nodes
  let interfaceNode: undefined | InterfaceishNode;
  let lastImportNode: undefined | ts.ImportDeclaration;
  let zodImportNode: undefined | ts.ImportDeclaration;
  let isExported: boolean = false;
  let id = 0;

  const visitor = (node: ts.Node) => {
    id += 1;
    report(sourceFile, node, `Child ${id} `);
    if (
      ts.isImportDeclaration(node) &&
      ts.isStringLiteral(node.moduleSpecifier)
    ) {
      if (node.moduleSpecifier.text === "zod") {
        zodImportNode = node;
      }
      lastImportNode = node;
    }

    if (ts.isInterfaceDeclaration(node) || ts.isTypeAliasDeclaration(node)) {
      if (node.getStart() <= pos && node.getEnd() >= pos) {
        console.log("Node Found! ", node,  node.modifiers?.[0] && ts.isModifier(node.modifiers[0]));
        interfaceNode = node;
        if (node.modifiers) {
          isExported = node.modifiers.some(modifier => modifier.kind === ts.SyntaxKind.ExportKeyword);
        }
       
      }
    }
  };

  ts.forEachChild(sourceFile, visitor);

  if (!zodImportNode) {
    let pos = { line: 0, character: 0 };

    if (lastImportNode) {
      const lastImportPos = sourceFile.getLineAndCharacterOfPosition(
        lastImportNode.getEnd()
      );
      lastImportPos.line += 1;
      lastImportPos.character = 0;
      pos = lastImportPos;
    }

    zodImportNode = getZodImport(props.config);

    const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });
    
    props.insert(
      pos,
      printer.printNode(ts.EmitHint.Unspecified, zodImportNode, sourceFile)
    );
  }

  // find selected interface
  if (!interfaceNode) {
    throw new Error(`Could not find interface at the provided position`);
  }

  return {
    interfaceNode,
    zodImportNode,
    zodImportValue: getZodImportValueName(zodImportNode),
    isExported
  };
};
