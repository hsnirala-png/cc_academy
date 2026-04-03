const fs = require('fs');
const path = require('path');

const debugPort = 9231;
const token = process.env.TEACHER_TOKEN;
const chapterId = process.env.TEACHER_CHAPTER_ID;
const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchJson(url, options, retries = 40) {
  for (let i = 0; i < retries; i += 1) {
    try {
      const response = await fetch(url, options);
      const text = await response.text();
      const data = text ? JSON.parse(text) : {};
      if (response.ok) return data;
      throw new Error(data?.message || text || response.statusText);
    } catch (error) {
      if (i === retries - 1) throw error;
      await delay(500);
    }
  }
}

(async () => {
  const targets = await fetchJson(`http://127.0.0.1:${debugPort}/json/list`, undefined, 50);
  const pageTarget = targets.find((target) => target.type === 'page');
  if (!pageTarget?.webSocketDebuggerUrl) {
    throw new Error('No page target found.');
  }

  const ws = new WebSocket(pageTarget.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.addEventListener('open', resolve, { once: true });
    ws.addEventListener('error', reject, { once: true });
  });

  let id = 0;
  const pending = new Map();
  const waiters = [];

  ws.addEventListener('message', (event) => {
    const message = JSON.parse(event.data);
    if (message.id && pending.has(message.id)) {
      const handler = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) handler.reject(new Error(message.error.message));
      else handler.resolve(message.result);
      return;
    }
    for (let i = 0; i < waiters.length; i += 1) {
      if (waiters[i].method === message.method) {
        const waiter = waiters.splice(i, 1)[0];
        waiter.resolve(message);
        break;
      }
    }
  });

  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const messageId = ++id;
      pending.set(messageId, { resolve, reject });
      ws.send(JSON.stringify({ id: messageId, method, params }));
    });

  const waitForEvent = (method, timeout = 20000) =>
    new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`Timed out ${method}`)), timeout);
      waiters.push({
        method,
        resolve: (message) => {
          clearTimeout(timer);
          resolve(message);
        },
      });
    });

  const evaluate = async (expression) => {
    const result = await send('Runtime.evaluate', {
      expression,
      awaitPromise: true,
      returnByValue: true,
    });
    return result.result.value;
  };

  const navigate = async (url) => {
    const load = waitForEvent('Page.loadEventFired', 30000);
    await send('Page.navigate', { url });
    await load;
    await delay(1500);
  };

  await send('Page.enable');
  await send('Runtime.enable');

  await navigate('http://localhost:3000/index.html');
  await evaluate(
    `localStorage.setItem('cc_token', ${JSON.stringify(token)}); localStorage.setItem('cc_user', ${JSON.stringify(
      process.env.TEACHER_USER_JSON
    )}); true;`
  );

  async function createSession(settings) {
    const payload = await fetchJson(`http://localhost:5000/student/tuition/chapters/${chapterId}/sessions`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        subject: settings.subject,
        topic: settings.topic,
        responseLanguage: settings.explain,
        explanationLanguage: settings.explain,
        boardLanguage: settings.board,
        voiceLanguage: settings.voice,
        teachingDepth: settings.depth,
        speedMode: 'NORMAL',
        difficultyMode: 'MEDIUM',
        curriculumBoard: 'CBSE',
        resume: false,
      }),
    });
    return payload.session.id;
  }

  async function runCase(name, settings, doubtText) {
    const sessionId = await createSession(settings);
    await navigate(`http://localhost:3000/tuition-teacher?chapterId=${chapterId}&sessionId=${sessionId}`);
    await delay(2500);
    await evaluate(`document.querySelector('#tuitionTeacherTeachBtn').click(); true;`);

    for (let i = 0; i < 80; i += 1) {
      const ready = await evaluate(
        `(() => document.querySelectorAll('.tuition-chat-message.is-assistant').length > 0 && document.querySelector('#tuitionTeacherBoardCanvasTitle')?.innerText.trim() !== 'Waiting for a teacher reply...')()`
      );
      if (ready) break;
      await delay(1000);
    }

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

    for (let i = 0; i < 80; i += 1) {
      const count = await evaluate(`document.querySelectorAll('.tuition-chat-message.is-assistant').length`);
      if (count >= 2) break;
      await delay(1000);
    }

    const doubtState = await evaluate(`(() => ({
      thread: [...document.querySelectorAll('.tuition-chat-message')].map(el => ({ role: el.classList.contains('is-assistant') ? 'teacher' : 'student', text: el.innerText.trim() })),
      boardTitle: document.querySelector('#tuitionTeacherBoardCanvasTitle')?.innerText.trim(),
      anchors: [...document.querySelectorAll('#tuitionTeacherBoardAnchors li')].map(el => el.innerText.trim()).filter(Boolean)
    }))()`);

    await evaluate(`document.querySelector('#tuitionTeacherQuickContinueBtn').click(); true;`);

    for (let i = 0; i < 80; i += 1) {
      const count = await evaluate(`document.querySelectorAll('.tuition-chat-message.is-assistant').length`);
      if (count >= 3) break;
      await delay(1000);
    }

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

    return { name, sessionId, screenshot, startState, doubtState, resumeState };
  }

  const results = [];
  results.push(
    await runCase(
      'chem-en-basic',
      { subject: 'Science', topic: 'Chemical Reaction', explain: 'ENGLISH', board: 'ENGLISH', voice: 'ENGLISH', depth: 'BASIC' },
      'Why do we call reactants and products different?'
    )
  );
  results.push(
    await runCase(
      'chem-hi-moderate',
      { subject: 'Science', topic: 'Chemical Reaction', explain: 'HINDI', board: 'HINDI', voice: 'HINDI', depth: 'MODERATE' },
      'अभिकारक और उत्पाद अलग क्यों कहे जाते हैं?'
    )
  );
  results.push(
    await runCase(
      'vachan-pa-basic',
      { subject: 'Punjabi Grammar', topic: 'ਵਚਨ', explain: 'PUNJABI', board: 'PUNJABI', voice: 'PUNJABI', depth: 'BASIC' },
      'ਇਕਵਚਨ ਤੇ ਬਹੁਵਚਨ ਵਿੱਚ ਫਰਕ ਕੀ ਹੈ?'
    )
  );

  console.log(JSON.stringify(results, null, 2));
  ws.close();
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
