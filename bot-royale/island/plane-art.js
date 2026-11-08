// Starting transport aircraft only. Parachute cosmetics use their existing loader.
const DROP_PLANE_ART=Object.freeze(__DROP_PLANES_DATA__);
const DROP_PLANE_COUNT=DROP_PLANE_ART.length;
// A separate seeded random draw gives every match one shared aircraft.
function chooseDropPlane(seed){return Math.floor(IslandCore.rng((seed>>>0)^0x706c616e)()*DROP_PLANE_COUNT)}
planeSprites=new Array(DROP_PLANE_COUNT);
globalThis.dropPlaneSpritesReady=Promise.all(DROP_PLANE_ART.map((entry,index)=>new Promise((resolve,reject)=>{
 const art=new Image();art.onload=()=>{planeSprites[index]=art;resolve(art)};
 art.onerror=()=>reject(new Error('Could not load drop plane: '+entry.id));art.src=entry.source;
}))).catch(error=>{console.error(error);return false});
