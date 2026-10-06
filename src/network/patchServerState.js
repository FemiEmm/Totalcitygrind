// Reuse unchanged reactive branches instead of replacing them on every server poll.
// Incoming state is JSON data; never share its objects with mutable game state.
export function patchServerState(target, source) {
  for (const key of Object.keys(source)) {
    const incoming = source[key];
    const current = target[key];
    if (incoming === null || typeof incoming !== 'object') {
      if (current !== incoming) target[key] = incoming;
      continue;
    }
    const array = Array.isArray(incoming);
    if (!current || typeof current !== 'object' || Array.isArray(current) !== array) {
      target[key] = array ? [] : {};
    }
    const branch = target[key];
    patchServerState(branch, incoming);
    if (array) {
      if (branch.length !== incoming.length) branch.length = incoming.length;
    } else {
      for (const existing of Object.keys(branch)) {
        if (!Object.hasOwn(incoming, existing)) delete branch[existing];
      }
    }
  }
}
