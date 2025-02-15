import { stringify } from "https://deno.land/std@0.152.0/encoding/yaml.ts";
import * as YAML from "https://deno.land/std@0.188.0/yaml/mod.ts";

// Converts Debian 12 locale files to territory-languages hash //
// Usage: `$ $ deno --allow-read --allow-write scripts/convertLocaleToUnitFactions.js`

const LOCALE_DIR = '/usr/share/i18n/locales';
const OUTPUT_FILE = '../res/regions.yaml';

const language_filters = ['Bokm', 'Literary'];
const language_transforms = {
  "American English": "American",
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
};
const langAdd = { Australia: ["Koori", "Murri"], Finland: "Sámi", Russia: "Sámi", Sweden: "Sámi", Brazil: "Yanomani" };


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

// replace any regions territories lang values
// where value matches any transformObj keys, with this xform entry value
// also removes any lang entries with partial match with strings in languageFilters
// returns filtered & transformed regObj
function transformLanguages(regObj, languageFilters, transformObj) {
   // drop filter-list entries from languages
  const newRegObj = {};
  for (const territory in regObj) {
    const languages = regObj[territory];
    const filteredLanguages = languages.filter(lang => !languageFilters.some(filter => lang.includes(filter)));

    if (filteredLanguages.length > 0) {
      newRegObj[territory] = filteredLanguages;
    }
  }
  regObj = newRegObj;  // This is the crucial change

  // transforms
  Object.keys(regObj).map( terr => {
    regObj[terr].map( lang => {

      // transform languages
      const inStr = transformObj[lang];
      if (typeof inStr != 'undefined') {
        let idx = regObj[terr].indexOf( lang );
        regObj[terr].splice(idx, 1, inStr);
      }

    });
  } 
  );
  return regObj;
}

function generateYamlData(localeData) {
  const yamlContent = `# Regions from Debian Linux 12 ${LOCALE_DIR}\n` +
                      `# Format: territory-key: tribe-prefix-arr (lang)\n` +
                      `${stringify(localeData)}`;
  return yamlContent;
}

const localeFiles = await getLocaleFiles(LOCALE_DIR);
let regions = {};

for (const filePath of localeFiles) {
  const content = await Deno.readTextFile(filePath);
  const ar = extractLocaleData(content); // [lang, terr]
  if (ar && ar.length > 1) {
    const l = ar[0];
    const t = ar[1];
    if (!regions[t]) {
      regions[t] = [];
    }
    if (!regions[t].includes(l)) {
      regions[t].push(l);
    }
  }
}

// Convert Sets back to arrays
for (const territory in regions) {
  regions[territory] = Array.from(regions[territory]);
}

// Clean up entries in regions object
regions = transformLanguages(regions, language_filters, language_transforms);

// Additions to locale files languages
Object.entries(langAdd).forEach( ([k, v]) => {
        if (typeof v == 'object') {
          v = Object.values(v); // array 
        }
        regions[k] = regions[k].concat( v );
      });

const yamlContent = generateYamlData(regions);
await Deno.writeTextFile(OUTPUT_FILE, yamlContent);
console.log(`YAML output generated at ${OUTPUT_FILE}`);


// test drive unit faction/tribe gen
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
  return [ `unit tribe: ${language} ${element}s`,
           `unit origin: ${territory}` ];
}

const factionString = await unitFactionRandomizedStrArr(); 
console.log('Random unit faction:\n', factionString.join("\n"));
