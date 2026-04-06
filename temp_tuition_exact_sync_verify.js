const cp = require("child_process");
const fs = require("fs");

const chromePath = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const debugPort = 9264;
const userDataDir = `D:/cc_academy/.tmp-chrome-tuition-exact-sync-${Date.now()}`;
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
const headers = {
  Authorization: `Bearer ${token}`,
  "Content-Type": "application/json",
};

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchJson(url, options, retries = 40) {
  for (let index = 0; index < retries; index += 1) {
    try {
      const response = await fetch(url, options);
      const text = await response.text();
      const data = text ? JSON.parse(text) : {};
      if (response.ok) return data;
      const error = new Error(data?.message || text || response.statusText);
      error.status = response.status;
      error.payload = data;
      throw error;
    } catch (error) {
      if (index === retries - 1) throw error;
      await delay(400);
    }
  }
  throw new Error("Unreachable fetch retry path.");
}

const normalizeSpeechText = (value) => String(value || "").replace(/\s+/g, " ").trim();

const normalizeWordToken = (value) =>
  String(value || "")
    .normalize("NFC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "")
    .trim();

const splitSpeechUnits = (text) =>
  normalizeSpeechText(text)
    .split(/(?<=[.!?।॥])\s+|(?<=,)\s+|(?<=;)\s+/u)
    .map((item) => normalizeSpeechText(item))
    .filter(Boolean);

const getSpeechStopwords = (languageCode) => {
  const normalizedLanguage = String(languageCode || "").trim().toUpperCase();
  if (normalizedLanguage === "HINDI") {
    return new Set(["और", "या", "का", "की", "के", "है", "हैं", "में", "से", "पर", "को", "एक"]);
  }
  if (normalizedLanguage === "PUNJABI") {
    return new Set(["ਅਤੇ", "ਜਾਂ", "ਦਾ", "ਦੀ", "ਦੇ", "ਹੈ", "ਹਨ", "ਵਿੱਚ", "ਤੋਂ", "ਤੇ", "ਨੂੰ", "ਕੀ", "ਇੱਕ"]);
  }
  return new Set(["and", "or", "the", "a", "an", "to", "of", "for", "with", "into", "in"]);
};

const tokenizeSourceWords = (text) =>
  normalizeSpeechText(text)
    .split(/\s+/u)
    .map((word) => ({
      raw: String(word || "").trim(),
      norm: normalizeWordToken(word),
    }))
    .filter((word) => Boolean(word.raw) && Boolean(word.norm));

const alignTimedWordsSequentially = (timedWords, texts) => {
  const safeWords = Array.isArray(timedWords) ? timedWords : [];
  let cursor = 0;
  return (Array.isArray(texts) ? texts : []).map((text) => {
    const tokens = tokenizeSourceWords(text);
    const matched = [];
    tokens.forEach((token) => {
      while (cursor < safeWords.length) {
        const candidate = safeWords[cursor];
        cursor += 1;
        if (normalizeWordToken(candidate?.text) !== token.norm) continue;
        matched.push({
          startMs: Number(candidate?.startMs || 0),
          endMs: Number(candidate?.endMs || 0),
          text: token.raw,
        });
        break;
      }
    });
    return matched.filter((word) => word.endMs > word.startMs);
  });
};

const alignTimedWordsBySegments = (timedWords, segments) =>
  (Array.isArray(segments) ? segments : []).map((segment) =>
    (Array.isArray(timedWords) ? timedWords : []).filter((word) => {
      const startMs = Number(word?.startMs || 0);
      const endMs = Number(word?.endMs || 0);
      return (
        endMs > startMs &&
        startMs >= Number(segment?.startMs || 0) &&
        endMs <= Number(segment?.endMs || 0)
      );
    })
  );

const buildExactTimelineWords = (timedWords, sourceText) => {
  return (Array.isArray(timedWords) ? timedWords : [])
    .map((word) => ({
      startMs: Number(word?.startMs || 0),
      endMs: Number(word?.endMs || 0),
      text: String(word?.text || "").trim(),
    }))
    .filter((word) => word.endMs > word.startMs && word.text);
};

const buildExactBoardPlan = (assistant, speechTrack, languageCode) => {
  const fullText = normalizeSpeechText(
    speechTrack?.sourceText || assistant?.teacherExplanation || assistant?.teacherIntro || ""
  );
  const timelineWords = buildExactTimelineWords(speechTrack?.words || [], fullText);
  return { timelineWords, fullText, languageCode };
};

const renderTextFromExactWords = (words, currentMs) =>
  (Array.isArray(words) ? words : [])
    .filter((word) => Number(word?.startMs || 0) <= currentMs)
    .map((word) => String(word?.text || "").trim())
    .filter(Boolean)
    .join(" ")
    .trim();

const expectedTranscriptAt = (boardPlan, currentMs) =>
  renderTextFromExactWords(Array.isArray(boardPlan?.timelineWords) ? boardPlan.timelineWords : [], currentMs);

async function createSessionAndStart(settings) {
  const sessionPayload = await fetchJson(`http://localhost:5000/student/tuition/chapters/${chapterId}/sessions`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      subject: settings.subject,
      topic: settings.topic,
      responseLanguage: settings.explain,
      explanationLanguage: settings.explain,
      boardLanguage: settings.board,
      voiceLanguage: settings.voice,
      teachingDepth: settings.depth,
      speedMode: "NORMAL",
      difficultyMode: "MEDIUM",
      curriculumBoard: "CBSE",
      resume: false,
    }),
  });

  const sessionId = sessionPayload.session.id;
  const messagePayload = await fetchJson(
    `http://localhost:5000/student/tuition/chapters/${chapterId}/sessions/${sessionId}/messages`,
    {
      method: "POST",
      headers,
      body: JSON.stringify({
        content: "__START_TUITION_AI_TEACHER__",
        subject: settings.subject,
        topic: settings.topic,
        responseLanguage: settings.explain,
        explanationLanguage: settings.explain,
        boardLanguage: settings.board,
        voiceLanguage: settings.voice,
        teachingDepth: settings.depth,
        speedMode: "NORMAL",
        difficultyMode: "MEDIUM",
        curriculumBoard: "CBSE",
        resume: true,
      }),
    }
  );

  return {
    sessionId,
    assistantMessage: messagePayload.assistantMessage,
  };
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

  const targets = await fetchJson(`http://127.0.0.1:${debugPort}/json/list`, undefined, 50);
  const pageTarget = targets.find((target) => target.type === "page");
  if (!pageTarget?.webSocketDebuggerUrl) {
    throw new Error("No browser page target was available for exact sync verification.");
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

  const waitForEvent = (method, timeout = 20000) =>
    new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`Timed out waiting for ${method}.`)), timeout);
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

  const navigate = async (url) => {
    const load = waitForEvent("Page.loadEventFired", 30000);
    await send("Page.navigate", { url });
    await load;
    await delay(1500);
  };

  const waitFor = async (predicate, timeout = 25000, interval = 250) => {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      if (await evaluate(predicate)) return true;
      await delay(interval);
    }
    return false;
  };

  const cleanup = () => {
    try {
      ws.close();
    } catch {}
    try {
      chrome.kill("SIGKILL");
    } catch {}
  };

  return { evaluate, navigate, waitFor, cleanup };
}

