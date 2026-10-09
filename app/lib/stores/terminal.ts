import { atom, type WritableAtom } from 'nanostores';
import type { ITerminal } from '~/types/terminal';
import { newBoltShellProcess, RemoteInteractiveShell } from '~/utils/shell';

export class TerminalStore {
  #terminals: RemoteInteractiveShell[] = [];
  #boltTerminal = newBoltShellProcess();

  showTerminal: WritableAtom<boolean> = import.meta.hot?.data.showTerminal ?? atom(true);

  constructor() {
    if (import.meta.hot) {
      import.meta.hot.data.showTerminal = this.showTerminal;
    }
  }

  get boltTerminal() {
    return this.#boltTerminal;
  }

  toggleTerminal(value?: boolean) {
    this.showTerminal.set(value !== undefined ? value : !this.showTerminal.get());
  }

  attachBoltTerminal(terminal: ITerminal) {
    this.#boltTerminal.attach(terminal);
  }

  attachTerminal(terminal: ITerminal) {
    this.#terminals.push(new RemoteInteractiveShell(terminal));
  }

  onTerminalResize(_cols: number, _rows: number) {
    // Commands run in the sandbox without a PTY, so there is nothing to resize.
  }
}
