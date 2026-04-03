const fs = require('fs');
const path = require('path');
const cp = require('child_process');

const chromePath = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const debugPort = 9224;
const userDataDir = 'D:/cc_academy/.tmp-chrome-ai-teacher';
const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJjbWxuOHduczgwMDAwdHN2MDMwZG9jMWRlIiwicm9sZSI6IlNUVURFTlQiLCJpYXQiOjE3NzUxODY3OTksImV4cCI6MTc3NTc5MTU5OX0.wLuMgd8GNWCqCit_uQ1XKGUpfAU8f-cEPH0w895oM58';
const user = { id:'cmln8wns80000tsv030doc1de', name:'Harvinder Singh', mobile:'7009416404', role:'STUDENT' };
const chapterId = 'cmmthte2y0019ts7g4hmypaly';

fs.rmSync(userDataDir, { recursive: true, force: true });
function delay(ms){ return new Promise(r=>setTimeout(r,ms)); }
async function fetchJson(url, retries=40){ for(let i=0;i<retries;i++){ try{ const r=await fetch(url); if(r.ok) return r.json(); }catch{} await delay(500);} throw new Error('Unable to fetch '+url); }

(async()=>{
 const chrome = cp.spawn(chromePath,[`--remote-debugging-port=${debugPort}`,`--user-data-dir=${userDataDir}`,'--headless=new','--disable-gpu','--no-first-run','--no-default-browser-check','about:blank'],{stdio:'ignore'});
 const cleanup=()=>{ try{chrome.kill('SIGKILL');}catch{} };
 try{
  const targets = await fetchJson(`http://127.0.0.1:${debugPort}/json/list`);
  const pageTarget = targets.find(t => t.type === 'page');
  if(!pageTarget?.webSocketDebuggerUrl) throw new Error('No page target found');
  const ws = new WebSocket(pageTarget.webSocketDebuggerUrl);
  await new Promise((resolve,reject)=>{ ws.addEventListener('open',resolve,{once:true}); ws.addEventListener('error',reject,{once:true}); });
  let id=0; const pending=new Map(); const waiters=[];
  ws.addEventListener('message',(event)=>{
    const msg=JSON.parse(event.data);
    if(msg.id && pending.has(msg.id)){ const p=pending.get(msg.id); pending.delete(msg.id); msg.error ? p.reject(new Error(msg.error.message)) : p.resolve(msg.result); return; }
    for(let i=0;i<waiters.length;i++){ if(waiters[i].method===msg.method){ const w=waiters.splice(i,1)[0]; w.resolve(msg); break; } }
  });
  const send=(method,params={})=>new Promise((resolve,reject)=>{ const mid=++id; pending.set(mid,{resolve,reject}); ws.send(JSON.stringify({id:mid,method,params})); });
  const waitForEvent=(method,timeout=20000)=>new Promise((resolve,reject)=>{ const timer=setTimeout(()=>reject(new Error('Timed out '+method)),timeout); waiters.push({method,resolve:(msg)=>{clearTimeout(timer); resolve(msg);}}); });
  const evaluate=async(expression)=>{ const result=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true}); return result.result.value; };
  const navigate=async(url)=>{ const load=waitForEvent('Page.loadEventFired',30000); await send('Page.navigate',{url}); await load; await delay(1500); };

  await send('Page.enable');
  await send('Runtime.enable');

  await navigate('http://localhost:3000/index.html');
  await evaluate(`localStorage.setItem('cc_token', ${JSON.stringify(token)}); localStorage.setItem('cc_user', ${JSON.stringify(JSON.stringify(user))}); true;`);

  async function runCase(name, settings, doubtText) {
    await navigate(`http://localhost:3000/tuition-teacher?chapterId=${chapterId}`);
    await evaluate(`(() => {
      const setValue = (selector, value) => {
        const el = document.querySelector(selector);
        if (!el) throw new Error('Missing ' + selector);
        el.value = value;
        el.dispatchEvent(new Event('change', { bubbles: true }));
        el.dispatchEvent(new Event('input', { bubbles: true }));
      };
      setValue('#tuitionTeacherSubject', ${JSON.stringify(settings.subject)});
      setValue('#tuitionTeacherTopic', ${JSON.stringify(settings.topic)});
      setValue('#tuitionTeacherExplanationLanguage', ${JSON.stringify(settings.explain)});
      setValue('#tuitionTeacherBoardLanguage', ${JSON.stringify(settings.board)});
      setValue('#tuitionTeacherVoiceLanguage', ${JSON.stringify(settings.voice)});
      setValue('#tuitionTeacherTeachingDepth', ${JSON.stringify(settings.depth)});
      document.querySelector('#tuitionTeacherTeachBtn').click();
      return true;
    })()`);
    for(let i=0;i<80;i++){ const ready=await evaluate(`(() => document.querySelectorAll('.tuition-chat-message.is-assistant').length > 0)()`); if(ready) break; await delay(1000);}    
    const startState = await evaluate(`(() => ({
      title: document.querySelector('#tuitionTeacherTitle')?.innerText.trim(),
      thread: [...document.querySelectorAll('.tuition-chat-message')].map(el => ({ role: el.classList.contains('is-assistant') ? 'teacher' : 'student', text: el.innerText.trim() })),
      questionVisible: !!document.querySelector('#tuitionTeacherQuestionInput'),
      boardTitle: document.querySelector('#tuitionTeacherBoardCanvasTitle')?.innerText.trim(),
      anchors: [...document.querySelectorAll('#tuitionTeacherBoardAnchors li')].map(el => el.innerText.trim()).filter(Boolean),
      formula: document.querySelector('#tuitionTeacherBoardFormula')?.innerText.trim() || '',
      example: document.querySelector('#tuitionTeacherBoardExampleLine')?.innerText.trim() || '',
      languageChips: [...document.querySelectorAll('#tuitionTeacherBoardMeta .tuition-chip')].map(el => el.innerText.trim())
    }))()`);

    await evaluate(`(() => {
      const input = document.querySelector('#tuitionTeacherQuestionInput');
      input.value = ${JSON.stringify(doubtText)};
      input.dispatchEvent(new Event('input', { bubbles: true }));
      document.querySelector('#tuitionTeacherAskBtn').click();
      return true;
    })()`);
    for(let i=0;i<80;i++){ const count=await evaluate(`document.querySelectorAll('.tuition-chat-message.is-assistant').length`); if(count >= 2) break; await delay(1000);}    
    const doubtState = await evaluate(`(() => ({
      thread: [...document.querySelectorAll('.tuition-chat-message')].map(el => ({ role: el.classList.contains('is-assistant') ? 'teacher' : 'student', text: el.innerText.trim() })),
      boardTitle: document.querySelector('#tuitionTeacherBoardCanvasTitle')?.innerText.trim(),
      anchors: [...document.querySelectorAll('#tuitionTeacherBoardAnchors li')].map(el => el.innerText.trim()).filter(Boolean)
    }))()`);

    await evaluate(`document.querySelector('#tuitionTeacherQuickContinueBtn').click(); true;`);
    for(let i=0;i<80;i++){ const count=await evaluate(`document.querySelectorAll('.tuition-chat-message.is-assistant').length`); if(count >= 3) break; await delay(1000);}    
    const resumeState = await evaluate(`(() => ({
      thread: [...document.querySelectorAll('.tuition-chat-message')].map(el => ({ role: el.classList.contains('is-assistant') ? 'teacher' : 'student', text: el.innerText.trim() })),
      boardTitle: document.querySelector('#tuitionTeacherBoardCanvasTitle')?.innerText.trim(),
      anchors: [...document.querySelectorAll('#tuitionTeacherBoardAnchors li')].map(el => el.innerText.trim()).filter(Boolean),
      formula: document.querySelector('#tuitionTeacherBoardFormula')?.innerText.trim() || '',
      example: document.querySelector('#tuitionTeacherBoardExampleLine')?.innerText.trim() || ''
    }))()`);

    const screenshot = path.join('D:/cc_academy', `browser-${name}.png`);
    const shot = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(screenshot, Buffer.from(shot.data, 'base64'));
    return { name, screenshot, startState, doubtState, resumeState };
  }

  const results=[];
  results.push(await runCase('chem-en-basic',{subject:'Science',topic:'Chemical Reaction',explain:'ENGLISH',board:'ENGLISH',voice:'ENGLISH',depth:'BASIC'},'Why do we call reactants and products different?'));
  results.push(await runCase('chem-hi-moderate',{subject:'Science',topic:'Chemical Reaction',explain:'HINDI',board:'HINDI',voice:'HINDI',depth:'MODERATE'},'अभिकारक और उत्पाद अलग क्यों कहे जाते हैं?'));
  results.push(await runCase('vachan-pa-basic',{subject:'Punjabi Grammar',topic:'ਵਚਨ',explain:'PUNJABI',board:'PUNJABI',voice:'PUNJABI',depth:'BASIC'},'ਇਕਵਚਨ ਤੇ ਬਹੁਵਚਨ ਵਿੱਚ ਫਰਕ ਕੀ ਹੈ?'));

  console.log(JSON.stringify(results,null,2));
  ws.close();
  cleanup();
 } catch (error) { cleanup(); console.error(error); process.exit(1); }
})();