async function verifyBrowserCase(browser, caseConfig, assistantMessage, speechTrack) {
  const assistant = assistantMessage.structured;
  const boardPlan = buildExactBoardPlan(assistant, speechTrack, caseConfig.settings.board);

  await browser.navigate("http://localhost:3000/index.html");
  await browser.evaluate(
    `localStorage.setItem('cc_token', ${JSON.stringify(token)}); localStorage.setItem('cc_user', JSON.stringify(${JSON.stringify(
      user
    )})); true;`
  );

  await browser.navigate(
    `http://localhost:3000/tuition-teacher?chapterId=${encodeURIComponent(chapterId)}&sessionId=${encodeURIComponent(
      assistantMessage.sessionId || ""
    )}`
  );

  await browser.evaluate(`(() => {
    const oldFetch = window.fetch.bind(window);
    window.__syncProbe = { calls: [] };
    window.fetch = async (...args) => {
      const response = await oldFetch(...args);
      const url = String(args?.[0] || "");
      if (url.includes("/speech-track")) {
        const clone = response.clone();
        let payload = null;
        try { payload = await clone.json(); } catch {}
        window.__syncProbe.calls.push({
          url,
          status: response.status,
          engine: payload?.speechTrack?.engine || null,
          syncType: payload?.speechTrack?.syncType || null,
          wordCount: Array.isArray(payload?.speechTrack?.words) ? payload.speechTrack.words.length : 0,
          hasAudioBase64: Boolean(payload?.speechTrack?.audioBase64)
        });
      }
      return response;
    };
    return true;
  })()`);

  const loaded = await browser.waitFor(
    `(() => {
      const title = document.querySelector('#tuitionTeacherTitle')?.innerText.trim() || '';
      const board = document.querySelector('#tuitionTeacherWhiteboardSurface');
      const narration = document.querySelector('#tuitionTeacherNarrationText');
      return !!board && !!narration && title === ${JSON.stringify(caseConfig.settings.topic)};
    })()`,
    20000,
    300
  );

  if (!loaded) {
    throw new Error(`The tuition page did not isolate the requested topic: ${caseConfig.settings.topic}`);
  }

  const layoutSample = await browser.evaluate(`(() => {
    const board = document.querySelector('#tuitionTeacherWhiteboardSurface');
    const side = document.querySelector('.tuition-teacher-stage-side');
    const narration = document.querySelector('#tuitionTeacherNarrationText');
    const chatCards = document.querySelectorAll('.tuition-chat-message').length;
    const boardRect = board?.getBoundingClientRect?.() || null;
    const sideRect = side?.getBoundingClientRect?.() || null;
    return {
      chatCards,
      threadExists: !!document.querySelector('#tuitionTeacherTeacherTurns'),
      narrationExists: !!narration,
      narrationText: narration?.innerText.trim() || '',
      boardWidth: boardRect ? Math.round(boardRect.width) : 0,
      boardHeight: boardRect ? Math.round(boardRect.height) : 0,
      sideWidth: sideRect ? Math.round(sideRect.width) : 0,
      currentConcept: document.querySelector('#tuitionTeacherBoardCurrentConcept')?.innerText.trim() || '',
    };
  })()`);

  await browser.evaluate(`document.querySelector('#tuitionTeacherReplayLastBtn').click(); true;`);

  const audioStarted = await browser.waitFor(
    `(() => {
      const el = document.querySelector('#tuitionTeacherStageAudio');
      return !!el && !!el.getAttribute('src') && el.currentTime > 0;
    })()`,
    30000,
    250
  );

  const firstLineStartMs = Number(boardPlan.timelineWords[0]?.startMs || 0);
  const duringTargetMs = firstLineStartMs + 1200;

  const gotDuringPoint = await browser.waitFor(
    `(() => (document.querySelector('#tuitionTeacherStageAudio')?.currentTime || 0) * 1000 >= ${duringTargetMs})()`,
    30000,
    200
  );

  const sample = await browser.evaluate(`(() => ({
    audioCurrentTimeMs: Math.round((document.querySelector('#tuitionTeacherStageAudio')?.currentTime || 0) * 1000),
    audioPaused: !!document.querySelector('#tuitionTeacherStageAudio')?.paused,
    audioSrcPresent: !!document.querySelector('#tuitionTeacherStageAudio')?.getAttribute('src'),
    currentConcept: document.querySelector('#tuitionTeacherBoardCurrentConcept')?.innerText.trim() || '',
    anchors: [...document.querySelectorAll('#tuitionTeacherBoardAnchors li')].map((el) => el.innerText.trim()).filter(Boolean),
    narrationText: document.querySelector('#tuitionTeacherNarrationText')?.innerText.trim() || '',
    activeBoardLines: [...document.querySelectorAll('#tuitionTeacherBoardAnchors li.is-active-board-line')].map((el) => el.innerText.trim()).filter(Boolean),
    speechTrackCalls: window.__syncProbe?.calls || []
  }))()`);

  const expectedTranscript = expectedTranscriptAt(boardPlan, sample.audioCurrentTimeMs);
  const boardMatchesExactTimestamps =
    sample.currentConcept === expectedTranscript && sample.narrationText === expectedTranscript;

  await browser.evaluate(`(() => {
    const input = document.querySelector('#tuitionTeacherQuestionInput');
    input.value = ${JSON.stringify(caseConfig.doubt)};
    input.dispatchEvent(new Event('input', { bubbles: true }));
    document.querySelector('#tuitionTeacherAskBtn').click();
    return true;
  })()`);

  const doubtTeacherTurnsReady = await browser.waitFor(
    `(() => {
      const panel = document.querySelector('#tuitionTeacherDoubtPanel');
      const answer = document.querySelector('#tuitionTeacherDoubtAnswer')?.innerText.trim() || '';
      return !!panel && !panel.classList.contains('hidden') && answer.length > 24;
    })()`,
    40000,
    300
  );

  const doubtState = await browser.evaluate(`(() => ({
    panelVisible: !document.querySelector('#tuitionTeacherDoubtPanel')?.classList.contains('hidden'),
    question: document.querySelector('#tuitionTeacherDoubtQuestion')?.innerText.trim() || '',
    answer: document.querySelector('#tuitionTeacherDoubtAnswer')?.innerText.trim() || ''
  }))()`);

  await browser.evaluate(`window.scrollTo({ top: document.body.scrollHeight, behavior: 'auto' }); true;`);
  await delay(200);
  await browser.evaluate(`document.querySelector('#tuitionTeacherDoubtContinueBtn').click(); true;`);
  const continueTeacherTurnsReady = await browser.waitFor(
    `(() => {
      const panel = document.querySelector('#tuitionTeacherDoubtPanel');
      const audio = document.querySelector('#tuitionTeacherStageAudio');
      return !!panel && panel.classList.contains('hidden') && !!audio?.getAttribute('src');
    })()`,
    40000,
    300
  );

  await delay(1200);
  const focusState = await browser.evaluate(`(() => {
    const isVisible = (selector) => {
      const el = document.querySelector(selector);
      if (!el) return false;
      const rect = el.getBoundingClientRect();
      return rect.top >= 0 && rect.bottom <= window.innerHeight;
    };
    return {
      scrollTop: Math.round(window.scrollY || document.documentElement.scrollTop || 0),
      boardVisible: isVisible('#tuitionTeacherWhiteboardSurface'),
      narrationVisible: isVisible('.tuition-teacher-narration-strip'),
      conceptVisible: isVisible('#tuitionTeacherBoardCurrentConcept'),
      doubtPanelHidden: document.querySelector('#tuitionTeacherDoubtPanel')?.classList.contains('hidden') || false,
      chatCards: document.querySelectorAll('.tuition-chat-message').length,
    };
  })()`);

  return {
    layoutSample,
    audioStarted,
    gotDuringPoint,
    sample,
    expectedTranscript,
    boardMatchesExactTimestamps,
    doubtTeacherTurnsReady,
    doubtState,
    continueTeacherTurnsReady,
    focusState,
  };
}

