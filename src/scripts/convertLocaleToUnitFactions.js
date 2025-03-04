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

const faction_unmatched = {
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

// replace any regions territories lang values
// where regObj values match any transformObj key, replace regObj values
// also removes any lang entries with partial match with strings in languageFilters
// removes exact matches with unmatchedObj props
// returns filtered & transformed regObj
function transformLanguages(regObj, languageFilters, transformObj, unmatchedObj) {
   // drop filter-list entries from languages
  const newRegObj = {};
  for (const territory in regObj) {
    let languages = regObj[territory];

    if (unmatchedObj[territory]) {
      languages = languages.filter(lang => !unmatchedObj[territory].includes(lang));
    }

    const filteredLanguages = languages.filter(lang => !languageFilters.some(filter => lang.includes(filter)));

    if (filteredLanguages.length > 0) {
      newRegObj[territory] = filteredLanguages;
    }
  }

  // Transform languages
  Object.keys(newRegObj).forEach(terr => {
    newRegObj[terr] = newRegObj[terr].map(lang => transformObj[lang] || lang);
  });

  return newRegObj;
}

function generateYamlData(localeData) {
  const yamlContent = `# Regions from Debian Linux 12 ${LOCALE_DIR}\n` +
                      `# Format: territory-key: tribe-prefix-arr (lang)\n` +
                      `# In-game these factions are the only ones left\n` +
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
// adds some tribes, transforms some langs to tribes
regions = transformLanguages(regions, language_filters_arr, language_transforms, faction_unmatched);

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
