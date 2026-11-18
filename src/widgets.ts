// Telegram bot widgets (https://core.telegram.org/bots/widgets): small HTML apps
// drawn inside a message. Limits: 4096 bytes after zlib, state strings up to 1024 bytes.
// They work in private chats with the bot; the bot falls back to buttons elsewhere.

import { BOT_ADCS, BOT_SUPPORTS } from "./data/champions.ts";
import { ADCS, SUPPORTS } from "./data/pool.ts";
import type { Pick } from "./engine/draft.ts";
import type { Game, Timer } from "./state.ts";
import { KEY_BY_LABEL, TIMERS } from "./timers.ts";

const CSS = `body{margin:0;padding:8px 10px;font:14px system-ui}button{border:0;border-radius:8px;padding:7px 2px;background:var(--tg-theme-secondary-bg-color);color:var(--tg-theme-text-color);font:12px system-ui}button.on{background:var(--tg-theme-button-color);color:var(--tg-theme-button-text-color)}.g{display:grid;gap:4px}.h{color:var(--tg-theme-hint-color);font-size:12px}`;

// Shared helpers: parse state, keep the newest revision, send a request on tap.
const JS_COMMON = `const W=window.TelegramWidget;let st={},busy=0,err='';function P(x){try{return JSON.parse(x)||{}}catch(e){return{}}}function take(n){if(n&&n.r&&(!st.r||n.r>=st.r))st=n}function q(d){if(!W||busy)return;busy=1;err='';draw();W.request(d).then(function(r){busy=0;take(P(r.result));after(d);draw()},function(e){busy=0;err=e&&e.code||'error';draw()})}if(W){take(P(W.chatData));W.onEvent('chatDataChanged',function(){take(P(W.chatData));draw()})}`;

const list = (a: string[]) => JSON.stringify(a);

export const DRAFT_HTML = `<style>${CSS}.t{display:flex;gap:4px;margin:6px 0}.t button{flex:1}.p{margin:6px 0;padding:6px 8px;border-radius:8px;background:var(--tg-theme-secondary-bg-color)}.p button{background:var(--tg-theme-button-color);color:var(--tg-theme-button-text-color);padding:5px 10px;margin-top:4px}</style><div id=h class=h></div><div class=t id=t></div><div id=c></div><script>const A=${list(BOT_ADCS)},S=${list(BOT_SUPPORTS)},OS=${list(SUPPORTS)},OA=${list(ADCS)};let tab=0;${JS_COMMON}function after(d){const k=d.slice(0,2);if(k=='ea')tab=1;else if(k=='es')tab=2;else if(k=='rs')tab=0}function b(t,d,on){return'<button'+(on?' class=on':'')+' onclick="q(\\''+d+'\\')">'+t+'</button>'}function grid(n,arr,k,cur){let s='<div class=g style="grid-template-columns:repeat('+n+',1fr)">';arr.forEach(function(x,i){s+=b(x,k+i,cur===i)});return s+'</div>'}function draw(){const l=st.l||[-1,-1];document.getElementById('h').innerHTML=(busy?'…':err?'⚠ '+err:(st.a>=0||st.s>=0?'vs '+[A[st.a],S[st.s]].filter(Boolean).join(' + '):'Pick the enemy bot lane')+(l[0]>=0||l[1]>=0?' · us: '+[OS[l[0]],OA[l[1]]].filter(Boolean).join(' + '):''));document.getElementById('t').innerHTML=['Enemy ADC','Enemy Sup','Our duo'].map(function(x,i){return'<button'+(tab==i?' class=on':'')+' onclick="tab='+i+';draw()">'+x+'</button>'}).join('');let c='';if(tab==0)c=grid(4,A,'ea:',st.a)+'<p>'+b('Unknown','ea:x')+'</p>';else if(tab==1)c=grid(4,S,'es:',st.s)+'<p>'+b('Unknown','es:x')+'</p>';else{(st.p||[]).forEach(function(p,i){c+='<div class=p><b>'+['🥇','🥈','🥉'][i]+' '+OS[p[0]]+' + '+OA[p[1]]+'</b> <span class=h>'+p[2]+'</span><div class=h>'+p[3]+'</div>'+b('🔒 Lock','lk:'+p[0]+':'+p[1])+'</div>'});c+='<div class=h>Or lock one by one:</div>'+grid(3,OS,'ls:',l[0])+'<div style=height:4px></div>'+grid(3,OA,'la:',l[1])+'<p>'+b('🎮 New game','rs')+'</p>'}document.getElementById('c').innerHTML=c}if(st.a>=0&&st.s>=0)tab=2;else if(st.a>=0)tab=1;draw()</script>`;

export const TIMER_HTML = `<style>${CSS}.g{grid-template-columns:repeat(3,1fr)}.g button{padding:10px 2px}.g b{display:block;font-size:16px}.f{display:flex;justify-content:space-between;align-items:center;margin-top:6px}</style><div class=h>Tap when you see an enemy spell used. I'll message when it's back.</div><div class=g id=g style=margin-top:6px></div><div class=f><span id=m class=h></span><button onclick="q('tm:clear')">Clear all</button></div><script>const K=${JSON.stringify(TIMERS.map(([k, l]) => [k, l]))};${JS_COMMON}function after(){}function draw(){const now=Date.now();let s='';K.forEach(function(k){const t=(st.t||[]).find(function(x){return x[0]==k[0]});const left=t?Math.ceil((t[1]-now)/1000):0;s+='<button'+(left>0?' class=on':'')+' onclick="q(\\'tm:'+k[0]+'\\')">'+k[1]+(left>0?'<b>'+Math.floor(left/60)+':'+('0'+left%60).slice(-2)+'</b>':'<b>·</b>')+'</button>'});document.getElementById('g').innerHTML=s;document.getElementById('m').textContent=busy?'…':err?'⚠ '+err:''}setInterval(draw,1000);draw()</script>`;

function cut(s: string, n: number): string {
  return s.length > n ? `${s.slice(0, n - 1)}…` : s;
}

export function draftState(g: Game, picks: Pick[], rev: number): string {
  const state = {
    r: rev,
    a: g.eAdc ? BOT_ADCS.indexOf(g.eAdc) : -1,
    s: g.eSup ? BOT_SUPPORTS.indexOf(g.eSup) : -1,
    l: [g.sup ? SUPPORTS.indexOf(g.sup) : -1, g.adc ? ADCS.indexOf(g.adc) : -1],
    p: picks.slice(0, 3).map((p) => [SUPPORTS.indexOf(p.sup), ADCS.indexOf(p.adc), p.score, cut((p.warnings[0] ? `⚠ ${p.warnings[0]}` : p.reasons[1] ?? p.reasons[0]).replace(/'/g, "’").replace(/[<>&"]/g, ""), 90)]),
  };
  let out = JSON.stringify(state);
  // Stay under Telegram's 1024-byte state limit.
  while (new TextEncoder().encode(out).length > 1024 && state.p.length) {
    state.p.pop();
    out = JSON.stringify(state);
  }
  return out;
}

export function timerState(timers: Timer[], rev: number): string {
  return JSON.stringify({ r: rev, t: timers.map((t) => [KEY_BY_LABEL.get(t.label) ?? t.label, t.due]) });
}
