import { InterfacePropertyNode, InterfaceishNode } from "../interface";
// import { IValueGenerator } from "../IValueGenerator";
import * as ts from "typescript";
import * as vscode from "vscode";

import { generatePrimitive, buildZodSchema } from "./literal";
import { EXTENSION_NAME, JS_DOC_MAIN_TAG } from "../constants";

export type IFixtureObject = any;

type NodeProps = {
  node: ts.PropertySignature;
  name: string;
  kind: ts.SyntaxKind;
  typeChecker: ts.TypeChecker;
  zodImportValue: string;
  sourceFile: ts.SourceFile;
};

type SettingsProps = { isOptional: boolean; errorMessage: undefined | string };

/**
 * ```typescript
 * export? const ${varName} = ${zodImportValue}.object(fixture)
 * ```
 */
export const generateZodObjectVar = (
  varName: string,
  zodImportValue: string,
  fixture: { [key: string]: ts.CallExpression },
  isExported: boolean
) => {
  return ts.createVariableStatement(
    isExported ? [ts.createModifier(ts.SyntaxKind.ExportKeyword)] : undefined,
    ts.createVariableDeclarationList(
      [
        ts.createVariableDeclaration(
          // const {varName} =
          ts.createIdentifier(varName),
          undefined,
          buildZodSchema(zodImportValue, "object", [
            ts.createObjectLiteral(
              Object.entries(fixture).map(([key, tsCall]) => {
                return ts.createPropertyAssignment(
                  ts.createIdentifier(key),
                  tsCall
                );
              }),

              true
            ),
          ])
        ),
      ],
      ts.NodeFlags.Const
    )
  );
};

/**
 * ```typescript
 *  export? type ${aliasName} = ${zodImportValue}.infer<typeof ${schemaVarName}>
 * ```
 */
export function generateZodInferredType(
  aliasName: string,
  zodImportValue: string,
  schemaVarName: string,
  isExported: boolean
) {
  return ts.createTypeAliasDeclaration(
    undefined,
    isExported ? [ts.createModifier(ts.SyntaxKind.ExportKeyword)] : undefined,
    ts.createIdentifier(aliasName),
    undefined,
    ts.createTypeReferenceNode(
      ts.createQualifiedName(
        ts.createIdentifier(zodImportValue),
        ts.createIdentifier("infer")
      ),
      [ts.createTypeQueryNode(ts.createIdentifier(schemaVarName))]
    )
  );
}

export const generateZodCall = ({
  interfaceType,
  typeChecker,
  zodImportValue,
  sourceFile,
}: {
  interfaceType: ts.Type;
  typeChecker: ts.TypeChecker;
  zodImportValue: string;
  sourceFile: ts.SourceFile;
}): IFixtureObject => {
  const fixtureObject: IFixtureObject = {};

  const properties = interfaceType.getProperties();

  properties.forEach((nodeProperty: any) => {
    const name = nodeProperty.name;
    const node = nodeProperty.valueDeclaration || nodeProperty.declarations[0];
    if (!ts.isPropertySignature(node)) {
      return;
    }
    fixtureObject[name] = generateNodeValue({
      name,
      kind: node.type!.kind,
      node,
      typeChecker,
      zodImportValue,
      sourceFile,
    });
  });

  return fixtureObject;
};

export const generateObject = ({
  interfaceNode,
  typeChecker,
  zodImportValue,
  sourceFile,
}: {
  interfaceNode: InterfaceishNode;
  typeChecker: ts.TypeChecker;
  zodImportValue: string;
  sourceFile: ts.SourceFile;
}): ts.CallExpression => {
  console.log("Generate Object");
  const fixtureObject: { [key: string]: ts.CallExpression } = {};

  ts.forEachChild(interfaceNode, (node) => {
    if (!ts.isPropertySignature(node)) {
      return;
    }
    const name = (node.name as any).text;
    const kind: ts.SyntaxKind = (node.type as any).kind;

    fixtureObject[name] = generateNodeValue({
      name,
      kind,
      node,
      typeChecker,
      zodImportValue,
      sourceFile,
    });
  });

  return buildZodSchema(zodImportValue, "object", [
    ts.createObjectLiteral(
      Object.entries(fixtureObject).map(([key, tsCall]) => {
        return ts.createPropertyAssignment(ts.createIdentifier(key), tsCall);
      }),

      true
    ),
  ]);
};

