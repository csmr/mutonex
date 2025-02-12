import { crypto } from 'https://deno.land/std@0.152.0/crypto/mod.ts';
import { join } from 'https://deno.land/std@0.152.0/path/mod.ts';
import { existsSync } from 'node:fs';
import { generateApiKeyHash } from "../webserver/hash-utils.ts";

/* 
 * Generates unique API key
 * - key stored in `src/simtellus/.env`.
 * - key-hash stored in `src/client/api-key-hash.sh`.
 */

// config
const cfg = {
  LEN_BYTES:   16,
  LF:          '\n',
  ENV_PATH:    join(Deno.cwd(), 'simtellus', '.env'),
  CLIENT_PATH: join(Deno.cwd(), 'client', 'api-key-hash.ts'),
  KEY_ENABLED: 'API_KEY_AUTH_ENABLE=true',
  apiKeyStr:   'API_KEY=',
  hashPrefix:  'export const API_KEY_HASH = '
} 

// from inStr, del rows with xStr, addStr row
function cleanAndInsertRows(inStr, xStr, addStr) {
  return inStr.split(cfg.LF).
               filter(row => !row.includes(xStr) && row.length>=1).
               concat(addStr).
               join(cfg.LF);
}

// read .env into string 
let inStr = '';
if (existsSync(cfg.ENV_PATH)) {
    inStr = Deno.readTextFileSync(cfg.ENV_PATH);
}

// If .env has auth enabled, key, otherwise empty
const isEnabled = inStr.includes(cfg.KEY_ENABLED);
const apiKey = isEnabled ? crypto.randomUUID().replace(/-/g, '').slice(0, cfg.LEN_BYTES * 2) : '';

// Convert hash buffer to hex string
const hash = isEnabled ? await generateApiKeyHash(apiKey) : '';

// Always write files
Deno.writeTextFileSync(cfg.ENV_PATH, 
    cleanAndInsertRows(inStr, cfg.apiKeyStr, `${cfg.apiKeyStr}${apiKey}`));

Deno.writeTextFileSync(cfg.CLIENT_PATH, 
    `${cfg.hashPrefix}'${hash}';`);

const script = import.meta.url.replace('file://', '').split('/app/').pop();
console.log(`[ ${script} ] Generated ${isEnabled ? 'new' : 'empty'} API key configuration.`);
