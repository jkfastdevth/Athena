import { useEffect, useRef } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';

export default function AgentPtyTerminal({ output, running, onData, onResize }) {
  const hostRef = useRef(null);
  const terminalRef = useRef(null);
  const consumedRef = useRef(0);
  const dataRef = useRef(onData);
  const resizeRef = useRef(onResize);

  useEffect(() => {
    dataRef.current = onData;
    resizeRef.current = onResize;
  }, [onData, onResize]);

  useEffect(() => {
    if (!hostRef.current) return undefined;

    const terminal = new Terminal({
      cursorBlink: true,
      fontFamily: 'Cascadia Code, Consolas, monospace',
      fontSize: 12,
      scrollback: 4000,
      theme: {
        background: '#07090d',
        foreground: '#dbeafe',
        cursor: '#22d3ee',
        selectionBackground: '#164e63'
      }
    });
    const fit = new FitAddon();
    terminal.loadAddon(fit);
    terminal.open(hostRef.current);
    fit.fit();
    terminal.focus();

    const dataDisposable = terminal.onData((data) => dataRef.current(data));
    const resizeDisposable = terminal.onResize(({ cols, rows }) => resizeRef.current(cols, rows));
    resizeRef.current(terminal.cols, terminal.rows);

    const observer = new ResizeObserver(() => {
      fit.fit();
      resizeRef.current(terminal.cols, terminal.rows);
    });
    observer.observe(hostRef.current);

    terminalRef.current = terminal;
    consumedRef.current = 0;

    return () => {
      observer.disconnect();
      dataDisposable.dispose();
      resizeDisposable.dispose();
      terminal.dispose();
      terminalRef.current = null;
    };
  }, []);

  useEffect(() => {
    const terminal = terminalRef.current;
    if (!terminal) return;

    if (output.length < consumedRef.current) {
      terminal.reset();
      consumedRef.current = 0;
    }

    const delta = output.slice(consumedRef.current);
    if (delta) {
      terminal.write(delta);
      consumedRef.current = output.length;
    }
  }, [output]);

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.options.cursorBlink = running;
    }
  }, [running]);

  return (
    <section className="agent-pty-pane">
      <div className="agent-pty-header">
        <span>Live Agent PTY</span>
        <span className={running ? 'agent-pty-live' : 'agent-pty-idle'}>
          {running ? 'INTERACTIVE' : 'FINISHED'}
        </span>
      </div>
      <div ref={hostRef} className="agent-pty-host" />
    </section>
  );
}
