import * as ts from "typescript";

// const JSDOC_FLAGS = ["positive", "max", "min", "length", "email"] as const;

// type JSDocFlags = typeof JSDOC_FLAGS[number];

type GenerateProps = {
  kind: ts.SyntaxKind;
  name: string;
  zodImportValue: string;
  sourceFile: ts.SourceFile;
  props: {
    isOptional: boolean;
    errorMessage: undefined | string;
    isNullable?: boolean;
  };
};

type ArgExpressions = "number" | "string";

function buildExpression<T extends string>(
  type: T,
  ...args: T extends ArgExpressions ? [string] : never[]
): ts.Expression {
  switch (type) {
    case "number":
      return ts.createNumericLiteral(args[0]);
    case "string":
      return ts.createStringLiteral(args[0]);
  }
  throw new Error(`Unknown TypeScript Expression type: ${type}`);
}

// const GLOBAL_FLAGS = new Map([
//   ["max", (value: string) => [buildExpression("number", value)]],
//   ["min", (value: string) => [buildExpression("number", value)]],
// ] as const);

// const NUMERIC_FLAGS = new Map([
//   ["positive", () => []],
//   ["negative", () => []],
//   ["nonnegative", () => []],
//   ["nonpositive", () => []],
//   ["int", () => []],
//   ...GLOBAL_FLAGS.entries(),
// ] as const);

// const STRING_FLAGS = new Map([
//   ["url", () => []],
//   ["uuid", () => []],

//   ["length", (value: string) => [buildExpression("number", value)]],
//   ["email", (value: string) => [buildExpression("string", value)]],
//   ...GLOBAL_FLAGS.entries(),
// ] as const);

function addPropertyCall(
  zodCall: ts.CallExpression,
  name: string,
  args?: ts.Expression[]
) {
  return ts.createCall(
    ts.createPropertyAccess(zodCall, ts.createIdentifier(name)),
    undefined,
    args
  );
}

export function buildZodSchema(
  zodId: string,
  callName: string,
  /**
   * Args to add to the main zod call, if any
   */
  args?: ts.Expression[],
  /**
   * An array of flags that should be added as extra property calls such as optional to add .optional()
   */
  flags?: string[]
) {
  let zodCall = ts.createCall(
    ts.createPropertyAccess(
      ts.createIdentifier(zodId),
      ts.createIdentifier(callName)
    ),
    undefined,
    args
  );
  if (flags) {
    zodCall = flags.reduce((updatedCall, flag) => {
      return addPropertyCall(updatedCall, flag);
    }, zodCall);
  }
  return zodCall;
}

export const doGeneratePrimitive = ({
  kind,
  name,
  props,
  zodImportValue,
}: GenerateProps) => {
  let flags = [];

  if (props.isOptional) {
    flags.push("optional");
  }
  if (props.isNullable) {
    flags.push("nullable");
  }

  switch (kind) {
    case ts.SyntaxKind.NumericLiteral:
      return buildZodSchema(
        zodImportValue,
        "literal",
        [ts.createNumericLiteral(name)],
        flags
      );
    case ts.SyntaxKind.StringLiteral:
      return buildZodSchema(
        zodImportValue,
        "literal",
        [ts.createStringLiteral(name)],
        flags
      );
    case ts.SyntaxKind.BigIntLiteral:
      return buildZodSchema(
        zodImportValue,
        "literal",
        [ts.createBigIntLiteral(name)],
        flags
      );
    case ts.SyntaxKind.TrueKeyword:
      return buildZodSchema(
        zodImportValue,
        "literal",
        [ts.createTrue()],
        flags
      );
    case ts.SyntaxKind.FalseKeyword:
      return buildZodSchema(
        zodImportValue,
        "literal",
        [ts.createFalse()],
        flags
      );
    case ts.SyntaxKind.StringKeyword:
      return buildZodSchema(zodImportValue, "string", [], flags);
    case ts.SyntaxKind.BooleanKeyword:
      return buildZodSchema(zodImportValue, "boolean", [], flags);
    case ts.SyntaxKind.NullKeyword:
      return buildZodSchema(zodImportValue, "null", [], flags);
    case ts.SyntaxKind.UndefinedKeyword:
      return buildZodSchema(zodImportValue, "undefined", [], flags);
    case ts.SyntaxKind.NumberKeyword:
      return buildZodSchema(zodImportValue, "number", [], flags);
    case ts.SyntaxKind.AnyKeyword:
      return buildZodSchema(zodImportValue, "any", [], flags);
    case ts.SyntaxKind.BigIntKeyword:
      return buildZodSchema(zodImportValue, "bigint", [], flags);
    case ts.SyntaxKind.VoidKeyword:
      return buildZodSchema(zodImportValue, "void", [], flags);
    case ts.SyntaxKind.ClassKeyword: {
      if (name === "Date") {
        return buildZodSchema(zodImportValue, "date", [], flags);
      }
      console.log("Class: ", kind, name);
    }
    default:
      break;
  }

  console.log("Unhandled TS Kind: ", kind, " defaulting to any");
  return buildZodSchema(zodImportValue, "any", [], flags);
};

export const generatePrimitive = (props: GenerateProps) => {
  const expression = doGeneratePrimitive(props);
  const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });
  console.log(
    "LITERAL: ",
    printer.printNode(ts.EmitHint.Unspecified, expression, props.sourceFile)
  );
  return expression;
};
