import * as ts from "typescript";

export type IValue = any;

export type PrimitiveGenerator = (params: {
  kind: ts.SyntaxKind;
  name: string;
  zodImportValue: string;
  props: { isOptional: boolean; errorMessage: undefined | string; isNullable?: boolean }
}) => IValue;

export type LiteralGenerator = (params: {
  kind: ts.SyntaxKind;
  text: string;
}) => IValue;

export type FileStringGenerator = (params: {
  value: IValue;
  interfaceName: string;
}) => IValue;

export type ArrayGenerator = (params: {
  generateNode: () => IValue;
  name: string;
  kind: ts.SyntaxKind;
}) => IValue;

export type EnumGenerator = (params: {
  enumName: string;
  enumMembers: ts.SymbolTable;
}) => IValue;

export type UnionGenerator = (values: IValue[]) => IValue;

export type FilenameGenerator = (interfaceName: string) => string;

export interface IValueGenerator {
  generateArray: ArrayGenerator;
  generateUnion: UnionGenerator
  generateEnum: EnumGenerator;
  generateLiteral: LiteralGenerator;
  generatePrimitive: PrimitiveGenerator;
  generateFilename: FilenameGenerator;
  generateFileString: FileStringGenerator;
}