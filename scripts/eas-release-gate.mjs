import { spawnSync } from 'node:child_process';
if(process.env.EAS_BUILD_PROFILE==='production'){
  const r=spawnSync(process.execPath,['scripts/check-release.mjs'],{stdio:'inherit'});
  process.exit(r.status??1);
}