async function runCase(browser, caseConfig) {
  const result = {
    case: caseConfig.name,
    requestedTopic: caseConfig.settings.topic,
    requestedLanguage: caseConfig.settings.voice,
  };

  try {
    const { sessionId, assistantMessage } = await createSessionAndStart(caseConfig.settings);
    assistantMessage.sessionId = sessionId;
    result.sessionId = sessionId;
    result.startMessageId = assistantMessage.id;
    result.title = assistantMessage?.structured?.topicTitle || null;

    const speechTrackPayload = await fetchJson(
      `http://localhost:5000/student/tuition/chapters/${chapterId}/sessions/${sessionId}/speech-track`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({ messageId: assistantMessage.id }),
      }
    );

    const speechTrack = speechTrackPayload.speechTrack;
    result.speechTrack = {
      engine: speechTrack.engine,
      syncType: speechTrack.syncType,
      mimeType: speechTrack.mimeType,
      wordCount: speechTrack.words.length,
      segmentCount: speechTrack.segments.length,
      sampleWords: speechTrack.words.slice(0, 5),
    };

    result.browser = await verifyBrowserCase(browser, caseConfig, assistantMessage, speechTrack);
  } catch (error) {
    result.blocked = {
      message: error.message,
      status: error.status || null,
      payload: error.payload || null,
    };
  }

  return result;
}

