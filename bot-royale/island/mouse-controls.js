// Side buttons use the same action dispatcher as keyboard bindings.
(function(){
 const oldDown=onmousedown,oldUp=onmouseup,oldAux=onauxclick,oldBlur=onblur,held=new Set();
 function side(e){return e.button===3||e.button===4}
 function active(){return running||islandNetwork.inLobby}
 function bound(key){return Object.values(bindings).includes(key)}
 function stop(e){e.preventDefault?.()}
 function down(e){if(!side(e))return false;const key='mouse'+e.button;if(settingsOpen){stop(e);captureMouseBinding(e);return true}if(!active()||!bound(key))return false;stop(e);if(held.has(key))return true;const target=e.target,editing=target?.tagName==='INPUT'||target?.tagName==='TEXTAREA'||target?.isContentEditable||document.activeElement?.id==='lobby-chat-text';if(editing)return true;held.add(key);onkeydown({key,repeat:false,target,ctrlKey:false,altKey:false,metaKey:false,preventDefault(){stop(e)}});if(key===bindings.fire)mouse.down=true;return true}
 function up(e){if(!side(e))return false;const key='mouse'+e.button;if(!held.has(key)&&!settingsOpen&&!(active()&&bound(key)))return false;stop(e);if(held.delete(key)){onkeyup({key,target:e.target,preventDefault(){stop(e)}});if(key===bindings.fire)mouse.down=false}return true}
 onmousedown=function(e){if(!down(e))return oldDown(e)};
 onmouseup=function(e){if(!up(e))return oldUp(e)};
 onauxclick=function(e){if(side(e)&&(settingsOpen||active()&&bound('mouse'+e.button))){stop(e);return}return oldAux?.(e)};
 onblur=function(...args){held.clear();return oldBlur?.(...args)};
 document.addEventListener?.('pointerdown',e=>{if(down(e))e.stopPropagation?.()},{capture:true,passive:false});
 document.addEventListener?.('pointerup',e=>{if(up(e))e.stopPropagation?.()},{capture:true,passive:false});
 document.addEventListener?.('pointercancel',e=>{if(side(e))up(e)},{capture:true,passive:false});
})();
