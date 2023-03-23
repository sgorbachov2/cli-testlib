import * as child from 'child_process';

export interface ShellProcessType {
  /**
   * Child process object
   */
  process: child.ChildProcess;
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
