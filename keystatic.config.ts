import { config } from '@keystatic/core';

export default config({
  storage: import.meta.env.DEV
    ? { kind: 'local' }
    : { kind: 'github', repo: { owner: 'holleyy', name: 'gaspery' } },
  ui: {
    brand: { name: 'gaspery' },
  },
  collections: {},
  singletons: {},
});
