import { existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, resolve as resolvePath } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const CONFIG_STUB = pathToFileURL(resolvePath(here, 'verify-config-stub.mjs')).href;

export async function resolve(specifier, context, nextResolve) {
  if (specifier.endsWith('/config') || specifier === '../config' || specifier === '../../config') {
    return { url: CONFIG_STUB, shortCircuit: true };
  }

  if (specifier.startsWith('.') && !/\.[a-z]+$/i.test(specifier)) {
    const parentPath = context.parentURL ? dirname(fileURLToPath(context.parentURL)) : here;
    const candidate = resolvePath(parentPath, `${specifier}.js`);
    if (existsSync(candidate)) {
      return { url: pathToFileURL(candidate).href, shortCircuit: true };
    }
  }

  return nextResolve(specifier, context);
}