function handleJSDocTags(
  node: ts.PropertySignature,
  tags: string[]
): string | undefined {
  const jsDocs: ts.JSDoc[] = (node as any).jsDoc;

  const jsDocTags: ts.JSDocTag[] = jsDocs
    .flatMap((jsDoc) => {
      const docTags = jsDoc.tags ? [...jsDoc.tags] : [];
      if (jsDoc.comment) {
        docTags.push({
          tagName: {
            text: "<main>",
          },
          comment: jsDoc.comment,
        } as ts.JSDocTag);
      }
      return docTags;
    })
    .filter(<T>(v: T | undefined): v is T => !!v);

  const matchedTags = jsDocTags
    .filter((tag) => {
      return tags.includes(tag.tagName.text);
    })
    .sort(
      (a, b) => tags.indexOf(a.tagName.text) - tags.indexOf(b.tagName.text)
    );

  if (matchedTags.length) {
    return matchedTags.find((tag) => !!tag.comment)?.comment;
  }
}

function handleTypeReference(nodeProps: NodeProps, props: SettingsProps, node: ts.TypeReferenceNode): ts.CallExpression {
  const { name, kind, typeChecker, zodImportValue, sourceFile } = nodeProps;
  
  console.log("Type Reference");
  const refNode = (node as any) as ts.TypeReferenceNode;

  if (ts.isIdentifier(refNode.typeName) && refNode.typeName.text === "Date") {
    console.log("isDate");
    return generatePrimitive({
      kind: ts.SyntaxKind.ClassKeyword,
      name: refNode.typeName.text,
      props,
      zodImportValue,
      sourceFile,
    });
  }

  const type = typeChecker.getTypeAtLocation(node);

  const typeDeclaration =
    type.symbol && type.symbol.declarations && type.symbol.declarations[0];

  const nodeType = (node as any).type ;

  // Check for Array<string>
  if (nodeType && nodeType.typeName && nodeType.typeName.text === "Array") {
    const elementType = typeChecker.getTypeAtLocation(
      nodeType.typeArguments[0]
    );
    const elementKind = nodeType.typeArguments[0].kind;
    // node is either aliased (non primitive) or in typeArguments (primitive)
    const elementNode = elementType?.aliasSymbol?.declarations[0]
      ? elementType.aliasSymbol.declarations[0]
      : nodeType;

    const generateNode = () =>
      generateNodeValue({
        node: elementNode,
        name,
        kind: elementKind,
        typeChecker,
        zodImportValue,
        sourceFile,
      });

    console.log("Generate Array UNHANDLED: ", {
      generateNode,
      name,
      kind,
    });
    return buildZodSchema(zodImportValue, 'any');;
  }

  // Check for Enums
  if (
    typeDeclaration &&
    typeDeclaration.kind === ts.SyntaxKind.EnumDeclaration
  ) {
    const enumMembers = type.symbol.exports! as Map<string, any>;
    const enumName = type.symbol.name;

    console.log("Generate Enum: ", {
      enumName,
      enumMembers,
    });
    return buildZodSchema(zodImportValue, "enum", [
      ts.createArrayLiteral(
        [...enumMembers.values()].map((value) =>
          ts.createStringLiteral(value.name)
        ),
        true
      ),
    ]);
  }

  // Check for other interfaces / types
  if (
    (typeDeclaration &&
      typeDeclaration.kind === ts.SyntaxKind.InterfaceDeclaration) ||
    (typeDeclaration && typeDeclaration.kind === ts.SyntaxKind.TypeLiteral)
  ) {
    const interfaceNode = type.symbol.declarations[0] as any;
    return generateObject({
      interfaceNode,
      typeChecker,
      zodImportValue,
      sourceFile,
    });
  }

  // Maybe type only has aliasSymbol?
  const typeAliasDeclaration =
    type.aliasSymbol &&
    type.aliasSymbol.declarations &&
    type.aliasSymbol.declarations[0];
  if (
    typeAliasDeclaration &&
    typeAliasDeclaration.kind === ts.SyntaxKind.TypeAliasDeclaration
  ) {
    const types: any[] = (type.aliasSymbol!.declarations[0] as any).type.types;
    const values = types.map((t) =>
      generateNodeValue({
        kind: t.kind,
        name,
        node: t,
        typeChecker,
        zodImportValue,
        sourceFile,
      })
    );

    const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });
    console.log(
      "ARR: ",
      printer.printNode(ts.EmitHint.Unspecified, values[0], sourceFile)
    );
    return buildZodSchema(zodImportValue, "union", [
      ts.createArrayLiteral(values, true),
    ]);
  }

  console.log('UNHANDLED TYPE REF');
  return buildZodSchema(zodImportValue, 'any');
}

