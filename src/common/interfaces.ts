export interface ShellProcessType {
  /**
   * Child process object
   */
  process: any;
  /**
   * Command output
   */
  output: string;
  /**
   * Process state
   */
  finished: boolean;
  /**
   * Command string
   */
  command: string;
}
