import { crypto } from 'https://deno.land/std@0.152.0/crypto/mod.ts';
import { join, dirname, fromFileUrl } from 'https://deno.land/std@0.152.0/path/mod.ts';
import { existsSync } from 'node:fs';
import { generateApiKeyHash } from "../webserver/hash-utils.ts";

/*
 * Generates unique API key
 * - key & hash stored in `/.env`.
 * - key-hash stored in `src/webclient/api-key-hash.ts`.
 */

// config
const rootPath = join(dirname(fromFileUrl(import.meta.url)), '..', '..');
const cfg = {
  LEN_BYTES:    16,
  LF:           '\n',
  ENV_PATH:     join(rootPath, '.env'),
  CLIENT_PATH:  join(rootPath, 'src', 'webclient', 'api-key-hash.ts'),
  KEY_ENABLED:  'API_KEY_AUTH_ENABLE=true',
  API_KEY:      'API_KEY=',
  API_KEY_HASH: 'API_KEY_HASH=',
  CLIENT_HASH:  'export const API_KEY_HASH = '
}

// read .env into string
let envContent = '';
if (existsSync(cfg.ENV_PATH)) {
    envContent = Deno.readTextFileSync(cfg.ENV_PATH);
}

// If .env has auth enabled, generate a key, otherwise use empty strings
const isEnabled = envContent.includes(cfg.KEY_ENABLED);
const apiKey = isEnabled ? crypto.randomUUID().replace(/-/g, '').slice(0, cfg.LEN_BYTES * 2) : '';
const hash = isEnabled ? await generateApiKeyHash(apiKey) : '';

// Filter out old key and hash values from the .env content
const envLines = envContent.split(cfg.LF).
                           filter(row => !row.startsWith(cfg.API_KEY) &&
                                         !row.startsWith(cfg.API_KEY_HASH) &&
                                         row.length > 0);
// Add the new (or empty) key and hash values
envLines.push(`${cfg.API_KEY}${apiKey}`);
envLines.push(`${cfg.API_KEY_HASH}${hash}`);

// Always write the updated .env and client-side hash files
Deno.writeTextFileSync(cfg.ENV_PATH, envLines.join(cfg.LF) + cfg.LF);
Deno.writeTextFileSync(cfg.CLIENT_PATH, `${cfg.CLIENT_HASH}'${hash}';`);

const script = import.meta.url.replace('file://', '').split('/app/').pop();
console.log(`[ ${script} ] Generated ${isEnabled ? 'new' : 'empty'} API key configuration.`);
