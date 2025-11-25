// Minimal polyfills for runtime globals that some dependencies expect.
// This file is safe to import as the very first module in the app entrypoint.
// It provides `globalThis.crypto.randomUUID` using Node's crypto when missing.
/* eslint-disable @typescript-eslint/no-var-requires */
if (!(globalThis as any).crypto || !(globalThis as any).crypto.randomUUID) {
  // Use Node's crypto as a fallback.
  const nodeCrypto = require('crypto');
  (globalThis as any).crypto = (globalThis as any).crypto || {};
  (globalThis as any).crypto.randomUUID = (globalThis as any).crypto.randomUUID || (nodeCrypto.randomUUID ? () => nodeCrypto.randomUUID() : () => nodeCrypto.randomBytes(16).toString('hex'));
}

export {};
