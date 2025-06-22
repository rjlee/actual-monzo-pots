// Shared suppression & Node.js version shim for Actual API scripts

// IMPORTANT: retain until @actual-app/api removes its Node>=20 guard.
// Enable this shim by setting ENABLE_NODE_VERSION_SHIM=true in your environment.
if (process.env.ENABLE_NODE_VERSION_SHIM === 'true') {
  Object.defineProperty(process.versions, 'node', { value: '20.0.0' });
}

// Shared suppression patterns:
const START_PATTERNS = [
  'Loading fresh spreadsheet',
  'Loaded spreadsheet from cache',
  'Syncing since',
  'Got messages from server',
];
const INCLUDE_PATTERNS = [
  'PostError: network-failure',
  'startServices called while services are already running',
  'Error creating budget: opening-budget',
  'error DELETE FROM categories',
];

const origStdout = process.stdout.write.bind(process.stdout);
process.stdout.write = (chunk, ...args) => {
  const s = chunk instanceof Buffer ? chunk.toString() : chunk;
  if (START_PATTERNS.some((p) => s.startsWith(p)) || INCLUDE_PATTERNS.some((p) => s.includes(p))) {
    return true;
  }
  return origStdout(chunk, ...args);
};

const origStderr = process.stderr.write.bind(process.stderr);
process.stderr.write = (chunk, ...args) => {
  const s = chunk instanceof Buffer ? chunk.toString() : chunk;
  if (INCLUDE_PATTERNS.some((p) => s.includes(p))) {
    return true;
  }
  return origStderr(chunk, ...args);
};
