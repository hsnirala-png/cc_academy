const cp = require("child_process");

const chromePath = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const debugPort = 9281;
const userDataDir = `D:/cc_academy/.tmp-chrome-tuition-filter-${Date.now()}`;
const token =
  process.env.TEACHER_TOKEN ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJjbWxuOHduczgwMDAwdHN2MDMwZG9jMWRlIiwicm9sZSI6IlNUVURFTlQiLCJpYXQiOjE3NzUxODY3OTksImV4cCI6MTc3NTc5MTU5OX0.wLuMgd8GNWCqCit_uQ1XKGUpfAU8f-cEPH0w895oM58";
const user = {
  id: "cmln8wns80000tsv030doc1de",
  name: "Harvinder Singh",
  mobile: "7009416404",
  role: "STUDENT",
};
const chapterId = process.env.TEACHER_CHAPTER_ID || "cmmthte2y0019ts7g4hmypaly";

const cases = [
  {
    name: "Hindi Moderate",
    topic: "Chemical Reaction",
    explain: "HINDI",
    board: "HINDI",
    voice: "HINDI",
    depth: "MODERATE",
    expectScript: /[\u0900-\u097F]/,
  },
  {
    name: "Punjabi Basic",
    topic: "Chemical Reaction",
    explain: "PUNJABI",
    board: "PUNJABI",
    voice: "PUNJABI",
    depth: "BASIC",
    expectScript: /[\u0A00-\u0A7F]/,
  },
];

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchJson(url, retries = 50) {
  for (let attempt = 0; attempt < retries; attempt += 1) {
    try {
      const response = await fetch(url);
      return await response.json();
    } catch (error) {
      if (attempt === retries - 1) throw error;
      await delay(300);
    }
  }
  throw new Error("Unable to fetch JSON.");
}

async function launchBrowser() {
  const chrome = cp.spawn(
    chromePath,
    [
      `--remote-debugging-port=${debugPort}`,
      `--user-data-dir=${userDataDir}`,
      "--headless=new",
      "--disable-gpu",
      "--autoplay-policy=no-user-gesture-required",
      "--no-first-run",
      "--no-default-browser-check",
      "about:blank",
    ],
    { stdio: "ignore" }
  );

  const targets = await fetchJson(`http://127.0.0.1:${debugPort}/json/list`);
  const pageTarget = targets.find((target) => target.type === "page");
  if (!pageTarget?.webSocketDebuggerUrl) {
    throw new Error("No page target available.");
  }

  const ws = new WebSocket(pageTarget.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.addEventListener("open", resolve, { once: true });
    ws.addEventListener("error", reject, { once: true });
  });

  let commandId = 0;
  const pending = new Map();
  const waiters = [];

  ws.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    if (message.id && pending.has(message.id)) {
      const handler = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) handler.reject(new Error(message.error.message));
      else handler.resolve(message.result);
      return;
    }
    for (let index = 0; index < waiters.length; index += 1) {
      if (waiters[index].method === message.method) {
        const waiter = waiters.splice(index, 1)[0];
        waiter.resolve(message);
        break;
      }
    }
  });

  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const id = ++commandId;
      pending.set(id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params }));
    });

  const waitForEvent = (method, timeout = 30000) =>
    new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`Timed out waiting for ${method}`)), timeout);
      waiters.push({
        method,
        resolve: (message) => {
          clearTimeout(timer);
          resolve(message);
        },
      });
    });

  await send("Page.enable");
  await send("Runtime.enable");
  await send("Emulation.setDeviceMetricsOverride", {
    width: 1440,
    height: 1400,
    deviceScaleFactor: 1,
    mobile: false,
  });

  const evaluate = async (expression) => {
    const result = await send("Runtime.evaluate", {
      expression,
      awaitPromise: true,
      returnByValue: true,
    });
    return result.result.value;
  };

  const waitFor = async (predicate, timeout = 30000, interval = 250) => {
    const startedAt = Date.now();
    while (Date.now() - startedAt < timeout) {
      if (await evaluate(predicate)) return true;
      await delay(interval);
    }
    return false;
  };

  const navigate = async (url) => {
    const load = waitForEvent("Page.loadEventFired", 30000);
    await send("Page.navigate", { url });
    await load;
    await delay(1400);
  };

  const cleanup = () => {
    try {
      ws.close();
    } catch {}
    try {
      chrome.kill("SIGKILL");
    } catch {}
  };

  return { evaluate, waitFor, navigate, cleanup };
}

