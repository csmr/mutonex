import { stringify } from "https://deno.land/std@0.152.0/encoding/yaml.ts";
import * as YAML from "https://deno.land/std@0.188.0/yaml/mod.ts";

//// Converts Debian 12 locale files to regions.yml ////
// outputs hash with territory-keys, factions array value
// Usage: `$ deno --allow-read --allow-write scripts/convertLocaleToUnitFactions.js`

const LOCALE_DIR = '/usr/share/i18n/locales';
const OUTPUT_FILE = '../res/regions.yaml';

const language_filters_arr = ['Bokm', 'Literary'];
const language_transforms = {
  "American English": "American",
  "Arabic": "Arab",
  "Australian English": "Australian",
  "Brazilian Portuguese": "Pardo",
  "British English": "British",
  "Canadian English": "Canuck",
  "Canadian French": "Tabernacleatian",
  "European Spanish": "Andalucian",
  "European Portuguese": "Madeiran",
  "Interlingua": "Gaulois",
  "Mexican Spanish": "Mexican",
  "Norwegian Nynorsk": "Norwegian",
  "Scottish Gaelic": "Gael",
  "Yiddish": "Ashkenazi",
  "Urdu": "Indian Muslim",
  "Bislama": "Ni-Vanuatu",
  "Central Kurdish": "Central Kurdish",
};

const territory_filters = {
  "Botswana": ["English"],
  "South Africa": ["English"],
  "Nicaragua": ["English"],
  "Hong Kong SAR China": ["English"],
  "Pakistan": ["English"],
  "New Zealand": ["English"],
  "Zambia": ["English"],
  "Nigeria": ["English"],
  "Malaysia": ["English"],
  "United Kingdom": ["English"],
  "Singapore": ["English"],
  "Israel": ["English"],
  "India": ["English"],
};
const territory_transforms = {
  France: ["Occitan", "Breton"],
  "Hong Kong SAR China": ["Chinese", "Hongkonger"],
  Iraq: ["Central Kurdish", "Kurdish"],
  Pakistan: ["Urdu", "Sindhi"],
  Spain: ["Spanish", "Castilian"]
}

const faction_additions = {
  Australia: ["Koori", "Murri"],
  Finland: ["Northern Sámi"],
  Russia: ["Skolt Sámi"],
  Sweden: ["Southern Sámi"],
  Brazil: ["Yanomani"]
};
// all locale files from the directory
async function getLocaleFiles(localeDir) {
  const files = [];
  for await (const entry of Deno.readDir(localeDir)) {
    if (entry.isFile) {
      files.push(`${localeDir}/${entry.name}`);
    }
  }
  return files;
}

// filter and extract locale file language and territory
// assume lang first in file, line format: ^territory = "Fiji"
// returns [lang, terr]
function extractLocaleData(content) {
  return content
          .split('\n')
          .filter(line => line.match(/^(territory|language)/))
          .map(line => line.split('"')[1])
          .filter(str => str.length > 1)
          .slice(0, 2);
}

function generateYamlData(localeData) {
  const yamlContent = `# Regions from Debian Linux 12 ${LOCALE_DIR}\n` +
                      `# hash format: territory-key: faction-arr\n` +
                      `# In-game these factions are the only ones left\n` +
                      `${stringify(localeData)}`;
  return yamlContent;
}

// process and filter each locale
const localeFiles = await getLocaleFiles(LOCALE_DIR);
const regions = {};
for (const filePath of localeFiles) {
  const content = await Deno.readTextFile(filePath);
  const ar = extractLocaleData(content); // [lang, terr]
  if (ar && ar.length > 1) {
    let l = ar[0];
    if ( language_filters_arr.some( f => f===l) ) continue;
    const t = ar[1];
    if ( territory_filters[t] === l ) continue;
    const tx = territory_transforms[t];
    if (tx && tx[0] == l) l = tx[1];
    const lx = language_transforms[l];
    if (lx) l = lx;
    if (!regions[t]) {
      regions[t] = [];
    }
    if (!regions[t].includes(l)) {
      regions[t].push(l);
    }
  }
}

// Additions to locale files languages
Object.entries(faction_additions).forEach( ([k, v]) => {
        if (typeof v == 'object') {
          v = Object.values(v); // array 
        }
        regions[k] = regions[k].concat( v );
      });

const yamlContent = generateYamlData(regions);
await Deno.writeTextFile(OUTPUT_FILE, yamlContent);
console.log(`YAML output generated at ${OUTPUT_FILE}`);


// test drive unit faction gen
let elements;
let territories;

async function loadData() {
  elements = YAML.parse(await Deno.readTextFile("../res/elements.yml"));
  territories = YAML.parse(await Deno.readTextFile(OUTPUT_FILE));
}


const pickRandom = (array) => array[Math.floor(Math.random() * array.length)];

async function unitFactionRandomizedStrArr() {
  await loadData();
  const territory = pickRandom(Object.keys(territories));
  const language = pickRandom(territories[territory]);
  const elementKey = pickRandom(Object.keys(elements));
  const element = elements[elementKey];
  return [ `unit faction: ${language} ${element}s`,
           `unit origin: ${territory}` ];
}

const factionString = await unitFactionRandomizedStrArr(); 
console.log('Random unit faction:\n', factionString.join("\n"));
