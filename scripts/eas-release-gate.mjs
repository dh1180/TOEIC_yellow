import { spawnSync } from 'node:child_process';
if(process.env.EAS_BUILD_PROFILE==='production'){
 const r=spawnSync(process.execPath,[new URL('./check-release.mjs',import.meta.url).pathname],{stdio:'inherit'});
 process.exit(r.status??1);
}
