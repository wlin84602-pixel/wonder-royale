(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.IslandMapTheme=api})(typeof globalThis!=='undefined'?globalThis:this,function(){
const themes={
 grass:{name:'Grassland',ground:'#7fa953',fleck:'#668c45',floor:'#ac8454',tile:'#858c91',roof:'#606e76',wall:'#344249',light:'#627578',edge:'#202c35',accent:'#d8b16a',tree:['#3d7448','#477c45','#59884b'],leaf:'#79a458',treeEdge:'#264c3b'},
 swamp:{name:'Wetlands',ground:'#518477',fleck:'#426d62',floor:'#8b8058',tile:'#6d8584',roof:'#526a61',wall:'#354b49',light:'#6c8780',edge:'#233a38',accent:'#aab16b',tree:['#386a52','#3e745c','#4b8060'],leaf:'#6f9b6c',treeEdge:'#224c40'},
 beach:{name:'Coastal Sands',ground:'#e7cf91',fleck:'#c6aa6a',floor:'#c6a36b',tile:'#c2b89c',roof:'#947751',wall:'#67543d',light:'#ac9263',edge:'#3e3c35',accent:'#e7c57b',tree:['#588745','#68974d','#75a354'],leaf:'#a2bc68',treeEdge:'#36593a'},
 farm:{name:'Autumn Fields',ground:'#bd934b',fleck:'#9c713c',floor:'#ae7e49',tile:'#8d8775',roof:'#885244',wall:'#614b3d',light:'#a0805d',edge:'#362f31',accent:'#edb65c',tree:['#ac672e','#c27d35','#d29a3f'],leaf:'#e7b44f',treeEdge:'#6d4b32'},
 industrial:{name:'Industrial District',ground:'#526466',fleck:'#405255',floor:'#8b8270',tile:'#78868c',roof:'#566675',wall:'#303c47',light:'#667d88',edge:'#202b37',accent:'#d8a24d',tree:['#51645a','#627567','#6c7c66'],leaf:'#839073',treeEdge:'#35483f'},
 haunted:{name:'Crystal Wastes',ground:'#6c5681',fleck:'#584564',floor:'#74647b',tile:'#727080',roof:'#514858',wall:'#363140',light:'#72617e',edge:'#252434',accent:'#bf6ee0',tree:['#594265','#694f78','#795d89'],leaf:'#987aab',treeEdge:'#372c45'},
 snow:{name:'Snowfield',ground:'#deedf3',fleck:'#bed8e8',floor:'#a4adb5',tile:'#91abba',roof:'#6d839e',wall:'#405369',light:'#8aabc0',edge:'#293b51',accent:'#c7efff',tree:['#88a6a5','#8cadb0','#9cb9b5'],leaf:'#edf8fa',treeEdge:'#57798a'},
 citadel:{name:'Citadel',ground:'#56545e',fleck:'#44434e',floor:'#807a80',tile:'#787984',roof:'#4b4d5b',wall:'#30333f',light:'#626778',edge:'#202532',accent:'#e9a142',tree:['#7b7240','#92773b','#a77c37'],leaf:'#c09447',treeEdge:'#494435'}
};
const regions=[
{id:'swamp',points:[[0,.32],[.15,.30],[.28,.37],[.30,.54],[.25,.65],[0,.67]]},
{id:'beach',points:[[0,.66],[.12,.59],[.28,.64],[.34,.84],[.31,1],[0,1]]},
{id:'farm',points:[[.33,.68],[.51,.65],[.67,.74],[.70,1],[.30,1],[.34,.86]]},
{id:'industrial',points:[[.69,.71],[.85,.69],[1,.68],[1,1],[.69,1],[.66,.86]]},
{id:'haunted',points:[[.67,.30],[.84,.28],[1,.31],[1,.72],[.86,.76],[.66,.71],[.62,.51]]},
{id:'snow',points:[[.66,0],[1,0],[1,.31],[.85,.35],[.68,.31],[.62,.17]]},
{id:'citadel',points:[[.38,.35],[.53,.34],[.65,.41],[.68,.58],[.61,.70],[.43,.72],[.33,.59],[.34,.46]]}
];
function organic(points){const out=[];for(let i=0;i<points.length;i++){const a=points[i],b=points[(i+1)%points.length],dx=b[0]-a[0],dy=b[1]-a[1],len=Math.hypot(dx,dy),steps=Math.max(1,Math.ceil(len/.018));for(let j=0;j<steps;j++){const u=j/steps,off=Math.sin(u*Math.PI)*(.005*Math.sin(i*2.31+u*10)+.003*Math.sin(i+u*22));out.push([a[0]+dx*u-dy/len*off,a[1]+dy*u+dx/len*off])}}return out}
for(const region of regions)region.renderPoints=organic(region.points);
function inside(x,y,points){let hit=false;for(let i=0,j=points.length-1;i<points.length;j=i++){const a=points[i],b=points[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])hit=!hit}return hit}
function idAt(x,y,size){x/=size;y/=size;for(let i=regions.length-1;i>=0;i--)if(inside(x,y,regions[i].points))return regions[i].id;return'grass'}
function at(x,y,size){return themes[idAt(x,y,size)]}
function noise(x,y){const v=Math.sin(x*127.1+y*311.7)*43758.5453;return v-Math.floor(v)}
return{themes,regions,idAt,at,noise};
});