import { OutputChannel, Range } from 'vscode';
import { LineAndCharacter } from 'typescript';

export type ZodConverterConfig = {
    /**
     * If no zod import is detected, what value should be used by default?
     */
    defaultZodValueName: string;
    /** Should we parse JSDoc tags to look for validation error messages? */
    jsDocRenderErrorMessages: boolean;
    /** Use the main content for error descriptions instead of a tags value? When true, `JS Doc Error Tag` is ignored  */
    jsDocUseMainContentAsErrorMessage: boolean;
    /**
     * he tag to look for to use as the error message.  In order of precedence when comma-separated. 
     * Use `<main>` to indicate tag main value if needed.
     */
    jsDocErrorTag: string;
    /** Import Namespace (import * as z from)?  Will use (import z from) if false  */
    importStarAs: boolean
};
  
export type GetValueProps = {
  filename: string;
  range: Range;
  output: OutputChannel;
  config: ZodConverterConfig,
  insert: (pos: LineAndCharacter, value: string) => void;
  replace: (range: Range, value: string) => void;
};