'use strict';
const express = require('express');
const crypto = require('crypto');
const DOMAIN = {"id": "music-royalties", "label": "music rights and royalties", "actionPrefix": "Review royalty item"};
const FEATURES = [{"id": "royalty-anomaly", "title": "Royalty anomaly scan", "actionPrefix": "Investigate royalty variance in"}, {"id": "catalog-health", "title": "Catalog health summary", "actionPrefix": "Clean catalog metadata for"}, {"id": "payment-priority", "title": "Payment priority plan", "actionPrefix": "Prioritise payment for"}];
function userKey(req){ const u=req.user||{}; return String(u.id||u.userId||u.email||'anonymous-user'); }
function hasProviderKey(){
  const ok=v=>{ const s=String(v||'').trim(); return s.length>=8 && !/your-|placeholder|example/i.test(s); };
  if(ok(process.env.OPENROUTER_API_KEY)) return 'openrouter';
  if(ok(process.env.OPENAI_API_KEY)) return 'openai';
  return null;
}
function filterTasks(tasks, query){
  const q=String((query&& (query.q||query.search))||'').trim().toLowerCase();
  const status=String((query&&query.status)||'').trim().toLowerCase();
  const priority=String((query&&query.priority)||'').trim().toLowerCase();
  return tasks.filter(t=>{
    if(status && String(t.status||'').toLowerCase()!==status) return false;
    if(priority && String(t.priority||'').toLowerCase()!==priority) return false;
    if(q){ const hay=[t.title,t.description,t.status,t.priority,...(t.tags||[])].join(' ').toLowerCase(); if(!hay.includes(q)) return false; }
    return true;
  });
}
function esc(v){ const s=String(v==null?'':(Array.isArray(v)?v.join(';'):v)); return /[",\n]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s; }
function toCSV(tasks){
  const head=['id','title','description','status','priority','tags','createdAt','updatedAt'];
  return [head.join(','), ...tasks.map(t=>head.map(h=>esc(t[h])).join(','))].join('\n')+'\n';
}
function buildAiResult(feature, tasks){
  const total=tasks.length;
  const open=tasks.filter(t=>String(t.status).toLowerCase()!=='done').length;
  const done=tasks.filter(t=>String(t.status).toLowerCase()==='done').length;
  const high=tasks.filter(t=>String(t.priority).toLowerCase()==='high').length;
  const titles=tasks.slice(0,10).map(t=>t.title);
  const sections=[
    {title:'Overview', items: total? [`${total} record(s) reviewed for ${DOMAIN.label}.`, `${open} open, ${done} done, ${high} high-priority.`] : []},
    {title:'Records', items: titles},
    {title:'Next actions', items: total? tasks.filter(t=>String(t.status).toLowerCase()!=='done').slice(0,5).map(t=>`${feature.actionPrefix}: ${t.title}`) : []},
  ];
  return { feature: feature.id, domain: DOMAIN.id, aiGenerated:false, provider:'deterministic-fallback',
    label:'Deterministic fallback — no AI provider configured (OPENROUTER_API_KEY/OPENAI_API_KEY not set)',
    summary: total? `${feature.title}: reviewed ${total} own record(s); ${open} open.` : `${feature.title}: no records yet.`,
    sections, counts:{total, open, done, high}, records: titles };
}
async function tryProvider(feature, tasks, provider){
  const isOR=provider==='openrouter';
  const url=isOR ? `${String(process.env.OPENROUTER_BASE_URL||'https://openrouter.ai/api/v1').replace(/\/$/,'')}/chat/completions`
                 : `${String(process.env.OPENAI_BASE_URL||'https://api.openai.com/v1').replace(/\/$/,'')}/chat/completions`;
  const key=isOR?process.env.OPENROUTER_API_KEY:process.env.OPENAI_API_KEY;
  const model=isOR?(process.env.OPENROUTER_MODEL||'openai/gpt-4o-mini'):(process.env.OPENAI_MODEL||'gpt-4o-mini');
  const ctrl=new AbortController(); const timer=setTimeout(()=>ctrl.abort(),8000);
  try{
    const r=await fetch(url,{method:'POST',signal:ctrl.signal,headers:{'Content-Type':'application/json',Authorization:`Bearer ${key}`},
      body:JSON.stringify({model,max_tokens:600,messages:[{role:'system',content:`You are a ${DOMAIN.label} assistant. Be concise.`},{role:'user',content:`${feature.title} over these records: ${JSON.stringify(tasks.slice(0,20))}`}]})});
    if(!r.ok) return null;
    const data=await r.json(); const text=data.choices&&data.choices[0]&&data.choices[0].message&&data.choices[0].message.content;
    if(!text) return null;
    const base=buildAiResult(feature,tasks);
    return {...base, aiGenerated:true, provider, label:`AI-generated via ${provider}`, summary:String(text).slice(0,2000),
      sections:[{title:'Provider response', items:[String(text).slice(0,2000)]}, ...base.sections]};
  }catch{ return null; } finally{ clearTimeout(timer); }
}
function createRouter(options){
  const opts=options||{};
  const auth=opts.authenticateToken||opts.auth;
  if(typeof auth!=='function') throw new Error('fpWave40: auth middleware required');
  const store=opts.store||new Map();
  const router=express.Router();
  const list=(req)=>{ const k=userKey(req); if(!store.has(k)) store.set(k,[]); return store.get(k); };
  router.get('/tasks', auth, (req,res)=>{ const all=filterTasks(list(req),req.query);
    const page=Math.max(1,parseInt(req.query.page)||1); const limit=Math.min(100,Math.max(1,parseInt(req.query.limit)||20));
    res.json({data:all.slice((page-1)*limit,page*limit), page, limit, total:all.length, totalPages:Math.ceil(all.length/limit)}); });
  router.post('/tasks', auth, (req,res)=>{ const title=String((req.body||{}).title||'').trim();
    if(!title) return res.status(400).json({error:'Title is required'});
    const now=new Date().toISOString();
    const task={id:crypto.randomUUID(), title, description:String(req.body.description||''), status:String(req.body.status||'todo'), priority:String(req.body.priority||'medium'), tags:Array.isArray(req.body.tags)?req.body.tags.map(String):[], createdAt:now, updatedAt:now};
    list(req).unshift(task); res.status(201).json(task); });
  const update=(req,res)=>{ const task=list(req).find(t=>String(t.id)===String(req.params.id));
    if(!task) return res.status(404).json({error:'Not found'});
    const b=req.body||{};
    if(b.title!==undefined){ if(!String(b.title).trim()) return res.status(400).json({error:'Title is required'}); task.title=String(b.title).trim(); }
    if(b.description!==undefined) task.description=String(b.description);
    if(b.status!==undefined) task.status=String(b.status);
    if(b.priority!==undefined) task.priority=String(b.priority);
    if(b.tags!==undefined) task.tags=Array.isArray(b.tags)?b.tags.map(String):[];
    task.updatedAt=new Date().toISOString(); res.json(task); };
  router.put('/tasks/:id', auth, update); router.patch('/tasks/:id', auth, update);
  const exportHandler=(req,res)=>{ const format=String(req.query.format||'json').toLowerCase(); const all=filterTasks(list(req),req.query);
    if(format==='csv'){ res.setHeader('Content-Type','text/csv'); res.setHeader('Content-Disposition','attachment; filename="tasks.csv"'); return res.send(toCSV(all)); }
    if(format==='json'){ res.setHeader('Content-Disposition','attachment; filename="tasks.json"'); return res.json({data:all,total:all.length}); }
    return res.status(400).json({error:'format must be csv or json'}); };
  router.get('/tasks/export', auth, exportHandler); router.get('/export', auth, exportHandler);
  router.get('/ai/features', auth, (_req,res)=>res.json({data:FEATURES.map(f=>({id:f.id,title:f.title})), aiGenerated:false}));
  for(const feature of FEATURES){
    router.post(`/ai/${feature.id}`, auth, async (req,res)=>{
      let tasks=list(req);
      if(req.body && Array.isArray(req.body.recordIds) && req.body.recordIds.length){ const ids=new Set(req.body.recordIds.map(String)); tasks=tasks.filter(t=>ids.has(String(t.id))); }
      const provider=hasProviderKey();
      if(provider){ const ai=await tryProvider(feature,tasks,provider); if(ai) return res.json(ai); }
      return res.json(buildAiResult(feature,tasks));
    });
  }
  return router;
}
module.exports=createRouter;
module.exports.createRouter=createRouter;
module.exports.filterTasks=filterTasks; module.exports.toCSV=toCSV; module.exports.buildAiResult=buildAiResult;
module.exports.FEATURES=FEATURES; module.exports.DOMAIN=DOMAIN; module.exports.hasProviderKey=hasProviderKey;