const generateNodeValue = (nodeProps: NodeProps): ts.CallExpression => {
  const { node, name, kind, typeChecker, zodImportValue, sourceFile } = nodeProps;
  try {
    
    console.log("Generate Kind: ", name, kind, node);

    const config = vscode.workspace.getConfiguration(EXTENSION_NAME);

    const props: SettingsProps = {
      isOptional: !!node.questionToken,
      errorMessage: undefined,
    };

    if ((node as any).jsDoc && config.jsDocRenderErrorMessages) {
      props.errorMessage = handleJSDocTags(
        node,
        config.jsDocUseMainContentAsErrorMessage
          ? [JS_DOC_MAIN_TAG]
          : config.jsDocErrorTag.split(",")
      );
    }

    // Check whether property contains explicit sub properties
    const hasMembers =
      node.type &&
      (node.type as any).members &&
      (node.type as any).members.length > 0;

    if (hasMembers) {
      return generateObject({
        interfaceNode: (node as any).type,
        typeChecker,
        zodImportValue,
        sourceFile,
      });
    }

    // Check for type[] array definitions
    if (kind === ts.SyntaxKind.ArrayType) {
      const elementKind = (node.type as any).elementType.kind;
      const elementType = (node.type as any).elementType;

      const generateNode = () =>
        generateNodeValue({
          node: elementType,
          name,
          kind: elementKind,
          typeChecker,
          zodImportValue,
          sourceFile,
        });

      console.log("Generate Array UNHANDLED STILL: ", {
        generateNode,
        name,
        kind,
      });
      return buildZodSchema(zodImportValue, 'any');;
    }

    if (kind === ts.SyntaxKind.IntersectionType) {
      const types: any[] = (node as any).type.types;
      const allTypes = types.map((type) => {
        console.log("Int Type: ", type);
        return generateNodeValue({
          kind: type.kind,
          name,
          node: { type } as any,
          typeChecker,
          zodImportValue,
          sourceFile,
        });
      });

      return buildZodSchema(zodImportValue, "intersection", [...allTypes]);
    }

    // Check for Union Types
    if (kind === ts.SyntaxKind.UnionType) {
      const unionTypes: any[] = (node as any).type.types;
      const allTypes = unionTypes.map((unionType) =>
        generateNodeValue({
          kind: unionType.kind,
          name,
          node: unionType,
          typeChecker,
          zodImportValue,
          sourceFile,
        })
      );

      return buildZodSchema(zodImportValue, "union", [
        ts.createArrayLiteral(allTypes, true),
      ]);
    }

    // Check for literal
    if (kind === ts.SyntaxKind.LiteralType) {
      console.log("Generate Primitive Literal", node, node.type);

      const literal = (node as any).literal || (node as any).type.literal;
      return generatePrimitive({
        kind: literal.kind,
        name: literal.text,
        props,
        zodImportValue,
        sourceFile,
      });
    }

    if (kind === ts.SyntaxKind.TypeReference) {
      return handleTypeReference(nodeProps, props, node as any as ts.TypeReferenceNode);
    }
    // Is a reference to some other type
    if (node.type && ts.isTypeReferenceNode(node.type)) {
      return handleTypeReference(nodeProps, props, node.type);
    }


    console.log("Generate Primitive");

    return generatePrimitive({ name, kind, props, zodImportValue, sourceFile });
  } catch (err) {
    console.log(`Error generating fixture for name ${name} kind ${kind}`);
    console.error(err);
    // return something
    return buildZodSchema(zodImportValue, 'any');
  }
};
