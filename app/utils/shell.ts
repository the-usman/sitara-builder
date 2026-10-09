import type { ITerminal } from '~/types/terminal';
import { isRemoteSandboxEnabled, runRemoteShell } from '~/lib/sandbox/remote-sandbox.client';

/*
 * Terminals no longer run a shell in the browser: every command executes in the chat's Vercel
 * Sandbox (app/lib/sandbox). These classes only connect the xterm instances to that.
 */

/**
 * The "Bolt" terminal: read-only output pane for the commands the AI runs. ActionRunner writes
 * the sandbox's output into it via `terminal`.
 */
export class BoltShell {
  #terminal: ITerminal | undefined;

  attach(terminal: ITerminal) {
    this.#terminal = terminal;
  }

  get terminal() {
    return this.#terminal;
  }
}

export function newBoltShellProcess() {
  return new BoltShell();
}

const PROMPT = '\x1b[36m$\x1b[0m ';

/**
 * A user terminal: line-editing on the client, and each entered line runs in the sandbox with
 * its output streamed back. Not a full PTY — interactive programs (prompts, editors) won't work.
 * Ctrl+C stops waiting for the current command.
 */
export class RemoteInteractiveShell {
  #line = '';
  #running: AbortController | undefined;

  constructor(private readonly _terminal: ITerminal) {
    _terminal.onData((data) => this.#onData(data));
    _terminal.write("Commands run in this chat's Vercel Sandbox.\r\n" + PROMPT);
  }

  #onData(data: string) {
    if (this.#running) {
      if (data === '\x03') {
        this.#running.abort();
        this._terminal.write('^C\r\n');
      }

      return;
    }

    for (const char of data) {
      if (char === '\r') {
        void this.#submit();
      } else if (char === '\x7f' || char === '\b') {
        if (this.#line) {
          this.#line = this.#line.slice(0, -1);
          this._terminal.write('\b \b');
        }
      } else if (char === '\x03') {
        this.#line = '';
        this._terminal.write('^C\r\n' + PROMPT);
      } else if (char >= ' ') {
        this.#line += char;
        this._terminal.write(char);
      }
    }
  }

  async #submit() {
    const command = this.#line.trim();
    this.#line = '';
    this._terminal.write('\r\n');

    if (!command) {
      this._terminal.write(PROMPT);
      return;
    }

    if (command === 'clear') {
      this._terminal.reset();
      this._terminal.write(PROMPT);

      return;
    }

    if (!(await isRemoteSandboxEnabled())) {
      this._terminal.write(
        '\x1b[31mRemote preview (Vercel Sandbox) is not configured on this server.\x1b[0m\r\n' + PROMPT,
      );
      return;
    }

    this.#running = new AbortController();

    try {
      const result = await runRemoteShell(command, this._terminal, { signal: this.#running.signal, echo: false });

      if (result.exitCode !== 0 && !this.#running.signal.aborted) {
        this._terminal.write(`\x1b[31mexit code ${result.exitCode}\x1b[0m\r\n`);
      }
    } finally {
      this.#running = undefined;
      this._terminal.write(PROMPT);
    }
  }
}
