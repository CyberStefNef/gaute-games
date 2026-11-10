// Runs game logic the way Gaute's server does: a fresh QuickJS runtime per call,
// the shared runtime prelude, and the same memory, CPU and output limits.
import { newQuickJSWASMModuleFromVariant } from 'quickjs-emscripten-core';
import variant from '@jitl/quickjs-singlefile-mjs-release-sync';
import { RUNTIME_PRELUDE } from '../sdk/runtime-prelude.mjs';

export const SANDBOX_LIMITS = {
  memoryBytes: 16 * 1024 * 1024,
  stackBytes: 512 * 1024,
  interrupts: 200,
  stateBytes: 256 * 1024,
  viewBytes: 64 * 1024,
  resultBytes: 4 * 1024,
};

export class GameFailure extends Error {}

let engine;
const quickjs = () => (engine ??= newQuickJSWASMModuleFromVariant(variant));
const bytes = (value) => Buffer.byteLength(value);

async function evaluate(logic, call) {
  const runtime = (await quickjs()).newRuntime();
  runtime.setMemoryLimit(SANDBOX_LIMITS.memoryBytes);
  runtime.setMaxStackSize(SANDBOX_LIMITS.stackBytes);
  let interrupts = 0;
  runtime.setInterruptHandler(() => ++interrupts > SANDBOX_LIMITS.interrupts);
  const vm = runtime.newContext();
  const fail = (stage, handle) => {
    const detail = vm.dump(handle);
    handle.dispose();
    return new GameFailure(`${stage}: ${detail?.name ?? 'Error'}: ${detail?.message ?? ''}`);
  };
  try {
    const loaded = vm.evalCode(RUNTIME_PRELUDE + '\n;' + logic, 'game.js');
    if (loaded.error) throw fail('load', loaded.error);
    loaded.value.dispose();
    return call(vm, fail);
  } finally {
    vm.dispose();
    runtime.dispose();
  }
}

function invoke(vm, fail, name, argument) {
  const fn = vm.getProp(vm.global, name);
  const arg = argument === undefined ? undefined : vm.newString(argument);
  const called = arg ? vm.callFunction(fn, vm.undefined, arg) : vm.callFunction(fn, vm.undefined);
  fn.dispose();
  arg?.dispose();
  if (called.error) throw fail(name, called.error);
  const value = vm.getString(called.value);
  called.value.dispose();
  return value;
}

/** Runs one setup, action or leave request. Throws GameFailure when the game misbehaves. */
export function runGame(logic, request) {
  return evaluate(logic, (vm, fail) => {
    const output = JSON.parse(invoke(vm, fail, '__dispatch', JSON.stringify(request)));
    if (!output.ok || output.unsupported) return output;
    if (bytes(output.state) > SANDBOX_LIMITS.stateBytes)
      throw new GameFailure('state is larger than 256 KB');
    for (const [viewer, view] of Object.entries(output.views))
      if (bytes(view) > SANDBOX_LIMITS.viewBytes)
        throw new GameFailure(`view for ${viewer} is larger than 64 KB`);
    if (output.ended !== undefined && bytes(output.ended) > SANDBOX_LIMITS.resultBytes)
      throw new GameFailure('result is larger than 4 KB');
    return output;
  });
}

/** The game's action names and whether it defines `turn`. */
export function describeGame(logic) {
  return evaluate(logic, (vm, fail) => JSON.parse(invoke(vm, fail, '__describe')));
}
