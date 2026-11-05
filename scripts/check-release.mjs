import { readFileSync } from 'node:fs';
const audit=JSON.parse(readFileSync(new URL('../data/content_audit.json',import.meta.url),'utf8'));
if(audit.pendingProfessionalReview || audit.meaningAndUsageFullyCertified!==true){
  console.error(`Production blocked: ${audit.pendingProfessionalReview} words still require independent content validation. Confirm source licenses and device tests before release.`);
  process.exit(1);
}