(async () => {
  const browser = await launchBrowser();
  try {
    const cases = [
      {
        name: "Science | Chemical Reaction | English",
        settings: {
          subject: "Science",
          topic: "Chemical Reaction",
          explain: "ENGLISH",
          board: "ENGLISH",
          voice: "ENGLISH",
          depth: "BASIC",
        },
        doubt: "Why do we call reactants and products different?",
      },
      {
        name: "Science | Chemical Reaction | Hindi",
        settings: {
          subject: "Science",
          topic: "Chemical Reaction",
          explain: "HINDI",
          board: "HINDI",
          voice: "HINDI",
          depth: "MODERATE",
        },
        doubt: "अभिकारक और उत्पाद अलग क्यों कहे जाते हैं?",
      },
      {
        name: "Punjabi Grammar | ਵਚਨ | Punjabi",
        settings: {
          subject: "Punjabi Grammar",
          topic: "ਵਚਨ",
          explain: "PUNJABI",
          board: "PUNJABI",
          voice: "PUNJABI",
          depth: "BASIC",
        },
        doubt: "ਇਕਵਚਨ ਤੇ ਬਹੁਵਚਨ ਵਿੱਚ ਫਰਕ ਕੀ ਹੈ?",
      },
    ];

    const results = [];
    for (const caseConfig of cases) {
      results.push(await runCase(browser, caseConfig));
    }

    console.log(JSON.stringify(results, null, 2));
  } finally {
    browser.cleanup();
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
