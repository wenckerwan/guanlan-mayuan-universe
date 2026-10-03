(function(root,factory){const api=factory();if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.GuanlanAdapter=api;})(typeof window!=='undefined'?window:globalThis,function(){
  'use strict';
  function create({windowLike,core,nodeIds,getProgress,onProgress,onNavigate}) {
    let connection=null;
    const send=(type,extra={})=>{if(connection)connection.hostWindow.postMessage({channel:'mayuan-guanlan',version:1,type,...extra},connection.origin);};
    function receive(event){
      if(!connection||event.origin!==connection.origin||event.source!==connection.hostWindow)return;
      const m=event.data;
      if(!m||m.channel!=='mayuan-guanlan'||m.version!==1)return;
      if(m.type==='request-progress')send('progress',{progress:getProgress()});
      else if(m.type==='navigate'&&nodeIds.includes(m.nodeId))onNavigate(m.nodeId);
      else if(m.type==='import-progress'){
        try{onProgress(core.validateProgress(m.progress,nodeIds));send('imported');}
        catch{send('error',{code:'INVALID_PROGRESS'});}
      }
    }
    function disconnect(){if(connection)windowLike.removeEventListener('message',receive);connection=null;}
    return {
      get connected(){return !!connection;},
      connect({origin,hostWindow}){
        const parsed=new URL(origin);
        if(parsed.origin!==origin||!(['https:'].includes(parsed.protocol)||(parsed.protocol==='http:'&&['localhost','127.0.0.1','[::1]'].includes(parsed.hostname)))||!hostWindow||typeof hostWindow.postMessage!=='function')throw new Error('需要明确的 HTTPS 来源（本机可 HTTP）与宿主窗口');
        disconnect();connection={origin,hostWindow};windowLike.addEventListener('message',receive);send('ready',{app:'mayuan-universe',capabilities:['navigate','progress']});
      },
      disconnect,
      publishProgress(){send('progress',{progress:getProgress()});}
    };
  }
  return {create};
});
