const { buildTuitionTeacherAssistantPayload } = require('./backend/dist/modules/tuition/tuition-ai.provider.js');
async function run(topic) {
  return buildTuitionTeacherAssistantPayload({
    boardName:'CBSE', classLevel:8, subjectName:'Punjabi Grammar', topicTitle:topic,
    explanationLanguage:'Punjabi', boardLanguage:'Punjabi', voiceLanguage:'Punjabi',
    teachingDepth:'BASIC', speedMode:'NORMAL', difficultyMode:'MEDIUM',
    studentPrompt:'__START_TUITION_AI_TEACHER__', messageNumber:1, previousAssistant:null,
  });
}
(async () => {
  const topics = ['ਵਚਨ','ਲਿੰਗ','ਸੰਬੰਧੀ ਸ਼ਬਦ'];
  const out = [];
  for (const topic of topics) {
    const r = await run(topic);
    out.push({ requested: topic, intro: r.teacherIntro, boardTitle: r.boardState?.title, anchors: r.boardState?.anchors, recap: r.boardState?.recapKeywords });
  }
  console.log(JSON.stringify(out, null, 2));
})();
