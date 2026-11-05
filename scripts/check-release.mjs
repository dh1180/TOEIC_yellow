import {readFileSync} from 'node:fs';
const manifest=JSON.parse(readFileSync(new URL('../src/data/manifest.json',import.meta.url),'utf8'));
const sourcesRightsVerified=false; // Must be set only after documented written permission.
const nativeDeviceVerified=false; // Needs documented Android and iOS testing.
if(manifest.independentlyVerifiedExamples!==5101 || !sourcesRightsVerified || !nativeDeviceVerified){
  console.error('Production release blocked: 5,101-word independent language/sense validation, source rights, and native-device checks are outstanding.');
  process.exit(1);
}
