import {
  apiRequest,
  getStoredToken,
  getStoredUser,
  goToStudentLogin,
  initHeaderBehavior,
} from "./mock-api.js?v=2";

const normalizeRole = (user) =>
  String(user?.role || user?.userRole || user?.user_type || user?.accountType || "")
    .trim()
    .toUpperCase();

const query = new URLSearchParams(window.location.search || "");
const chapterId = query.get("chapterId") || "";
const sessionIdFromQuery = query.get("sessionId") || "";

const escapeHtml = (value) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

document.addEventListener("DOMContentLoaded", async () => {
  initHeaderBehavior();

  const token = getStoredToken();
  const user = getStoredUser();
  if (!token || normalizeRole(user) !== "STUDENT") {
    goToStudentLogin();
    return;
  }

  if (!chapterId) {
    window.location.href = "./tuition-chapters.html";
    return;
  }

  const titleEl = document.querySelector("#tuitionTeacherTitle");
  const summaryEl = document.querySelector("#tuitionTeacherSummary");
  const sessionLabelEl = document.querySelector("#tuitionTeacherSessionLabel");
  const sessionMetaEl = document.querySelector("#tuitionTeacherSessionMeta");
  const statusEl = document.querySelector("#tuitionTeacherStatus");
  const messagesEl = document.querySelector("#tuitionTeacherMessages");
  const form = document.querySelector("#tuitionTeacherForm");
  const inputEl = document.querySelector("#tuitionTeacherInput");
  const languageEl = document.querySelector("#tuitionTeacherLanguage");
  const speedEl = document.querySelector("#tuitionTeacherSpeed");
  const difficultyEl = document.querySelector("#tuitionTeacherDifficulty");
  const resumeBtn = document.querySelector("#tuitionTeacherResumeBtn");
  const voiceBtn = document.querySelector("#tuitionTeacherVoiceBtn");
  const voiceEndBtn = document.querySelector("#tuitionTeacherVoiceEndBtn");
  const voiceStateEl = document.querySelector("#tuitionTeacherVoiceState");
  const voiceMetaEl = document.querySelector("#tuitionTeacherVoiceMeta");
  const voiceAudioEl = document.querySelector("#tuitionTeacherVoiceAudio");
  const homeworkBtn = document.querySelector("#tuitionTeacherHomeworkBtn");
  const boardTitleEl = document.querySelector("#tuitionTeacherBoardTitle");
  const boardMetaEl = document.querySelector("#tuitionTeacherBoardMeta");
  const boardEmptyEl = document.querySelector("#tuitionTeacherBoardEmpty");
  const boardPanelEl = document.querySelector("#tuitionTeacherBoardPanel");
  const boardLinesEl = document.querySelector("#tuitionTeacherBoardLines");
  const boardFormulasEl = document.querySelector("#tuitionTeacherBoardFormulas");
  const boardStepsEl = document.querySelector("#tuitionTeacherBoardSteps");
  const boardExampleEl = document.querySelector("#tuitionTeacherBoardExample");
  const boardExampleTitleEl = document.querySelector("#tuitionTeacherBoardExampleTitle");
  const boardExampleStepsEl = document.querySelector("#tuitionTeacherBoardExampleSteps");

  let activeSessionId = sessionIdFromQuery;
  let chapterContext = null;
  let voiceSession = {
    peerConnection: null,
    localStream: null,
    dataChannel: null,
    remoteStream: null,
    status: "idle",
  };

  const setStatus = (message, type = "") => {
    if (!(statusEl instanceof HTMLElement)) return;
    statusEl.textContent = message;
    statusEl.className = `form-message${type ? ` ${type}` : ""}`;
  };

  const readSessionSettings = () => ({
    responseLanguage: languageEl instanceof HTMLSelectElement ? languageEl.value : "ENGLISH",
    speedMode: speedEl instanceof HTMLSelectElement ? speedEl.value : "NORMAL",
    difficultyMode: difficultyEl instanceof HTMLSelectElement ? difficultyEl.value : "MEDIUM",
    resume: true,
  });

  const setVoiceState = (state, message = "") => {
    voiceSession.status = state;
    if (voiceStateEl instanceof HTMLElement) {
      const label =
        state === "connecting"
          ? "Connecting"
          : state === "live"
            ? "Live"
            : state === "ended"
              ? "Ended"
              : state === "error"
                ? "Error"
                : "Idle";
      voiceStateEl.textContent = label;
      voiceStateEl.className = `tuition-chip tuition-voice-chip state-${state}`;
    }
    if (voiceMetaEl instanceof HTMLElement) {
      voiceMetaEl.textContent =
        message ||
        (state === "live"
          ? "Voice tutor is live. Speak naturally about the current chapter."
          : state === "connecting"
            ? "Connecting microphone and voice tutor..."
            : state === "ended"
              ? "Voice tutor ended. You can start another voice session any time."
              : state === "error"
                ? "Voice tutor could not start."
                : "Start voice mode to speak with the chapter tutor using the current language, speed, and difficulty.");
    }
    if (voiceBtn instanceof HTMLButtonElement) {
      voiceBtn.disabled = state === "connecting";
      voiceBtn.textContent = state === "connecting" ? "Connecting Voice..." : "Start Voice Tutor";
    }
    if (voiceEndBtn instanceof HTMLButtonElement) {
      voiceEndBtn.classList.toggle("hidden", !(state === "connecting" || state === "live"));
    }
  };

  const stopVoiceSession = (state = "ended", message = "") => {
    if (voiceSession.dataChannel) {
      try {
        voiceSession.dataChannel.close();
      } catch {
        // Ignore close errors.
      }
    }
    if (voiceSession.peerConnection) {
      try {
        voiceSession.peerConnection.close();
      } catch {
        // Ignore close errors.
      }
    }
    if (voiceSession.localStream) {
      voiceSession.localStream.getTracks().forEach((track) => track.stop());
    }
    if (voiceAudioEl instanceof HTMLAudioElement) {
      voiceAudioEl.pause();
      voiceAudioEl.srcObject = null;
      voiceAudioEl.classList.add("hidden");
    }
    voiceSession = {
      peerConnection: null,
      localStream: null,
      dataChannel: null,
      remoteStream: null,
      status: state,
    };
    setVoiceState(state, message);
  };

  const parseVoiceRealtimeError = async (response) => {
    const text = await response.text().catch(() => "");
    if (!text) return "Voice tutor session could not be started.";
    try {
      const payload = JSON.parse(text);
      return (
        String(payload?.error?.message || payload?.message || "").trim() ||
        "Voice tutor session could not be started."
      );
    } catch {
      return text.trim() || "Voice tutor session could not be started.";
    }
  };

  const renderSummary = (chapter, progress) => {
    if (!(summaryEl instanceof HTMLElement)) return;
    summaryEl.innerHTML = `
      <div class="tuition-summary-item">
        <strong>Chapter</strong>
        <span>${escapeHtml(chapter?.title || "Tuition Chapter")}</span>
      </div>
      <div class="tuition-summary-item">
        <strong>Syllabus</strong>
        <span>${escapeHtml(chapter?.syllabusTitle || "-")}</span>
      </div>
      <div class="tuition-summary-item">
        <strong>Plan Goal</strong>
        <span>${escapeHtml(chapter?.plan?.goalSummary || "Explain the topic in a text-first flow.")}</span>
      </div>
      <div class="tuition-summary-item">
        <strong>Progress</strong>
        <span>${escapeHtml(String(progress?.completionPercent || 0))}% · ${escapeHtml(
          progress?.progressLabel || progress?.status || "Not Started"
        )}</span>
      </div>
    `;
  };

  const renderMessages = (messages) => {
    if (!(messagesEl instanceof HTMLElement)) return;
    if (!messages.length) {
      messagesEl.innerHTML = `<div class="tuition-chat-empty">Start by asking about this chapter.</div>`;
      return;
    }

    messagesEl.innerHTML = messages
      .map((message) => {
        const structured = message?.structured;
        return `
          <article class="tuition-chat-message ${message.role === "USER" ? "is-user" : "is-assistant"}">
            <strong>${message.role === "USER" ? "You" : "AI Tuition Teacher"}</strong>
            <p>${escapeHtml(structured?.replyText || message.content || "").replace(/\n/g, "<br />")}</p>
            ${
              structured?.recapPoints?.length
                ? `<div class="tuition-chat-list"><strong>Recap</strong><ul>${structured.recapPoints
                    .map((item) => `<li>${escapeHtml(item)}</li>`)
                    .join("")}</ul></div>`
                : ""
            }
            ${
              structured?.nextSuggestedAction
                ? `<div class="tuition-summary-item compact"><strong>Next</strong><span>${escapeHtml(
                    structured.nextSuggestedAction
                  )}</span></div>`
                : ""
            }
            ${
              structured?.progressUpdate
                ? `<div class="tuition-summary-item compact"><strong>Progress</strong><span>${escapeHtml(
                    structured.progressUpdate
                  )}</span></div>`
                : ""
            }
          </article>
        `;
      })
      .join("");
    messagesEl.scrollTop = messagesEl.scrollHeight;
  };

  const renderSessionMeta = (session, progress) => {
    if (sessionLabelEl instanceof HTMLElement) {
      sessionLabelEl.textContent = session?.status ? `Session ${session.status}` : "Session Ready";
    }
    if (!(sessionMetaEl instanceof HTMLElement)) return;
    sessionMetaEl.innerHTML = [
      session?.responseLanguage || "ENGLISH",
      session?.speedMode || "NORMAL",
      session?.difficultyMode || "MEDIUM",
      `${progress?.completionPercent || 0}%`,
    ]
      .map((item) => `<span class="tuition-chip">${escapeHtml(item)}</span>`)
      .join("");
  };

  const extractLatestBoardPayload = (messages) =>
    [...(Array.isArray(messages) ? messages : [])]
      .reverse()
      .find(
        (message) =>
          message?.role === "ASSISTANT" &&
          message?.structured &&
          (message.structured.boardTitle ||
            message.structured.boardLines?.length ||
            message.structured.formulas?.length ||
            message.structured.steps?.length ||
            message.structured.exampleSteps?.length)
      )?.structured || null;

  const renderBoardList = (element, items, tagName = "li") => {
    if (!(element instanceof HTMLElement)) return;
    const safeItems = Array.isArray(items) ? items.filter(Boolean) : [];
    if (!safeItems.length) {
      element.innerHTML = `<${tagName} class="tuition-board-empty-item">No notes yet.</${tagName}>`;
      return;
    }
    element.innerHTML = safeItems
      .map((item) => `<${tagName}>${escapeHtml(item)}</${tagName}>`)
      .join("");
  };

  const renderBoard = (structured, session = null) => {
    const hasBoard =
      structured &&
      (structured.boardTitle ||
        structured.boardLines?.length ||
        structured.formulas?.length ||
        structured.steps?.length ||
        structured.exampleSteps?.length);

    if (boardTitleEl instanceof HTMLElement) {
      boardTitleEl.textContent = hasBoard ? structured.boardTitle || "Teaching Board" : "Teaching Board";
    }
    if (boardMetaEl instanceof HTMLElement) {
      boardMetaEl.innerHTML = hasBoard
        ? [session?.responseLanguage || "ENGLISH", session?.speedMode || "NORMAL", session?.difficultyMode || "MEDIUM"]
            .map((item) => `<span class="tuition-chip">${escapeHtml(item)}</span>`)
            .join("")
        : "";
    }
    if (boardEmptyEl instanceof HTMLElement) {
      boardEmptyEl.classList.toggle("hidden", Boolean(hasBoard));
    }
    if (boardPanelEl instanceof HTMLElement) {
      boardPanelEl.classList.toggle("hidden", !hasBoard);
    }
    if (!hasBoard) {
      return;
    }

    renderBoardList(boardLinesEl, structured.boardLines);
    renderBoardList(boardFormulasEl, structured.formulas);
    renderBoardList(boardStepsEl, structured.steps, "li");

    const hasExample = Boolean(structured.exampleTitle || structured.exampleSteps?.length);
    if (boardExampleEl instanceof HTMLElement) {
      boardExampleEl.classList.toggle("hidden", !hasExample);
    }
    if (boardExampleTitleEl instanceof HTMLElement) {
      boardExampleTitleEl.textContent = structured.exampleTitle || "Worked Example";
    }
    renderBoardList(boardExampleStepsEl, structured.exampleSteps, "li");
  };

  const applySessionState = (payload) => {
    activeSessionId = payload?.session?.id || activeSessionId;
    if (activeSessionId) {
      const nextUrl = `./tuition-teacher.html?chapterId=${encodeURIComponent(chapterId)}&sessionId=${encodeURIComponent(
        activeSessionId
      )}`;
      window.history.replaceState({}, "", nextUrl);
    }
    if (languageEl instanceof HTMLSelectElement && payload?.session?.responseLanguage) {
      languageEl.value = payload.session.responseLanguage;
    }
    if (speedEl instanceof HTMLSelectElement && payload?.session?.speedMode) {
      speedEl.value = payload.session.speedMode;
    }
    if (difficultyEl instanceof HTMLSelectElement && payload?.session?.difficultyMode) {
      difficultyEl.value = payload.session.difficultyMode;
    }
    renderMessages(payload?.session?.messages || []);
    renderSessionMeta(payload?.session, payload?.progress);
    renderBoard(extractLatestBoardPayload(payload?.session?.messages || []), payload?.session || null);
  };

  const loadChapterContext = async () => {
    const payload = await apiRequest({
      path: `/student/tuition/chapters/${chapterId}`,
      token,
    });
    chapterContext = payload || null;
    if (titleEl instanceof HTMLElement) titleEl.textContent = payload?.chapter?.title || "Tuition Session";
    renderSummary(payload?.chapter, payload?.progress);
  };

  const createOrResumeSession = async (forceResume = true) => {
    const payload = await apiRequest({
      path: `/student/tuition/chapters/${chapterId}/sessions`,
      method: "POST",
      token,
      body: {
        ...readSessionSettings(),
        resume: forceResume,
      },
    });
    applySessionState(payload);
    setStatus(payload?.resumed ? "Previous session resumed." : "New chapter session created.", "success");
  };

  const loadSpecificSession = async () => {
    const payload = await apiRequest({
      path: `/student/tuition/chapters/${chapterId}/sessions/${activeSessionId}`,
      token,
    });
    applySessionState(payload);
    setStatus("Saved session loaded.", "success");
  };

  const startVoiceTutor = async () => {
    if (voiceSession.status === "connecting" || voiceSession.status === "live") {
      return;
    }
    if (
      typeof window.RTCPeerConnection === "undefined" ||
      !navigator.mediaDevices ||
      typeof navigator.mediaDevices.getUserMedia !== "function"
    ) {
      setVoiceState("error", "Voice tutor needs microphone and WebRTC support in this browser.");
      return;
    }

    try {
      if (!activeSessionId) {
        setStatus("Preparing a session before starting voice tutor...");
        await createOrResumeSession(true);
      }

      setVoiceState("connecting");
      const bootstrap = await apiRequest({
        path: `/student/tuition/chapters/${chapterId}/sessions/${activeSessionId}/voice-session`,
        method: "POST",
        token,
        body: {
          responseLanguage: languageEl instanceof HTMLSelectElement ? languageEl.value : "ENGLISH",
          speedMode: speedEl instanceof HTMLSelectElement ? speedEl.value : "NORMAL",
          difficultyMode: difficultyEl instanceof HTMLSelectElement ? difficultyEl.value : "MEDIUM",
        },
      });

      const localStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      const peerConnection = new RTCPeerConnection();
      const remoteStream = new MediaStream();
      const dataChannel = peerConnection.createDataChannel("tuition-oai-events");

      if (voiceAudioEl instanceof HTMLAudioElement) {
        voiceAudioEl.srcObject = remoteStream;
        voiceAudioEl.classList.remove("hidden");
      }

      peerConnection.ontrack = (event) => {
        event.streams.forEach((stream) => {
          stream.getTracks().forEach((track) => remoteStream.addTrack(track));
        });
      };
      peerConnection.onconnectionstatechange = () => {
        if (peerConnection.connectionState === "connected") {
          setVoiceState(
            "live",
            `Voice tutor is live for ${bootstrap?.context?.chapterTitle || chapterContext?.chapter?.title || "this chapter"}.`
          );
        } else if (peerConnection.connectionState === "failed") {
          stopVoiceSession("error", "Voice tutor connection failed.");
        } else if (
          peerConnection.connectionState === "disconnected" ||
          peerConnection.connectionState === "closed"
        ) {
          stopVoiceSession("ended", "Voice tutor session ended.");
        }
      };

      dataChannel.onopen = () => {
        dataChannel.send(
          JSON.stringify({
            type: "response.create",
            response: {
              modalities: ["audio", "text"],
              instructions:
                `Greet the student briefly in ${bootstrap?.session?.responseLanguage || "English"} and ask ` +
                `which part of ${bootstrap?.context?.chapterTitle || chapterContext?.chapter?.title || "the chapter"} they want help with.`,
            },
          })
        );
      };
      dataChannel.onerror = () => {
        setVoiceState("error", "Voice tutor data channel reported an error.");
      };

      localStream.getTracks().forEach((track) => peerConnection.addTrack(track, localStream));

      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);

      const realtimeResponse = await fetch("https://api.openai.com/v1/realtime/calls", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${bootstrap.clientSecret}`,
          "Content-Type": "application/sdp",
        },
        body: offer.sdp || "",
      });

      if (!realtimeResponse.ok) {
        throw new Error(await parseVoiceRealtimeError(realtimeResponse));
      }

      const answerSdp = await realtimeResponse.text();
      await peerConnection.setRemoteDescription({
        type: "answer",
        sdp: answerSdp,
      });

      voiceSession = {
        peerConnection,
        localStream,
        dataChannel,
        remoteStream,
        status: "live",
      };

      setVoiceState(
        "live",
        `Voice tutor is live in ${bootstrap?.session?.responseLanguage || "English"} with ${
          bootstrap?.session?.speedMode || "NORMAL"
        } pace and ${bootstrap?.session?.difficultyMode || "MEDIUM"} depth.`
      );
    } catch (error) {
      stopVoiceSession(
        "error",
        error instanceof Error ? error.message : "Unable to start the voice tutor."
      );
    }
  };

  try {
    await loadChapterContext();
    if (activeSessionId) {
      await loadSpecificSession();
    } else {
      await createOrResumeSession(true);
    }
  } catch (error) {
    setStatus(error instanceof Error ? error.message : "Unable to open the tuition teacher.", "error");
  }

  resumeBtn?.addEventListener("click", async () => {
    try {
      setStatus("Refreshing session with current settings...");
      await createOrResumeSession(true);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to refresh the session.", "error");
    }
  });

  voiceBtn?.addEventListener("click", async () => {
    await startVoiceTutor();
  });

  voiceEndBtn?.addEventListener("click", () => {
    stopVoiceSession("ended", "Voice tutor session ended.");
  });

  homeworkBtn?.addEventListener("click", async () => {
    try {
      if (!activeSessionId) {
        setStatus("Preparing a session before generating homework...");
        await createOrResumeSession(true);
      }
      setStatus("Generating chapter homework...");
      const payload = await apiRequest({
        path: `/student/tuition/chapters/${chapterId}/homework`,
        method: "POST",
        token,
        body: {
          sessionId: activeSessionId,
          responseLanguage: languageEl instanceof HTMLSelectElement ? languageEl.value : "ENGLISH",
          speedMode: speedEl instanceof HTMLSelectElement ? speedEl.value : "NORMAL",
          difficultyMode: difficultyEl instanceof HTMLSelectElement ? difficultyEl.value : "MEDIUM",
        },
      });
      const homeworkId = payload?.homework?.id;
      if (!homeworkId) {
        throw new Error("Homework generation completed but no homework id was returned.");
      }
      window.location.href = `./tuition-homework.html?homeworkId=${encodeURIComponent(homeworkId)}`;
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to generate homework.", "error");
    }
  });

  form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!(inputEl instanceof HTMLTextAreaElement) || !inputEl.value.trim()) {
      setStatus("Enter a message first.", "error");
      return;
    }

    try {
      if (!activeSessionId) {
        await createOrResumeSession(true);
      }
      setStatus("Sending message...");
      const payload = await apiRequest({
        path: `/student/tuition/chapters/${chapterId}/sessions/${activeSessionId}/messages`,
        method: "POST",
        token,
        body: {
          content: inputEl.value.trim(),
          responseLanguage: languageEl instanceof HTMLSelectElement ? languageEl.value : "ENGLISH",
          speedMode: speedEl instanceof HTMLSelectElement ? speedEl.value : "NORMAL",
          difficultyMode: difficultyEl instanceof HTMLSelectElement ? difficultyEl.value : "MEDIUM",
        },
      });
      applySessionState(payload);
      if (chapterContext?.chapter) {
        renderSummary(chapterContext.chapter, payload?.progress);
      }
      inputEl.value = "";
      setStatus("Response generated for the current chapter.", "success");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to send the tuition message.", "error");
    }
  });

  window.addEventListener("beforeunload", () => {
    stopVoiceSession("ended");
  });
});
