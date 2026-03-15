// ── LOCAL API FALLBACK (works when server/Pages returns 405) ──
// Side-effect module: wraps window.fetch on import
(function(){
  const _fetch=window.fetch;
  let serverDown=false;
  const LS_KEY='compPlanLocalDb';
  function ldb(){try{return JSON.parse(localStorage.getItem(LS_KEY))||{sessions:{},users:{},versions:{},nextId:1}}catch(e){return{sessions:{},users:{},versions:{},nextId:1}}}
  function sdb(d){localStorage.setItem(LS_KEY,JSON.stringify(d))}
  function jsonResp(data,status){return new Response(JSON.stringify(data),{status:status||200,headers:{'Content-Type':'application/json'}})}

  function localApiFetch(url,opts){
    const method=(opts&&opts.method||'GET').toUpperCase();
    const body=opts&&opts.body?JSON.parse(opts.body):{};
    const u=String(url);
    let m;
    // POST /api/sessions
    if(method==='POST'&&/^\/api\/sessions\/?$/.test(u)){
      const db=ldb();
      if(!body.adminPassword||body.adminPassword!=='alphabetsoup')return jsonResp({error:'Invalid admin password'},403);
      if(!body.name||!body.name.trim())return jsonResp({error:'Session name is required'},400);
      let code=body.code?body.code.trim().toUpperCase().replace(/[^A-Z0-9]/g,''):'';
      if(code.length<3)code=Math.random().toString(36).substring(2,7).toUpperCase();
      if(db.sessions[code])return jsonResp({error:'A session with that code already exists'},409);
      const id=db.nextId++;
      db.sessions[code]={id,code,name:body.name.trim(),created_at:new Date().toISOString()};
      sdb(db);
      return jsonResp({id,code,name:body.name.trim()});
    }
    // GET /api/sessions/:code
    if(method==='GET'&&(m=u.match(/^\/api\/sessions\/([A-Z0-9]+)\/?$/i))){
      const db=ldb();const s=db.sessions[m[1].toUpperCase()];
      if(!s)return jsonResp({error:'Session not found'},404);
      return jsonResp(s);
    }
    // POST /api/sessions/:code/users
    if(method==='POST'&&(m=u.match(/^\/api\/sessions\/([A-Z0-9]+)\/users\/?$/i))){
      const db=ldb();const code=m[1].toUpperCase();const s=db.sessions[code];
      if(!s)return jsonResp({error:'Session not found'},404);
      if(!body.displayName||!body.displayName.trim())return jsonResp({error:'Display name is required'},400);
      const colors=['#3a7d44','#2563eb','#dc2626','#9333ea','#ea580c','#0891b2'];
      if(!db.users[code])db.users[code]=[];
      const existing=db.users[code].find(u=>u.displayName===body.displayName.trim());
      if(existing)return jsonResp(existing);
      const uid=db.nextId++;
      const user={id:uid,displayName:body.displayName.trim(),color:colors[db.users[code].length%colors.length]};
      db.users[code].push(user);sdb(db);
      return jsonResp(user);
    }
    // GET /api/sessions/:code/users
    if(method==='GET'&&(m=u.match(/^\/api\/sessions\/([A-Z0-9]+)\/users\/?$/i))){
      const db=ldb();return jsonResp(db.users[m[1].toUpperCase()]||[]);
    }
    // GET /api/sessions/:code/versions
    if(method==='GET'&&(m=u.match(/^\/api\/sessions\/([A-Z0-9]+)\/versions\/?$/i))){
      const db=ldb();const code=m[1].toUpperCase();
      return jsonResp((db.versions[code]||[]).sort((a,b)=>new Date(b.updated_at||0)-new Date(a.updated_at||0)));
    }
    // POST /api/sessions/:code/versions
    if(method==='POST'&&(m=u.match(/^\/api\/sessions\/([A-Z0-9]+)\/versions\/?$/i))){
      const db=ldb();const code=m[1].toUpperCase();
      if(!db.versions[code])db.versions[code]=[];
      if(!body.name)return jsonResp({error:'Version name is required'},400);
      if(db.versions[code].find(v=>v.name===body.name.trim()))return jsonResp({error:'A version with that name already exists'},409);
      const vid=db.nextId++;const now=new Date().toISOString();
      const ver={id:vid,name:body.name.trim(),state_data:body.stateData||'{}',created_by:body.userId||null,created_at:now,updated_at:now};
      db.versions[code].push(ver);sdb(db);
      return jsonResp({id:vid,name:ver.name});
    }
    // GET /api/sessions/:code/versions/:id
    if(method==='GET'&&(m=u.match(/^\/api\/sessions\/([A-Z0-9]+)\/versions\/(\d+)\/?$/i))){
      const db=ldb();const code=m[1].toUpperCase();const vid=parseInt(m[2]);
      const ver=(db.versions[code]||[]).find(v=>v.id===vid);
      if(!ver)return jsonResp({error:'Version not found'},404);
      return jsonResp(ver);
    }
    // PUT /api/sessions/:code/versions/:id
    if(method==='PUT'&&(m=u.match(/^\/api\/sessions\/([A-Z0-9]+)\/versions\/(\d+)\/?$/i))){
      const db=ldb();const code=m[1].toUpperCase();const vid=parseInt(m[2]);
      const ver=(db.versions[code]||[]).find(v=>v.id===vid);
      if(!ver)return jsonResp({error:'Version not found'},404);
      if(body.stateData){ver.state_data=body.stateData;ver.updated_at=new Date().toISOString()}
      sdb(db);return jsonResp({ok:true});
    }
    // PUT /api/sessions/:code/versions/:id/rename
    if(method==='PUT'&&(m=u.match(/^\/api\/sessions\/([A-Z0-9]+)\/versions\/(\d+)\/rename\/?$/i))){
      const db=ldb();const code=m[1].toUpperCase();const vid=parseInt(m[2]);
      const ver=(db.versions[code]||[]).find(v=>v.id===vid);
      if(!ver)return jsonResp({error:'Version not found'},404);
      ver.name=body.name;ver.updated_at=new Date().toISOString();sdb(db);
      return jsonResp({ok:true});
    }
    // POST /api/sessions/:code/versions/:id/duplicate
    if(method==='POST'&&(m=u.match(/^\/api\/sessions\/([A-Z0-9]+)\/versions\/(\d+)\/duplicate\/?$/i))){
      const db=ldb();const code=m[1].toUpperCase();const vid=parseInt(m[2]);
      const src=(db.versions[code]||[]).find(v=>v.id===vid);
      if(!src)return jsonResp({error:'Source version not found'},404);
      const nid=db.nextId++;const now=new Date().toISOString();
      const dup={id:nid,name:body.name,state_data:src.state_data,created_by:body.userId||null,created_at:now,updated_at:now};
      db.versions[code].push(dup);sdb(db);
      return jsonResp({id:nid,name:dup.name});
    }
    // DELETE /api/sessions/:code/versions/:id
    if(method==='DELETE'&&(m=u.match(/^\/api\/sessions\/([A-Z0-9]+)\/versions\/(\d+)\/?$/i))){
      const db=ldb();const code=m[1].toUpperCase();const vid=parseInt(m[2]);
      const arr=db.versions[code]||[];
      if(arr.length<=1)return jsonResp({error:'Cannot delete the last version'},400);
      db.versions[code]=arr.filter(v=>v.id!==vid);sdb(db);
      return jsonResp({ok:true});
    }
    return jsonResp({error:'Not found'},404);
  }

  window.fetch=async function(url,opts){
    const u=String(url);
    if(!u.startsWith('/api/'))return _fetch(url,opts);
    if(serverDown)return localApiFetch(url,opts);
    try{
      const resp=await _fetch(url,opts);
      const ct=resp.headers.get('content-type')||'';
      if(!ct.includes('application/json')){
        console.warn('Server unavailable (status '+resp.status+'), switching to local mode');
        serverDown=true;
        return localApiFetch(url,opts);
      }
      return resp;
    }catch(e){
      console.warn('Server unreachable, switching to local mode:',e.message);
      serverDown=true;
      return localApiFetch(url,opts);
    }
  };
})();
