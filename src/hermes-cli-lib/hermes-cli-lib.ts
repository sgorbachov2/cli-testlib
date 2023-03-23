import * as child from 'child_process';
import kill from 'tree-kill';
import type { ShellProcessType } from '../common/interfaces';
import { hermesLibConfig } from '../common/hermes-cli-lib-config';

/**
 * Class to handle cli methods
 */
export class HermesCLILib {
  /**
   * Run simple cli command that doesn't require any interaction
   * @param command cli command, e.g. <cli> --version
   * @returns command output
   */
  static async runSimpleCommand(
    command: string,
    options?: {
      /**
       * Skip auto update notification?
       */
      skipUpdate: boolean;
    },
  ): Promise<string> {
    try {
      // Start child process and run command
      const shell = await this.runCommand(command, options?.skipUpdate);

      // Wait for shell.finished state
      await this.checkIfFinished(shell);

      // Return output
      return shell.output;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Run shell command
   * - Start child process with the command
   * - Listen to data output events and collect them
   * @param command cli command, e.g. <cli> --version or any shell command
   * @param skipUpdate skip auto update notification
   * @returns command output
   */
  private static async runCommand(command: string, skipUpdate = true): Promise<ShellProcessType> {
    try {
      if (skipUpdate) {
        command += ' --skip-update';
      }

      // Always enable test trace output
      // TODO: move to config file
      process.env.SLACK_TEST_TRACE = 'true';

      // Start child process
      const childProcess = child.spawn(`${command}`, {
        shell: true,
      });

      // Set shell object
      const shell: ShellProcessType = {
        process: childProcess,
        output: '',
        finished: false,
        command,
      };

      // Listen to data event that returns all the output and collect it
      childProcess.stdout.on('data', (data: any) => {
        shell.output += HermesCLILib.removeANSIcolors(data.toString());
      });

      // Collect error output
      childProcess.stderr.on('data', (data: any) => {
        shell.output += HermesCLILib.removeANSIcolors(data.toString());
      });

      // Set the finished flag to true on close event
      childProcess.on('close', () => {
        shell.finished = true;
      });

      return shell;
    } catch (error) {
      throw new Error(`runCommand\nFailed to run command.\nCommand: ${command}`);
    }
  }

  /**
   * Remove all the ANSI color and style encoding
   * @param text string
   */
  private static removeANSIcolors(text: string): string {
    const cleanText = text.replace(
      // eslint-disable-next-line no-control-regex
      /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g,
      '',
    );
    return cleanText;
  }

  /**
   * Logic to wait for child process to finish executing
   * - Check if the close event was emitted, else wait for 1 sec
   * - Error out if > 30 sec
   * @param shell shell object
   */
  private static async checkIfFinished(shell: ShellProcessType): Promise<void | Error> {
    const timeout = 1000;
    let waitedFor = 0;

    // eslint-disable-next-line no-constant-condition
    while (true) {
      // eslint-disable-next-line no-await-in-loop
      await this.sleep(timeout);
      if (shell.finished) {
        break;
      }
      waitedFor += timeout;
      if (waitedFor > hermesLibConfig.waitingTimeoutGlobal) {
        // Kill the process
        kill(shell.process.pid);
        throw new Error(
          `checkIfFinished\nFailed to finish after ${hermesLibConfig.waitingTimeoutAction} ms.\nCommand: ${shell.command}\nCurrent output: \n${shell.output}`,
        );
      }
    }
  }

  /**
   * Sleep function used to wait for cli to finish executing
   * @param timeout ms
   */
  private static sleep(timeout = 1000): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(resolve, timeout);
    });
  }
}