async function runCase(browser, item) {
  await browser.navigate("http://localhost:3000/index.html");
  await browser.evaluate(
    `localStorage.setItem('cc_token', ${JSON.stringify(token)}); localStorage.setItem('cc_user', JSON.stringify(${JSON.stringify(
      user
    )})); true;`
  );
  await browser.navigate(`http://localhost:3000/tuition-teacher?chapterId=${encodeURIComponent(chapterId)}`);
  await browser.waitFor(`(() => {
    const button = document.querySelector('#tuitionTeacherTeachBtn');
    const status = document.querySelector('#tuitionTeacherStatus')?.innerText.trim() || '';
    const label = document.querySelector('#tuitionTeacherSessionLabel')?.innerText.trim() || '';
    return !!button && !/Creating or resuming|Opening tuition teacher|Preparing session/i.test(status + ' ' + label);
  })()`, 40000, 300);

  await browser.evaluate(`(() => {
    const oldFetch = window.fetch.bind(window);
    window.__filterProbe = { messages: [], speechTrack: [] };
    window.fetch = async (...args) => {
      const response = await oldFetch(...args);
      const url =
        typeof args?.[0] === 'string'
          ? args[0]
          : String(args?.[0]?.url || '');
      if (url.includes('/messages')) {
        const clone = response.clone();
        let payload = null;
        try { payload = await clone.json(); } catch {}
        window.__filterProbe.messages.push({
          status: response.status,
          explanationLanguage: payload?.assistantMessage?.structured?.explanationLanguage || payload?.session?.teacherContext?.explanationLanguage || null,
          boardLanguage: payload?.assistantMessage?.structured?.boardLanguage || payload?.session?.teacherContext?.boardLanguage || null,
          voiceLanguage: payload?.assistantMessage?.structured?.voiceLanguage || payload?.session?.teacherContext?.voiceLanguage || null,
          teachingDepth: payload?.assistantMessage?.structured?.teachingDepth || payload?.session?.teacherContext?.teachingDepth || null,
          teacherExplanation: payload?.assistantMessage?.structured?.teacherExplanation || ''
        });
      }
      if (url.includes('/speech-track')) {
        const clone = response.clone();
        let payload = null;
        try { payload = await clone.json(); } catch {}
        window.__filterProbe.speechTrack.push({
          status: response.status,
          engine: payload?.speechTrack?.engine || null,
          syncType: payload?.speechTrack?.syncType || null,
          wordCount: Array.isArray(payload?.speechTrack?.words) ? payload.speechTrack.words.length : 0,
          hasAudioBase64: Boolean(payload?.speechTrack?.audioBase64)
        });
      }
      return response;
    };
    document.querySelector('#tuitionTeacherTopic').value = ${JSON.stringify(item.topic)};
    const applySelect = (selector, value) => {
      const el = document.querySelector(selector);
      if (!el) return;
      el.value = value;
      el.dispatchEvent(new Event('change', { bubbles: true }));
    };
    applySelect('#tuitionTeacherExplanationLanguage', ${JSON.stringify(item.explain)});
    applySelect('#tuitionTeacherBoardLanguage', ${JSON.stringify(item.board)});
    applySelect('#tuitionTeacherVoiceLanguage', ${JSON.stringify(item.voice)});
    applySelect('#tuitionTeacherTeachingDepth', ${JSON.stringify(item.depth)});
    return true;
  })()`);

  await browser.evaluate(`document.querySelector('#tuitionTeacherTeachBtn').click(); true;`);

  const gotMessage = await browser.waitFor(`(() => (window.__filterProbe?.messages?.length || 0) >= 1)()`, 40000, 300);
  const gotAudio = await browser.waitFor(
    `(() => !!document.querySelector('#tuitionTeacherStageAudio')?.getAttribute('src') && (document.querySelector('#tuitionTeacherStageAudio')?.currentTime || 0) > 0)()`,
    40000,
    300
  );
  const gotLocalizedTeaching = await browser.waitFor(
    `(() => {
      const narration = document.querySelector('#tuitionTeacherNarrationText')?.innerText.trim() || '';
      const concept = document.querySelector('#tuitionTeacherBoardCurrentConcept')?.innerText.trim() || '';
      return ${item.expectScript}.test(narration + ' ' + concept);
    })()`,
    40000,
    300
  );
  await delay(1800);

  const sample = await browser.evaluate(`(() => ({
    selectedExplain: document.querySelector('#tuitionTeacherExplanationLanguage')?.value || '',
    selectedBoard: document.querySelector('#tuitionTeacherBoardLanguage')?.value || '',
    selectedVoice: document.querySelector('#tuitionTeacherVoiceLanguage')?.value || '',
    selectedDepth: document.querySelector('#tuitionTeacherTeachingDepth')?.value || '',
    narrationText: document.querySelector('#tuitionTeacherNarrationText')?.innerText.trim() || '',
    currentConcept: document.querySelector('#tuitionTeacherBoardCurrentConcept')?.innerText.trim() || '',
    activeAnchor: document.querySelector('#tuitionTeacherBoardAnchors li.is-active-board-line')?.innerText.trim() || '',
    boardMeta: [...document.querySelectorAll('#tuitionTeacherBoardMeta .tuition-chip')].map((el) => el.innerText.trim()),
    sessionMeta: [...document.querySelectorAll('#tuitionTeacherSessionMeta .tuition-chip')].map((el) => el.innerText.trim()),
    probe: window.__filterProbe
  }))()`);

  return {
    name: item.name,
    gotMessage,
    gotAudio,
    gotLocalizedTeaching,
    sample,
    narrationMatches: item.expectScript.test(sample.narrationText),
    boardMatches: item.expectScript.test(`${sample.currentConcept} ${sample.activeAnchor}`),
  };
}

(async () => {
  const browser = await launchBrowser();
  try {
    const results = [];
    for (const item of cases) {
      results.push(await runCase(browser, item));
    }
    console.log(JSON.stringify(results, null, 2));
  } finally {
    browser.cleanup();
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
