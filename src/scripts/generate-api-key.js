import { crypto } from 'https://deno.land/std@0.152.0/crypto/mod.ts';
import { join } from 'https://deno.land/std@0.152.0/path/mod.ts';
import { existsSync } from 'node:fs';
import { generateApiKeyHash } from "../webserver/hash-utils.ts";

/* 
 * Generates unique API key
 * - simple http API access control for dev container.
 * - re-set when devenv started `$ ./devenv.sh`.
 * - key stored in `src/simtellus/.env`.
 * - key-hash stored in `src/client/api-key-hash.sh`.
 */

// config
const a = {
  LEN_BYTES:   32,
  LF:          '\n',
  ENV_PATH:    join(Deno.cwd(), 'simtellus', '.env'),
  CLIENT_PATH: join(Deno.cwd(), 'client', 'api-key-hash.ts'),
  KEY_ENABLED: 'API_KEY_AUTH_ENABLE=true',
  apiKeyStr:   'API_KEY=',
  hashPrefix:  'export const API_KEY_HASH = '
} 

// from inStr, del rows with xStr, addStr row
function cleanAndInsertRows(inStr, xStr, addStr) {
  return inStr.split(a.LF)
              .filter(row => !row.includes(xStr))
              .concat(addStr)
              .join(a.LF);
}

// read .env into string 
let inStr = '';
if (existsSync(a.ENV_PATH)) {
    inStr = Deno.readTextFileSync(a.ENV_PATH);
}

// Generate empty or real values based on enabled state
const isEnabled = inStr.includes(a.KEY_ENABLED);
const apiKey = isEnabled ? crypto.randomUUID().replace(/-/g, '').slice(0, a.LEN_BYTES * 2) : '';

// Convert hash buffer to hex string
const hash = isEnabled ? await generateApiKeyHash(apiKey) : '';

// Always write files
Deno.writeTextFileSync(a.ENV_PATH, 
    cleanAndInsertRows(inStr, a.apiKeyStr, `${a.apiKeyStr}${apiKey}`));

Deno.writeTextFileSync(a.CLIENT_PATH, 
    `${a.hashPrefix}'${hash}';`);

const script = import.meta.url.replace('file://', '').split('/app/').pop();
console.log(`[ ${script} ] Generated ${isEnabled ? 'new' : 'empty'} API key configuration.`);
