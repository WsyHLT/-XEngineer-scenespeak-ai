'use strict';

// Global variables and configuration
const CONFIG = {
  defaultLanguage: 'en-US',
  defaultModel: 'openai/gpt-3.5-turbo',
  defaultPersonality: 'helpful',
  maxHistoryItems: 50,
  speechTimeout: 5000,
  retryAttempts: 3
};

const SCENARIO_CONTEXTS = {
  'job-interview': 'You are practicing for a job interview. The tutor should ask relevant questions about experience, skills, and career goals.',
  restaurant: 'You are at a restaurant. Practice ordering food, asking about menu items, and polite dining conversations.',
  meeting: 'You are in a business meeting. Practice giving updates, clarifying decisions, and discussing action items.',
  travel: 'You are traveling. Practice airport, hotel, and tourist interactions.',
  shopping: 'You are shopping. Practice asking about products, prices, and making purchases.',
  medical: 'You are at a doctor office. Practice describing symptoms and health concerns.',
  social: 'You are in a social setting. Practice casual conversations and small talk.'
};

// Enhanced Application state for comprehensive scoring
const AppState = {
  isRecording: false,
  isMuted: false,
  currentTheme: localStorage.getItem('theme') || 'light',
  conversationHistory: JSON.parse(localStorage.getItem('conversationHistory')) || [],
  
  // Learning-specific state
  learningMode: localStorage.getItem('learningMode') || 'conversation',
  tutorMode: localStorage.getItem('tutorMode') || 'conversation_partner',
  difficultyLevel: localStorage.getItem('difficultyLevel') || 'intermediate',
  feedbackStyle: localStorage.getItem('feedbackStyle') || 'gentle',
  sessionLength: localStorage.getItem('sessionLength') || 'unlimited',
  selectedScenario: localStorage.getItem('selectedScenario') || '',
  scenarioContext: '',
  
  // Enhanced Progress tracking with detailed metrics
  sessionStartTime: null,
  sessionDuration: 0,
  wordsSpoken: 0,
  messagesCount: 0,
  
  // Comprehensive scoring system (0-100)
  scores: {
    grammar: null,
    pronunciation: null,
    vocabulary: null,
    fluency: null,
    overall: null
  },
  scoreRecords: JSON.parse(localStorage.getItem('scoreRecords') || '[]'),
  lastValidScores: JSON.parse(localStorage.getItem('lastValidScores') || '{}'),
  
  // Detailed analytics
  analytics: {
    totalSessions: parseInt(localStorage.getItem('totalSessions')) || 0,
    totalMinutes: parseInt(localStorage.getItem('totalMinutes')) || 0,
    streakDays: parseInt(localStorage.getItem('streakDays')) || 0,
    lastSessionDate: localStorage.getItem('lastSessionDate') || new Date().toDateString(),
    weakAreas: JSON.parse(localStorage.getItem('weakAreas')) || [],
    strongAreas: JSON.parse(localStorage.getItem('strongAreas')) || [],
    improvementSuggestions: JSON.parse(localStorage.getItem('improvementSuggestions')) || []
  },
  
  // Session-specific tracking
  currentSession: {
    startTime: null,
    messagesCount: 0,
    wordsSpoken: 0,
    grammarErrors: 0,
    pronunciationIssues: 0,
    pronunciationResults: [],
    vocabularyUsed: new Set(),
    fluencyScore: 0,
    interactions: []
  },
  
  settings: {
    aiModel: localStorage.getItem('aiModel') || CONFIG.defaultModel,
    language: localStorage.getItem('language') || CONFIG.defaultLanguage,
    selectedVoice: localStorage.getItem('selectedVoice') || ''
  }
};

// Initialize Socket.IO
const socket = io();

// DOM Elements
const elements = {
  // Output elements
  outputYou: document.querySelector('.output-you'),
  outputBot: document.querySelector('.output-bot'),
  chatHistory: document.getElementById('chat-history'),
  contextModeLabel: document.getElementById('context-mode-label'),
  contextScenarioLabel: document.getElementById('context-scenario-label'),
  transcriptConfirmation: document.getElementById('transcript-confirmation'),
  transcriptEditor: document.getElementById('transcript-editor'),
  sendTranscriptBtn: document.getElementById('send-transcript-btn'),
  retryRecordingBtn: document.getElementById('retry-recording-btn'),
  
  // Control buttons
  micBtn: document.getElementById('mic-btn'),
  themeBtn: document.getElementById('theme-btn'),
  settingsBtn: document.getElementById('settings-btn'),
  muteBtn: document.getElementById('mute-btn'),
  stopBtn: document.getElementById('stop-btn'),
  summaryBtn: document.getElementById('summary-btn'),
  closeSettingsBtn: document.getElementById('close-settings'),
  clearHistoryBtn: document.getElementById('clear-history'),
  
  // Settings panel
  settingsPanel: document.getElementById('settings-panel'),
  tutorModeSelect: document.getElementById('tutor-mode'),
  difficultyLevelSelect: document.getElementById('difficulty-level'),
  feedbackStyleSelect: document.getElementById('feedback-style'),
  languageSelect: document.getElementById('language-select'),
  voiceSelect: document.getElementById('voice-select'),
  sessionLengthSelect: document.getElementById('session-length'),
  
  // Status and loading
  connectionStatus: document.getElementById('connection-status'),
  statusText: document.getElementById('status-text'),
  loadingIndicator: document.getElementById('loading-indicator'),
  voiceVisualizer: document.getElementById('voice-visualizer'),
  visualizerCanvas: document.getElementById('visualizer-canvas'),
  summaryPanel: document.getElementById('session-summary-panel'),
  summaryScenario: document.getElementById('summary-scenario'),
  summaryContent: document.getElementById('summary-content'),
  
  // Toast
  errorToast: document.getElementById('error-toast'),
  toastMessage: document.getElementById('toast-message')
};

function updateConversationContext(mode = AppState.learningMode, scenario = AppState.selectedScenario) {
  const modeNames = {
    conversation: '自由对话',
    grammar: '语法专项',
    pronunciation: '发音训练',
    vocabulary: '词汇表达',
    fluency: '流利度训练',
    scenario: '场景陪练'
  };

  const scenarioNames = {
    'job-interview': '求职面试',
    restaurant: '餐厅点餐',
    meeting: '会议讨论',
    travel: '旅行出行',
    shopping: '购物交流',
    medical: '看医生',
    social: '社交聊天'
  };

  const scenarioGoals = {
    'job-interview': '介绍自己、项目经历和岗位匹配度',
    restaurant: '点餐、询问推荐和表达偏好',
    meeting: '汇报进度、表达观点和确认行动项',
    travel: '机场、酒店、路线和行程沟通',
    shopping: '询问价格、尺码、颜色和退换货',
    medical: '描述症状并回答医生问题',
    social: '自然寒暄和追问话题'
  };

  const isScenario = mode === 'scenario' && scenario;
  const modeText = isScenario
    ? `${modeNames.scenario} · ${scenarioNames[scenario] || scenario}`
    : (modeNames[mode] || modeNames.conversation);
  const detailText = isScenario
    ? `当前任务：${scenarioGoals[scenario] || '围绕所选真实情境进行对话'}`
    : '当前未进入具体场景';

  if (elements.contextModeLabel) {
    elements.contextModeLabel.textContent = modeText;
  }
  if (elements.contextScenarioLabel) {
    elements.contextScenarioLabel.textContent = detailText;
  }
}

function todayKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function clampScore(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) return null;
  return Math.max(0, Math.min(100, Math.round(number)));
}

function getPracticeMinutesByDate() {
  try {
    return JSON.parse(localStorage.getItem('practiceMinutesByDate') || '{}');
  } catch (error) {
    return {};
  }
}

function savePracticeMinutesByDate(value) {
  localStorage.setItem('practiceMinutesByDate', JSON.stringify(value));
}

function getTodayPracticeMinutes() {
  const minutesByDate = getPracticeMinutesByDate();
  const saved = Number(minutesByDate[todayKey()] || 0);
  const live = AppState.sessionStartTime ? Math.floor((Date.now() - AppState.sessionStartTime) / 60000) : 0;
  return Math.max(0, saved + live);
}

function notePracticeActivity() {
  const key = todayKey();
  const minutesByDate = getPracticeMinutesByDate();
  if (!Object.prototype.hasOwnProperty.call(minutesByDate, key)) {
    minutesByDate[key] = 0;
    savePracticeMinutesByDate(minutesByDate);
  }
  localStorage.setItem('lastSessionDate', new Date().toDateString());
}

function calculateStreakDays() {
  const activeDates = new Set(AppState.scoreRecords.map(record => record.date).filter(Boolean));
  Object.keys(getPracticeMinutesByDate()).forEach(date => activeDates.add(date));
  let streak = 0;
  const cursor = new Date();
  while (activeDates.has(todayKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

function addScoreRecord(scores, source = 'speech-analysis') {
  setRealScores(scores, source);
}

function setRealScores(scores, source = 'score-update') {
  const record = {
    date: todayKey(),
    timestamp: new Date().toISOString(),
    source
  };
  let changed = false;

  ['grammar', 'pronunciation', 'vocabulary', 'fluency'].forEach(key => {
    const score = clampScore(scores[key]);
    if (score !== null) {
      AppState.scores[key] = score;
      AppState.lastValidScores[key] = score;
      record[key] = score;
      localStorage.setItem(`${key}Score`, score);
      changed = true;
    } else if (Number.isFinite(Number(AppState.lastValidScores[key])) && Number(AppState.lastValidScores[key]) > 0) {
      AppState.scores[key] = Number(AppState.lastValidScores[key]);
    }
  });

  const overallValues = ['grammar', 'pronunciation', 'vocabulary', 'fluency']
    .map(key => AppState.scores[key])
    .filter(value => Number.isFinite(Number(value)) && Number(value) > 0);
  AppState.scores.overall = overallValues.length
    ? Math.round(overallValues.reduce((sum, value) => sum + Number(value), 0) / overallValues.length)
    : null;
  if (Number.isFinite(Number(AppState.scores.overall)) && Number(AppState.scores.overall) > 0) {
    AppState.lastValidScores.overall = AppState.scores.overall;
    localStorage.setItem('overallScore', AppState.scores.overall);
  }

  if (changed) {
    AppState.scoreRecords.push(record);
    AppState.scoreRecords = AppState.scoreRecords.slice(-120);
    localStorage.setItem('scoreRecords', JSON.stringify(AppState.scoreRecords));
    localStorage.setItem('lastValidScores', JSON.stringify(AppState.lastValidScores));
    notePracticeActivity();
  }
}


function recalculateScoresFromRecords() {
  const recent = AppState.scoreRecords.slice(-40);
  ['grammar', 'pronunciation', 'vocabulary', 'fluency'].forEach(key => {
    const values = recent
      .map(record => Number(record[key]))
      .filter(value => Number.isFinite(value) && value > 0);
    if (values.length) {
      AppState.scores[key] = Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
      AppState.lastValidScores[key] = AppState.scores[key];
    } else if (Number.isFinite(Number(AppState.lastValidScores[key])) && Number(AppState.lastValidScores[key]) > 0) {
      AppState.scores[key] = Number(AppState.lastValidScores[key]);
    } else {
      AppState.scores[key] = null;
    }
  });
  const overallValues = ['grammar', 'pronunciation', 'vocabulary', 'fluency']
    .map(key => AppState.scores[key])
    .filter(value => Number.isFinite(value) && value > 0);
  AppState.scores.overall = overallValues.length
    ? Math.round(overallValues.reduce((sum, value) => sum + value, 0) / overallValues.length)
    : null;
  if (Number.isFinite(AppState.scores.overall)) {
    AppState.lastValidScores.overall = AppState.scores.overall;
  }

  localStorage.setItem('lastValidScores', JSON.stringify(AppState.lastValidScores));
  ['grammar', 'pronunciation', 'vocabulary', 'fluency', 'overall'].forEach(key => {
    if (AppState.scores[key] === null) localStorage.removeItem(`${key}Score`);
    else localStorage.setItem(`${key}Score`, AppState.scores[key]);
  });
}

recalculateScoresFromRecords();
setRealScores({}, 'restore-last-valid');

// Speech Recognition Setup
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition = null;
let speechSynthesis = window.speechSynthesis;
let availableVoices = [];

// Audio Context for Voice Visualization
let audioContext = null;
let analyser = null;
let microphone = null;
let animationId = null;
let activeRecordingStream = null;
let mediaRecorder = null;
let recordedChunks = [];
let pcmAudioContext = null;
let pcmSourceNode = null;
let pcmProcessorNode = null;
let pcmChunks = [];
let pcmSampleRate = 16000;
let pendingPronunciationText = '';
let finalTranscriptReceivedThisTurn = false;
let lastFinalTranscriptAt = 0;
let latestTranscriptThisTurn = '';
let messageSentThisTurn = false;
let pendingAudioBlob = null;

// Personality prompts
const PERSONALITY_PROMPTS = {
  helpful: "You are a helpful and friendly AI assistant. Provide clear, accurate, and useful responses.",
  creative: "You are a creative and imaginative AI assistant. Think outside the box and provide innovative, artistic responses.",
  technical: "You are a technical expert AI assistant. Provide detailed, accurate technical information with examples and best practices.",
  casual: "You are a casual, friendly AI assistant. Respond in a relaxed, conversational tone like talking to a good friend.",
  professional: "You are a professional AI assistant. Provide formal, well-structured responses suitable for business contexts."
};

// Browser Compatibility Check
function checkBrowserCompatibility() {
  const issues = [];
  
  // Check Speech Recognition
  if (!SpeechRecognition) {
    issues.push('Speech Recognition not supported');
  }
  
  // Check Speech Synthesis
  if (!window.speechSynthesis) {
    issues.push('Speech Synthesis not supported');
  }
  
  // Check Media Devices
  if (!navigator.mediaDevices) {
    issues.push('Media Devices API not supported');
  }
  
  // Check WebSocket support
  if (!window.WebSocket) {
    issues.push('WebSocket not supported');
  }
  
  if (issues.length > 0) {
    const message = `Browser compatibility issues detected:\n• ${issues.join('\n• ')}\n\nFor best experience, please use Chrome, Edge, or Safari.`;
    console.warn('⚠️ Browser compatibility issues:', issues);
    showError(message);
    return false;
  }
  
  console.log('✅ Browser compatibility check passed');
  return true;
}

// Initialize Application
function initializeApp() {
  console.log('🚀 Initializing English Tutor AI...');
  
  // Check browser compatibility first
  const isCompatible = checkBrowserCompatibility();
  
  // Apply saved theme
  applyTheme(AppState.currentTheme);
  
  // Initialize speech recognition
  initializeSpeechRecognition();
  
  // Load available voices
  loadAvailableVoices();
  
  // Setup event listeners
  setupEventListeners();
  
  // Load conversation history
  loadConversationHistory();
  
  // Apply saved settings
  applySettings();
  
  // Initialize progress display
  updateProgressDisplay();
  
  // Initialize active mode
  initializeActiveMode();
  updateConversationContext();
  
  // Start session timer
  setInterval(updateSessionTimer, 1000);
  
  if (isCompatible) {
    console.log('✅ English Tutor AI initialized successfully');
    showToast('欢迎使用 AI 英语口语陪练，请选择练习模式开始。', 'success');
  } else {
    console.log('⚠️ English Tutor AI initialized with compatibility warnings');
  }
}

// Enhanced Speech Recognition with better microphone handling
function initializeSpeechRecognition() {
  if (!SpeechRecognition) {
    showError('当前浏览器不支持语音识别，请使用 Chrome、Edge 或 Safari。');
    elements.micBtn.disabled = true;
    elements.micBtn.style.opacity = '0.5';
    return;
  }
  
  try {
    recognition = new SpeechRecognition();
    recognition.lang = AppState.settings.language;
    recognition.interimResults = true; // Enable interim results for better UX
    recognition.maxAlternatives = 3; // Get multiple alternatives
    recognition.continuous = false;
    
    // Speech Recognition Event Listeners with enhanced error handling
    recognition.addEventListener('speechstart', handleSpeechStart);
    recognition.addEventListener('speechend', handleSpeechEnd);
    recognition.addEventListener('result', handleSpeechResult);
    recognition.addEventListener('error', handleSpeechError);
    recognition.addEventListener('nomatch', handleNoMatch);
    recognition.addEventListener('start', handleRecognitionStart);
    recognition.addEventListener('end', handleRecognitionEnd);
    
    console.log('✅ Enhanced speech recognition initialized successfully');
    
    // Test microphone permissions on initialization
    testMicrophoneAccess();
    
  } catch (error) {
    console.error('❌ Failed to initialize speech recognition:', error);
    showError('语音识别初始化失败，请刷新页面后重试。');
    elements.micBtn.disabled = true;
    elements.micBtn.style.opacity = '0.5';
  }
}

// Test microphone access and permissions
async function testMicrophoneAccess() {
  try {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100
        } 
      });
      
      console.log('✅ Microphone access granted');
      
      // Test audio levels
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const analyser = audioContext.createAnalyser();
      const microphone = audioContext.createMediaStreamSource(stream);
      analyser.fftSize = 256;
      microphone.connect(analyser);
      
      // Stop the test stream
      stream.getTracks().forEach(track => track.stop());
      audioContext.close();
      
      showToast('麦克风已就绪，点击麦克风即可开始练习。', 'success');
      
    } else {
      throw new Error('Media devices not supported');
    }
  } catch (error) {
    console.error('❌ Microphone access error:', error);
    handleMicrophoneError(error);
  }
}

// Handle microphone-specific errors
function handleMicrophoneError(error) {
  let errorMessage = '麦克风错误：';
  let suggestions = [];
  
  switch (error.name) {
    case 'NotAllowedError':
      errorMessage += '浏览器拒绝了麦克风权限。';
      suggestions = [
        '点击浏览器地址栏里的麦克风图标',
        '选择允许访问麦克风',
        '刷新页面后重试'
      ];
      break;
    case 'NotFoundError':
      errorMessage += '没有检测到麦克风。';
      suggestions = [
        '请连接麦克风设备',
        '检查系统麦克风设置',
        '尝试更换麦克风'
      ];
      break;
    case 'NotReadableError':
      errorMessage += '麦克风可能正在被其他应用占用。';
      suggestions = [
        '关闭其他正在使用麦克风的应用',
        '重启浏览器',
        '检查系统隐私权限设置'
      ];
      break;
    default:
      errorMessage += '未知麦克风错误。';
      suggestions = [
        '检查浏览器麦克风权限',
        '刷新页面后重试',
        '建议使用 Chrome 浏览器'
      ];
  }
  
  showDetailedError(errorMessage, suggestions);
}

// Show detailed error with suggestions
function showDetailedError(message, suggestions = []) {
  const suffix = suggestions.length > 0 ? `\n建议：${suggestions.join('；')}` : '';
  showToast(`${message}${suffix}`, 'error');
}

// Enhanced speech recognition handlers
function handleRecognitionStart() {
  console.log('🎤 Recognition started');
  AppState.isRecording = true;
  finalTranscriptReceivedThisTurn = false;
  latestTranscriptThisTurn = '';
  messageSentThisTurn = false;
}

function handleRecognitionEnd() {
  console.log('🎤 Recognition ended');
  AppState.isRecording = false;
  elements.micBtn.classList.remove('recording');
  stopVoiceVisualization();
  stopAudioCapture();
}

function handleSpeechResult(event) {
  console.log('📝 Speech result received');
  
  let finalTranscript = '';
  let interimTranscript = '';
  
  // Process all results
  for (let i = event.resultIndex; i < event.results.length; i++) {
    const transcript = event.results[i][0].transcript;
    const confidence = event.results[i][0].confidence;
    
    if (event.results[i].isFinal) {
      finalTranscript += transcript;
      console.log(`Final: "${transcript}" (confidence: ${confidence})`);
    } else {
      interimTranscript += transcript;
      console.log(`Interim: "${transcript}"`);
    }
  }
  
  // Update UI with interim results
  if (interimTranscript) {
    latestTranscriptThisTurn = `${finalTranscript} ${interimTranscript}`.trim();
    elements.outputYou.textContent = latestTranscriptThisTurn;
    elements.outputYou.style.opacity = '0.7';
  }
  
  // Process final result
  if (finalTranscript) {
    showTranscriptConfirmation(finalTranscript, { isFinal: true });
  }
}

function showTranscriptConfirmation(text, options = {}) {
  const transcript = String(text || '').trim();
  if (!transcript || messageSentThisTurn) return;

  latestTranscriptThisTurn = transcript;
  finalTranscriptReceivedThisTurn = Boolean(options.isFinal);
  lastFinalTranscriptAt = Date.now();
  elements.outputYou.textContent = transcript;
  elements.outputYou.style.opacity = options.isFinal ? '1' : '0.85';

  if (elements.transcriptConfirmation && elements.transcriptEditor) {
    elements.transcriptEditor.value = transcript;
    elements.transcriptConfirmation.hidden = false;
    elements.transcriptEditor.focus();
    elements.transcriptEditor.select();
  }

  showToast('请先检查识别文本，必要时修改后点击“确认并发送”。', 'info');
}

function confirmTranscriptAndSend() {
  const editedText = (elements.transcriptEditor?.value || latestTranscriptThisTurn || '').trim();
  if (!editedText) {
    showError('识别文本为空，请重新录音。');
    return;
  }

  if (elements.transcriptConfirmation) {
    elements.transcriptConfirmation.hidden = true;
  }

  submitRecognizedText(editedText, { isFinal: true, userConfirmed: true });
}

function retryTranscriptRecording() {
  latestTranscriptThisTurn = '';
  pendingPronunciationText = '';
  pendingAudioBlob = null;
  messageSentThisTurn = false;
  finalTranscriptReceivedThisTurn = false;
  if (elements.transcriptConfirmation) {
    elements.transcriptConfirmation.hidden = true;
  }
  elements.outputYou.textContent = '点击麦克风重新录音...';
  elements.outputYou.style.opacity = '1';
  showToast('请点击麦克风重新录音。', 'info');
}

function submitRecognizedText(text, options = {}) {
  const transcript = String(text || '').trim();
  if (!transcript || messageSentThisTurn) return;

  const currentMode = AppState.currentMode || AppState.learningMode || 'conversation';

  messageSentThisTurn = true;
  finalTranscriptReceivedThisTurn = Boolean(options.isFinal);
  lastFinalTranscriptAt = Date.now();
  pendingPronunciationText = transcript;
  latestTranscriptThisTurn = transcript;

  elements.outputYou.textContent = transcript;
  elements.outputYou.style.opacity = '1';

  analyzeUserSpeech(transcript);
  addToConversationHistory('user', transcript);

  console.log('🔄 Showing loading indicator');
  showLoadingIndicator();

  const messageData = {
    text: transcript,
    model: AppState.settings.aiModel,
    personality: AppState.tutorMode,
    learningMode: currentMode,
    difficultyLevel: AppState.difficultyLevel,
    feedbackStyle: AppState.feedbackStyle,
    sessionContext: {
      messagesCount: AppState.currentSession.messagesCount,
      wordsSpoken: AppState.currentSession.wordsSpoken,
      currentScores: AppState.scores,
      learningMode: currentMode,
      scenario: AppState.selectedScenario,
      scenarioContext: AppState.scenarioContext,
      recoveredFromInterim: Boolean(options.recoveredFromInterim)
    }
  };

  console.log('📤 Sending enhanced message to server:', messageData);
  socket.emit('chat message', messageData);

  AppState.currentSession.messagesCount++;
  AppState.currentSession.wordsSpoken += transcript.split(/\s+/).length;

  if (pendingAudioBlob && pendingAudioBlob.size > 0) {
    evaluatePronunciation(pendingAudioBlob, transcript);
    pendingAudioBlob = null;
  }
}

// Analyze user speech for comprehensive scoring
function analyzeUserSpeech(text) {
  const words = text.split(' ');
  const wordCount = words.length;
  
  // Update session stats
  AppState.currentSession.interactions.push({
    timestamp: new Date().toISOString(),
    text: text,
    wordCount: wordCount,
    analysis: {
      complexity: calculateComplexity(text),
      vocabularyLevel: assessVocabulary(text),
      grammarScore: estimateGrammar(text),
      fluencyIndicators: assessFluency(text)
    }
  });
  
  // Add words to vocabulary set
  words.forEach(word => {
    if (word.length > 3) {
      AppState.currentSession.vocabularyUsed.add(word.toLowerCase());
    }
  });
  
  console.log('📊 Speech analyzed:', {
    wordCount,
    totalWords: AppState.currentSession.wordsSpoken,
    vocabularyUsed: AppState.currentSession.vocabularyUsed.size
  });
}

// Calculate text complexity
function calculateComplexity(text) {
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const words = text.split(' ');
  const avgWordsPerSentence = words.length / Math.max(sentences.length, 1);
  const longWords = words.filter(word => word.length > 6).length;
  
  return {
    avgWordsPerSentence,
    longWordRatio: longWords / words.length,
    sentenceCount: sentences.length,
    complexity: Math.min(100, (avgWordsPerSentence * 2) + (longWords * 5))
  };
}

// Assess vocabulary level
function assessVocabulary(text) {
  const words = text.toLowerCase().split(' ');
  const uniqueWords = new Set(words);
  const commonWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'];
  const advancedWords = words.filter(word => word.length > 6 && !commonWords.includes(word));
  
  return {
    uniqueWordRatio: uniqueWords.size / words.length,
    advancedWordCount: advancedWords.length,
    vocabularyRichness: Math.min(100, (uniqueWords.size * 10) + (advancedWords.length * 15))
  };
}

// Estimate grammar quality
function estimateGrammar(text) {
  // Basic grammar indicators
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const hasProperCapitalization = /^[A-Z]/.test(text.trim());
  const hasProperPunctuation = /[.!?]$/.test(text.trim());
  const hasVariedSentenceStructure = sentences.some(s => s.includes(','));
  
  let score = 50; // Base score
  if (hasProperCapitalization) score += 15;
  if (hasProperPunctuation) score += 15;
  if (hasVariedSentenceStructure) score += 20;
  
  return Math.min(100, score);
}

// Assess fluency indicators
function assessFluency(text) {
  const fillerWords = ['um', 'uh', 'like', 'you know', 'actually', 'basically'];
  const words = text.toLowerCase().split(' ');
  const fillerCount = words.filter(word => fillerWords.includes(word)).length;
  const fluencyScore = Math.max(0, 100 - (fillerCount * 10));
  
  return {
    fillerWordCount: fillerCount,
    fluencyScore,
    wordFlow: words.length > 10 ? 'good' : 'short'
  };
}

// Enhanced recording control with better error handling
function toggleRecording() {
  if (!recognition) {
    showError('语音识别不可用，请刷新页面后重试。');
    return;
  }
  
  if (AppState.isRecording) {
    try {
      recognition.stop();
      console.log('🛑 Stopping speech recognition...');
    } catch (error) {
      console.error('Error stopping recognition:', error);
      AppState.isRecording = false;
      elements.micBtn.classList.remove('recording');
    }
  } else {
    startRecording();
  }
}

// Enhanced recording start with comprehensive checks
async function startRecording() {
  try {
    console.log('🎤 Attempting to start recording...');
    finalTranscriptReceivedThisTurn = false;
    pendingPronunciationText = '';
    latestTranscriptThisTurn = '';
    messageSentThisTurn = false;
    pendingAudioBlob = null;
    if (elements.transcriptConfirmation) {
      elements.transcriptConfirmation.hidden = true;
    }
    stopCurrentSpeech();

    if (!window.isSecureContext) {
      showDetailedError('当前页面不是浏览器认可的安全来源，所以 Chrome 会阻止麦克风权限。', [
        '请使用 http://localhost:3011/?v=cn 打开',
        '或给服务配置 HTTPS'
      ]);
      return;
    }
    
    // Check if recognition is available
    if (!recognition) {
      initializeSpeechRecognition();
    }

    if (!recognition) {
      throw new Error('Speech recognition not initialized');
    }
    
    // Check microphone permissions first
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      console.log('🔍 Testing microphone access...');
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100
        } 
      });
      
      console.log('✅ Microphone access granted');
      
      startAudioCapture(stream);
      
      // Update UI to show recording state
      elements.micBtn.classList.add('recording');
      AppState.isRecording = true;
      
      // Start voice visualization
      startVoiceVisualization();
      
      // Start speech recognition
      recognition.start();
      console.log('🎤 Speech recognition started successfully');
      
      // Initialize session if needed
      if (!AppState.currentSession.startTime) {
        AppState.currentSession.startTime = new Date();
        AppState.sessionStartTime = Date.now();
        console.log('📊 Session started');
      }
      
      // Show status feedback
      showToast('正在聆听，请开始说英语。', 'info');
      
    } else {
      throw new Error('Media devices not supported in this browser');
    }
  } catch (error) {
    console.error('❌ Failed to start recording:', error);
    stopAudioCapture(false);
    AppState.isRecording = false;
    elements.micBtn.classList.remove('recording');
    handleMicrophoneError(error);
  }
}

function startAudioCapture(stream) {
  stopAudioCapture(false);
  activeRecordingStream = stream;
  recordedChunks = [];
  pcmChunks = [];

  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) {
    console.warn('AudioContext is not supported; pronunciation scoring will use text fallback.');
    return;
  }

  try {
    pcmAudioContext = new AudioContextClass();
    pcmSampleRate = pcmAudioContext.sampleRate || 16000;
    pcmSourceNode = pcmAudioContext.createMediaStreamSource(stream);
    pcmProcessorNode = pcmAudioContext.createScriptProcessor(4096, 1, 1);
    pcmProcessorNode.onaudioprocess = event => {
      if (!AppState.isRecording) return;
      const input = event.inputBuffer.getChannelData(0);
      pcmChunks.push(new Float32Array(input));
    };
    pcmSourceNode.connect(pcmProcessorNode);
    pcmProcessorNode.connect(pcmAudioContext.destination);
  } catch (error) {
    console.warn('PCM audio capture failed; pronunciation scoring will use text fallback.', error);
    cleanupAudioCaptureStream();
  }
}

function stopAudioCapture(shouldUpload = true) {
  if (!pcmAudioContext && !activeRecordingStream) {
    cleanupAudioCaptureStream();
    return;
  }

  const transcript = pendingPronunciationText;
  const chunks = pcmChunks.slice();
  const sourceSampleRate = pcmSampleRate;
  pcmChunks = [];

  cleanupAudioCaptureStream();

  if (!shouldUpload || chunks.length === 0) {
    return;
  }

  const blob = encodeWavBlob(chunks, sourceSampleRate, 16000);
  if (blob.size > 0 && transcript) {
    evaluatePronunciation(blob, transcript);
  } else if (blob.size > 0) {
    pendingAudioBlob = blob;
  }
}

function cleanupAudioCaptureStream() {
  if (pcmProcessorNode) {
    pcmProcessorNode.disconnect();
    pcmProcessorNode.onaudioprocess = null;
    pcmProcessorNode = null;
  }
  if (pcmSourceNode) {
    pcmSourceNode.disconnect();
    pcmSourceNode = null;
  }
  if (pcmAudioContext) {
    pcmAudioContext.close().catch(() => {});
    pcmAudioContext = null;
  }
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    try { mediaRecorder.stop(); } catch (error) {}
  }
  mediaRecorder = null;
  recordedChunks = [];
  if (activeRecordingStream) {
    activeRecordingStream.getTracks().forEach(track => track.stop());
    activeRecordingStream = null;
  }
}

function encodeWavBlob(chunks, sourceSampleRate, targetSampleRate) {
  const samples = mergeFloat32Chunks(chunks);
  const downsampled = downsampleBuffer(samples, sourceSampleRate, targetSampleRate);
  const wavBuffer = encodePcm16Wav(downsampled, targetSampleRate);
  return new Blob([wavBuffer], { type: 'audio/wav' });
}

function mergeFloat32Chunks(chunks) {
  const length = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const result = new Float32Array(length);
  let offset = 0;
  chunks.forEach(chunk => {
    result.set(chunk, offset);
    offset += chunk.length;
  });
  return result;
}

function downsampleBuffer(buffer, sourceSampleRate, targetSampleRate) {
  if (targetSampleRate === sourceSampleRate) return buffer;
  const ratio = sourceSampleRate / targetSampleRate;
  const newLength = Math.round(buffer.length / ratio);
  const result = new Float32Array(newLength);
  let offsetResult = 0;
  let offsetBuffer = 0;

  while (offsetResult < result.length) {
    const nextOffsetBuffer = Math.round((offsetResult + 1) * ratio);
    let accumulator = 0;
    let count = 0;
    for (let i = offsetBuffer; i < nextOffsetBuffer && i < buffer.length; i++) {
      accumulator += buffer[i];
      count++;
    }
    result[offsetResult] = count > 0 ? accumulator / count : 0;
    offsetResult++;
    offsetBuffer = nextOffsetBuffer;
  }
  return result;
}

function encodePcm16Wav(samples, sampleRate) {
  const bytesPerSample = 2;
  const blockAlign = bytesPerSample;
  const buffer = new ArrayBuffer(44 + samples.length * bytesPerSample);
  const view = new DataView(buffer);
  writeAscii(view, 0, 'RIFF');
  view.setUint32(4, 36 + samples.length * bytesPerSample, true);
  writeAscii(view, 8, 'WAVE');
  writeAscii(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true);
  writeAscii(view, 36, 'data');
  view.setUint32(40, samples.length * bytesPerSample, true);

  let offset = 44;
  for (let i = 0; i < samples.length; i++, offset += 2) {
    const sample = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
  }
  return buffer;
}

function writeAscii(view, offset, text) {
  for (let i = 0; i < text.length; i++) {
    view.setUint8(offset + i, text.charCodeAt(i));
  }
}

function escapeFeedbackHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[char]));
}

function renderMiniFeedbackCard({
  targetId,
  cardClass,
  badge,
  title,
  description,
  points = [],
  tags = []
}) {
  const target = document.getElementById(targetId);
  if (!target) return;

  const pointHtml = points
    .filter(point => point && point.value)
    .map(point => `
      <div class="mini-feedback-point">
        <span>${escapeFeedbackHtml(point.label)}</span>
        <strong>${escapeFeedbackHtml(point.value)}</strong>
      </div>
    `)
    .join('');
  const tagHtml = tags
    .filter(Boolean)
    .map(tag => `<span class="mini-feedback-tag">${escapeFeedbackHtml(tag)}</span>`)
    .join('');

  target.innerHTML = `
    <div class="mini-feedback-card ${cardClass}">
      <div class="mini-feedback-top">
        <div class="mini-feedback-badge">${escapeFeedbackHtml(badge)}</div>
        <div class="mini-feedback-copy">
          <strong>${escapeFeedbackHtml(title)}</strong>
          <p>${escapeFeedbackHtml(description)}</p>
        </div>
      </div>
      ${pointHtml ? `<div class="mini-feedback-points">${pointHtml}</div>` : ''}
      ${tagHtml ? `<div class="mini-feedback-tags">${tagHtml}</div>` : ''}
    </div>
  `;
}

function setGrammarFeedbackCard({ title, description, issue, correction, focusTags = [] }) {
  renderMiniFeedbackCard({
    targetId: 'grammar-feedback',
    cardClass: 'grammar-card',
    badge: 'Ab',
    title,
    description,
    points: [
      { label: '问题', value: issue },
      { label: '建议', value: correction }
    ],
    tags: focusTags
  });
}

function setVocabularyFeedbackCard({ title, description, better, scenario, tags = [] }) {
  renderMiniFeedbackCard({
    targetId: 'vocabulary-feedback',
    cardClass: 'vocab-card',
    badge: 'B',
    title,
    description,
    points: [
      { label: '表达', value: better },
      { label: '场景', value: scenario }
    ],
    tags
  });
}

function updateFeedbackPanelForMode(mode, scenario = '') {
  const panelTitle = document.getElementById('training-panel-title');
  const items = document.querySelectorAll('.feedback-item');

  if (items.length === 0) return;

  if (panelTitle) {
    panelTitle.innerHTML = '<i class="fas fa-lightbulb"></i> 当前训练提示';
  }

  const setItem = (index, icon, title, text) => {
    const item = items[index];
    if (!item) return;
    const h5 = item.querySelector('h5');
    const div = item.querySelector('div');

    if (h5) h5.innerHTML = `<i class="${icon}"></i> ${title}`;
    if (div) div.textContent = text;
  };

  const scenarioNames = {
    'job-interview': '求职面试',
    restaurant: '餐厅点餐',
    meeting: '会议讨论',
    travel: '旅行出行',
    shopping: '购物交流',
    medical: '看医生',
    social: '社交聊天'
  };

  const scenarioTasks = {
    'job-interview': '完成面试对话，介绍自己并说明你为什么适合这个岗位。',
    restaurant: '完成点餐对话，询问菜单、推荐菜或表达你的需求。',
    meeting: '完成会议交流，表达观点、补充信息或确认下一步。',
    travel: '完成旅行场景交流，比如问路、入住酒店或机场沟通。',
    shopping: '完成购物交流，询问价格、尺码、颜色或退换货。',
    medical: '清楚描述症状，并回答医生的问题。',
    social: '开始并延续一段自然的英文闲聊。'
  };

  const scenarioTips = {
    'job-interview': '尽量用完整句回答，例如 I have experience in... / I am interested in this role because...',
    restaurant: '多用礼貌表达，例如 Could I have...? / What do you recommend?',
    meeting: '多用连接表达，例如 In my opinion... / The next step is...',
    travel: '问题可以简单清楚，例如 Could you help me find...? / Where is...?',
    shopping: '可以问 How much is this? / Do you have this in another size?',
    medical: '尽量使用症状词，例如 pain, cough, fever, headache。',
    social: '多问 follow-up questions，例如 What about you? / How was it?'
  };

  if (mode === 'scenario') {
    if (items[0] && items[0].querySelector('h5')) items[0].querySelector('h5').innerHTML = '<i class="fas fa-bullseye"></i> 任务';
    if (items[1] && items[1].querySelector('h5')) items[1].querySelector('h5').innerHTML = '<i class="fas fa-lightbulb"></i> 提示';
    if (items[2] && items[2].querySelector('h5')) items[2].querySelector('h5').innerHTML = '<i class="fas fa-briefcase"></i> 场景';
    setGrammarFeedbackCard({
      title: '当前任务',
      description: scenarioTasks[scenario] || '根据当前场景，用英文自然完成对话。',
      issue: '用完整句回答，不只说单词',
      correction: '先完成当前角色对话，再关注细节纠错',
      focusTags: ['场景目标', '完整句']
    });
    setPronunciationFeedback(scenarioTips[scenario] || '尽量使用完整英文句子，不要只回答单词。');
    setVocabularyFeedbackCard({
      title: '场景表达',
      description: '系统会结合当前场景给你更自然的说法。',
      better: scenarioTips[scenario] || '使用礼貌、清楚、完整的表达。',
      scenario: scenarioNames[scenario] || '场景陪练',
      tags: ['角色对话', '自然表达']
    });
    return;
  }

  if (mode === 'grammar') {
    if (items[0] && items[0].querySelector('h5')) items[0].querySelector('h5').innerHTML = '<i class="fas fa-spell-check"></i> 语法';
    if (items[1] && items[1].querySelector('h5')) items[1].querySelector('h5').innerHTML = '<i class="fas fa-microphone-alt"></i> 发音';
    if (items[2] && items[2].querySelector('h5')) items[2].querySelector('h5').innerHTML = '<i class="fas fa-book-open"></i> 表达';
    setGrammarFeedbackCard({
      title: '语法专项已开启',
      description: '我会优先检查时态、冠词、介词、主谓一致和句子结构。',
      issue: '等待你的英文句子',
      correction: '说一句完整英文，我会给出正确表达和原因',
      focusTags: ['时态', '冠词', '句子结构']
    });
    setPronunciationFeedback('语法专项下，发音不是主要评分项。请先保证句子完整。');
    setVocabularyFeedbackCard({
      title: '表达改写',
      description: '语法修正后，会给你一句可以直接跟读的自然英文。',
      better: '等待 AI 生成更自然的表达',
      scenario: '语法专项',
      tags: ['正确表达', '跟读句']
    });
    return;
  }

  if (mode === 'pronunciation') {
    if (items[0] && items[0].querySelector('h5')) items[0].querySelector('h5').innerHTML = '<i class="fas fa-spell-check"></i> 语法';
    if (items[1] && items[1].querySelector('h5')) items[1].querySelector('h5').innerHTML = '<i class="fas fa-microphone-alt"></i> 发音';
    if (items[2] && items[2].querySelector('h5')) items[2].querySelector('h5').innerHTML = '<i class="fas fa-book-open"></i> 表达';
    setGrammarFeedbackCard({
      title: '句子完整度',
      description: '发音训练时，语法只做轻量提示。',
      issue: '优先跟读目标句',
      correction: '先读准，再逐步加长句子',
      focusTags: ['完整句', '跟读']
    });
    setPronunciationFeedback('点击麦克风后，我会显示发音总分、准确度、流利度、完整度和问题词。');
    setVocabularyFeedbackCard({
      title: '跟读表达',
      description: '当前重点是把目标句读清楚。',
      better: '重复 AI 给出的 Please repeat after me 句子',
      scenario: '发音训练',
      tags: ['重音', '停顿', '连读']
    });
    return;
  }

  if (mode === 'vocabulary') {
    if (items[0] && items[0].querySelector('h5')) items[0].querySelector('h5').innerHTML = '<i class="fas fa-spell-check"></i> 语法';
    if (items[1] && items[1].querySelector('h5')) items[1].querySelector('h5').innerHTML = '<i class="fas fa-microphone-alt"></i> 发音';
    if (items[2] && items[2].querySelector('h5')) items[2].querySelector('h5').innerHTML = '<i class="fas fa-book-open"></i> 表达';
    setGrammarFeedbackCard({
      title: '基础语法检查',
      description: '表达训练会顺手保证句子语法正确。',
      issue: '等待你的原始表达',
      correction: '先说出意思，再由 AI 升级表达',
      focusTags: ['清楚表达', '句子完整']
    });
    setPronunciationFeedback('表达专项下，发音会作为辅助指标显示。');
    setVocabularyFeedbackCard({
      title: '表达升级已开启',
      description: '我会把普通英文改成更自然、更地道的说法。',
      better: '等待你的句子',
      scenario: '词汇表达',
      tags: ['Better', '地道表达', '跟读']
    });
    return;
  }

  if (mode === 'fluency') {
    if (items[0] && items[0].querySelector('h5')) items[0].querySelector('h5').innerHTML = '<i class="fas fa-spell-check"></i> 语法';
    if (items[1] && items[1].querySelector('h5')) items[1].querySelector('h5').innerHTML = '<i class="fas fa-microphone-alt"></i> 发音';
    if (items[2] && items[2].querySelector('h5')) items[2].querySelector('h5').innerHTML = '<i class="fas fa-book-open"></i> 表达';
    setGrammarFeedbackCard({
      title: '连贯表达检查',
      description: '流利度训练会关注句子之间是否自然衔接。',
      issue: '短句或停顿过多会降低连贯感',
      correction: '尝试使用 because, also, for example, so',
      focusTags: ['连接词', '句子衔接']
    });
    setPronunciationFeedback('流利度专项下，我会辅助显示语速和清晰度表现。');
    setVocabularyFeedbackCard({
      title: '连贯表达',
      description: '目标是把短句扩展成 2-3 句自然回答。',
      better: '加入原因、例子或下一步说明',
      scenario: '流利度训练',
      tags: ['because', 'also', 'for example']
    });
    return;
  }

  if (items[0] && items[0].querySelector('h5')) items[0].querySelector('h5').innerHTML = '<i class="fas fa-spell-check"></i> 语法';
  if (items[1] && items[1].querySelector('h5')) items[1].querySelector('h5').innerHTML = '<i class="fas fa-microphone-alt"></i> 发音';
  if (items[2] && items[2].querySelector('h5')) items[2].querySelector('h5').innerHTML = '<i class="fas fa-book-open"></i> 表达';
  setGrammarFeedbackCard({
    title: '自由对话',
    description: '我会在不打断对话的情况下给你轻量语法提醒。',
    issue: '等待你的英文输入',
    correction: '尽量使用完整句表达想法',
    focusTags: ['自然交流', '轻量纠错']
  });
  setPronunciationFeedback('开始录音后，这里会显示发音评分。');
  setVocabularyFeedbackCard({
    title: '自然表达',
    description: '对话过程中会沉淀更自然的说法。',
    better: '听 AI 回复后继续用英文回答',
    scenario: '自由对话',
    tags: ['完整句', '自然回复']
  });
}

async function evaluatePronunciation(audioBlob, transcript) {
  try {
    setPronunciationFeedback('正在分析你的发音...');
    const audioBase64 = await blobToDataUrl(audioBlob);
    const response = await fetch('/api/pronunciation-evaluate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        audioBase64,
        expectedText: transcript,
        transcript
      })
    });

    if (!response.ok) {
      throw new Error(`Pronunciation API failed: ${response.status}`);
    }

    const result = await response.json();
    applyPronunciationResult(result);
  } catch (error) {
    console.error('Pronunciation evaluation failed:', error);
    setPronunciationFeedback('Pronunciation scoring is temporarily unavailable. Your conversation feedback still works.');
  }
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function applyPronunciationResult(result) {
  const score = Math.max(0, Math.min(100, Math.round(result.score || 0)));
  const metrics = result.metrics || {};
  addScoreRecord({ pronunciation: score }, result.source || 'pronunciation');
  AppState.currentSession.pronunciationResults.push({
    score,
    transcript: result.transcript || '',
    errors: result.errors || [],
    feedback: result.feedback || '',
    metrics,
    source: result.source || 'openpronounce'
  });
  updateProgressDisplay();

  const metricParts = [];
  if (Number.isFinite(Number(metrics.accuracy)) && metrics.accuracy > 0) metricParts.push(`准确度 ${Math.round(metrics.accuracy)}%`);
  if (Number.isFinite(Number(metrics.fluency)) && metrics.fluency > 0) metricParts.push(`流利度 ${Math.round(metrics.fluency)}%`);
  if (Number.isFinite(Number(metrics.completion)) && metrics.completion > 0) metricParts.push(`完整度 ${Math.round(metrics.completion)}%`);
  if (Number.isFinite(Number(metrics.prosody)) && metrics.prosody > 0) metricParts.push(`韵律 ${Math.round(metrics.prosody)}%`);

  const errorWords = (result.errors || [])
    .map(item => item.word || item.expected)
    .filter(Boolean)
    .slice(0, 4);
  const detail = [
    metricParts.length ? metricParts.join('，') : '',
    errorWords.length ? `重点练习单词：${errorWords.join(', ')}` : '',
    result.feedback || ''
  ].filter(Boolean).join('。');

  setPronunciationFeedback(`发音总分：${score}%。${detail}`, {
    score,
    metrics,
    errorWords,
    feedback: result.feedback || ''
  });
}

function setPronunciationFeedback(message, detail = null) {
  const target = document.getElementById('pronunciation-feedback');
  if (!target) return;

  if (!detail) {
    target.textContent = message;
    return;
  }

  const safe = value => String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[char]));
  const metricValue = key => {
    const value = Number(detail.metrics?.[key]);
    return Number.isFinite(value) && value > 0 ? `${Math.round(value)}%` : '--';
  };
  const tags = (detail.errorWords || [])
    .map(word => `<span class="pron-tag">${safe(word)}</span>`)
    .join('');
  const advice = detail.feedback || '继续保持清晰语速，注意单词发完整。';

  target.innerHTML = `
    <div class="pron-score-card">
      <div class="pron-score-top">
        <div class="pron-score-ring" style="--score:${Math.max(0, Math.min(100, detail.score || 0))}"><span>${Math.round(detail.score || 0)}</span></div>
        <div class="pron-score-copy">
          <strong>本次发音评分</strong>
          <p>基于腾讯云口语评测，分数会随每次录音实时更新。</p>
        </div>
      </div>
      <div class="pron-metrics">
        <div class="pron-metric"><span>准确度</span><strong>${metricValue('accuracy')}</strong></div>
        <div class="pron-metric"><span>流利度</span><strong>${metricValue('fluency')}</strong></div>
        <div class="pron-metric"><span>完整度</span><strong>${metricValue('completion')}</strong></div>
        <div class="pron-metric"><span>韵律</span><strong>${metricValue('prosody')}</strong></div>
      </div>
      ${tags ? `<div class="pron-tags">${tags}</div>` : ''}
      <p class="pron-advice">${safe(advice)}</p>
    </div>
  `;
}

// Voice Loading
function loadAvailableVoices() {
  const updateVoices = () => {
    availableVoices = speechSynthesis.getVoices();
    populateVoiceSelect();
  };
  
  updateVoices();
  speechSynthesis.addEventListener('voiceschanged', updateVoices);
}

function populateVoiceSelect() {
  elements.voiceSelect.innerHTML = '<option value="">默认声音</option>';
  
  availableVoices.forEach(voice => {
    const option = document.createElement('option');
    option.value = voice.name;
    option.textContent = `${voice.name} (${voice.lang})`;
    if (voice.name === AppState.settings.selectedVoice) {
      option.selected = true;
    }
    elements.voiceSelect.appendChild(option);
  });
}

// Enhanced Event Listeners Setup
function setupEventListeners() {
  // Microphone button
  if (elements.micBtn) elements.micBtn.addEventListener('click', toggleRecording);
  
  // Control buttons
  if (elements.themeBtn) elements.themeBtn.addEventListener('click', toggleTheme);
  if (elements.settingsBtn) elements.settingsBtn.addEventListener('click', toggleSettings);
  if (elements.muteBtn) elements.muteBtn.addEventListener('click', toggleMute);
  if (elements.stopBtn) elements.stopBtn.addEventListener('click', stopCurrentSpeech);
  if (elements.summaryBtn) elements.summaryBtn.addEventListener('click', requestSessionSummary);
  if (elements.sendTranscriptBtn) elements.sendTranscriptBtn.addEventListener('click', confirmTranscriptAndSend);
  if (elements.retryRecordingBtn) elements.retryRecordingBtn.addEventListener('click', retryTranscriptRecording);
  if (elements.closeSettingsBtn) elements.closeSettingsBtn.addEventListener('click', closeSettings);
  if (elements.clearHistoryBtn) elements.clearHistoryBtn.addEventListener('click', clearConversationHistory);
  
  // Settings
  if (elements.tutorModeSelect) elements.tutorModeSelect.addEventListener('change', updatePersonality);
  if (elements.difficultyLevelSelect) elements.difficultyLevelSelect.addEventListener('change', updateDifficultyLevel);
  if (elements.feedbackStyleSelect) elements.feedbackStyleSelect.addEventListener('change', updateFeedbackStyle);
  if (elements.languageSelect) elements.languageSelect.addEventListener('change', updateLanguage);
  if (elements.voiceSelect) elements.voiceSelect.addEventListener('change', updateSelectedVoice);
  if (elements.sessionLengthSelect) elements.sessionLengthSelect.addEventListener('change', updateSessionLength);
  
  // Learning Mode Cards
  setupModeCardListeners();
  
  // Dashboard Toggle
  setupDashboardToggle();
  
  // Feedback Panel Toggle
  setupFeedbackToggle();
  
  // Socket events
  socket.on('connect', handleSocketConnect);
  socket.on('disconnect', handleSocketDisconnect);
  socket.on('tutor response', handleTutorResponse);
  socket.on('bot reply', handleBotReply); // Keep for backward compatibility
  socket.on('error', handleSocketError);
  
  // Add debugging for all socket events
  socket.onAny((event, ...args) => {
    console.log('🔌 Socket event received:', event, args);
  });
  
  // Keyboard shortcuts
  document.addEventListener('keydown', handleKeyboardShortcuts);
  
  // Click outside settings to close
  document.addEventListener('click', handleOutsideClick);
  
  // Add smooth scroll behavior
  document.documentElement.style.scrollBehavior = 'smooth';
  
  // Initialize animations
  initializeAnimations();
}

// Setup Mode Card Interactions
function setupModeCardListeners() {
  const modeCards = document.querySelectorAll('.mode-card');
  
  modeCards.forEach(card => {
    card.addEventListener('click', () => {
      // Remove active class from all cards
      modeCards.forEach(c => c.classList.remove('active'));
      
      // Add active class to clicked card
      card.classList.add('active');
      
      // Update learning mode
      const mode = card.getAttribute('data-mode');
      if (mode) {
        AppState.learningMode = mode;
        localStorage.setItem('learningMode', mode);
        
        // Update tutor mode based on learning mode
        updateTutorModeFromLearningMode(mode);
        updateConversationContext(mode, AppState.selectedScenario);
        applyModeIntro(mode);
        
        // Show toast notification
        const modeName = card.querySelector('h4').textContent;
        showToast(`已切换到「${modeName}」模式`, 'success');
        
        // Add bounce animation
        card.style.animation = 'none';
        setTimeout(() => {
          card.style.animation = 'bounce 0.6s ease';
        }, 10);
      }
      
      // Handle scenario mode specially
      if (mode === 'scenario') {
        openScenarioModal();
      }
    });
    
    // Add hover sound effect (optional)
    card.addEventListener('mouseenter', () => {
      card.style.transform = 'translateY(-8px) scale(1.02)';
    });
    
    card.addEventListener('mouseleave', () => {
      if (!card.classList.contains('active')) {
        card.style.transform = '';
      }
    });
  });
}

// Update tutor mode based on learning mode
function applyModeIntro(mode) {
  updateConversationContext(mode, AppState.selectedScenario);

  const intros = {
    conversation: {
      user: '自由对话模式：点击麦克风，随便说一句英文开始聊天。',
      bot: '自由对话模式已开启。我会像真实聊天伙伴一样回应你，并给出轻量反馈。'
    },
    grammar: {
      user: '语法专项模式：请说一个完整英文句子，例如：I go to school yesterday.',
      bot: '语法专项模式已开启。这个模式会重点检查你的英文句子语法。我会按「错误定位 → 正确表达 → 中文解释 → 跟读练习」来反馈，而不是普通聊天。'
    },
    pronunciation: {
      user: '发音训练模式：请点击麦克风，跟读下面这句话。',
      bot: '发音训练模式已开启。请跟读：I would like to improve my pronunciation.'
    },
    vocabulary: {
      user: '词汇表达模式：请说一句你想表达的英文。',
      bot: '词汇表达模式已开启。我会帮你把句子改得更自然、更地道。'
    },
    fluency: {
      user: '流利度训练模式：请连续说 2-3 句英文。',
      bot: '流利度训练模式已开启。我会关注你的表达连贯性、句子长度和连接词使用。'
    },
    scenario: {
      user: '场景陪练模式：请先选择一个真实场景。',
      bot: '场景陪练模式已开启。请选择面试、点餐、会议、旅行等场景，我会进入对应角色。'
    }
  };

  const intro = intros[mode] || intros.conversation;

  if (elements.outputYou) {
    elements.outputYou.textContent = intro.user;
    elements.outputYou.style.opacity = '1';
  }

  if (elements.outputBot) {
    elements.outputBot.textContent = intro.bot;
  }

  if (elements.transcriptConfirmation) {
    elements.transcriptConfirmation.hidden = true;
  }

  if (mode === 'grammar') {
    const grammarFeedback = document.getElementById('grammar-feedback');
    const pronunciationFeedback = document.getElementById('pronunciation-feedback');
    const vocabularyFeedback = document.getElementById('vocabulary-feedback');

    setGrammarFeedbackCard({
      title: '语法专项已开启',
      description: '系统会优先指出语法错误，例如时态、主谓一致、冠词、介词、句子结构等。',
      issue: '等待你的英文句子',
      correction: '说一句完整英文，我会给出正确表达和原因',
      focusTags: ['时态', '冠词', '句子结构']
    });

    setPronunciationFeedback('语法专项下，发音不是主要评分项。请先保证句子完整。');

    setVocabularyFeedbackCard({
      title: '表达改写',
      description: '系统会给你一条更正确、更自然、可以直接跟读的英文改写句。',
      better: '等待 AI 生成改写句',
      scenario: '语法专项',
      tags: ['正确表达', '跟读']
    });

    showToast('已进入语法专项模式：请说一个完整英文句子。', 'success');
  }
}

function updateTutorModeFromLearningMode(learningMode) {
  const modeMapping = {
    'conversation': 'conversation_partner',
    'grammar': 'grammar_tutor',
    'pronunciation': 'pronunciation_coach',
    'vocabulary': 'vocabulary_builder',
    'fluency': 'fluency_coach',
    'scenario': 'conversation_partner'
  };
  
  const tutorMode = modeMapping[learningMode] || 'conversation_partner';
  AppState.tutorMode = tutorMode;
  localStorage.setItem('tutorMode', tutorMode);
  
  // Update the select element if it exists
  if (elements.tutorModeSelect) {
    elements.tutorModeSelect.value = tutorMode;
  }
}

function extractSpeakText(reply) {
  if (!reply) return '';

  // 优先提取“正确表达”后面的英文句子
  const correctMatch = reply.match(/正确表达[:：]\s*["“]?([^"\n。]+[.!?])["”]?/i);
  if (correctMatch && correctMatch[1]) {
    return correctMatch[1].trim();
  }

  // 其次提取“请跟我读”后面的英文句子
  const repeatMatch = reply.match(/请跟我读[:：]?\s*["“]?([^"\n。]+[.!?])["”]?/i);
  if (repeatMatch && repeatMatch[1]) {
    return repeatMatch[1].trim();
  }

  // 兜底：只提取第一句英文
  const englishMatch = reply.match(/[A-Za-z][A-Za-z0-9\s,'’\-]+[.!?]/);
  if (englishMatch) {
    return englishMatch[0].trim();
  }

  return '';
}

// Setup Dashboard Toggle
function setupDashboardToggle() {
  const toggleBtn = document.getElementById('toggle-dashboard');
  const dashboardContent = document.querySelector('.dashboard-content');
  
  if (toggleBtn && dashboardContent) {
    toggleBtn.addEventListener('click', () => {
      const isOpen = dashboardContent.style.display !== 'none';
      
      if (isOpen) {
        dashboardContent.style.display = 'none';
        toggleBtn.querySelector('i').className = 'fas fa-chevron-down';
        toggleBtn.setAttribute('aria-label', 'Expand dashboard');
      } else {
        dashboardContent.style.display = 'block';
        toggleBtn.querySelector('i').className = 'fas fa-chevron-up';
        toggleBtn.setAttribute('aria-label', 'Collapse dashboard');
        
        // Animate progress bars
        animateProgressBars();
      }
      
      // Add rotation animation to button
      toggleBtn.style.transform = 'scale(1.1) rotate(180deg)';
      setTimeout(() => {
        toggleBtn.style.transform = '';
      }, 300);
    });
  }
}

// Setup Feedback Panel Toggle
function setupFeedbackToggle() {
  const toggleBtn = document.getElementById('toggle-feedback');
  const feedbackContent = document.querySelector('.feedback-content');
  
  if (toggleBtn && feedbackContent) {
    toggleBtn.addEventListener('click', () => {
      const isOpen = feedbackContent.style.display !== 'none';
      
      if (isOpen) {
        feedbackContent.style.display = 'none';
        toggleBtn.querySelector('i').className = 'fas fa-chevron-down';
      } else {
        feedbackContent.style.display = 'block';
        toggleBtn.querySelector('i').className = 'fas fa-chevron-up';
      }
      
      // Add rotation animation
      toggleBtn.style.transform = 'scale(1.1) rotate(180deg)';
      setTimeout(() => {
        toggleBtn.style.transform = '';
      }, 300);
    });
  }
}

// Animate Progress Bars
function animateProgressBars() {
  const progressBars = document.querySelectorAll('.progress-fill');
  progressBars.forEach(bar => {
    bar.style.transition = 'width 0.35s ease-out';
  });
}

// Initialize Animations
function initializeAnimations() {
  // Add slide-in animation to cards
  const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
  };
  
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry, index) => {
      if (entry.isIntersecting) {
        setTimeout(() => {
          entry.target.classList.add('slide-in-up');
        }, index * 100);
        observer.unobserve(entry.target);
      }
    });
  }, observerOptions);
  
  // Observe elements for animation
  const animatedElements = document.querySelectorAll('.mode-card, .progress-card, .stat-item');
  animatedElements.forEach(el => observer.observe(el));
  
  // Initialize progress bar animations
  setTimeout(animateProgressBars, 500);
}

// Scenario Modal Functions
function openScenarioModal() {
  const modal = document.getElementById('scenario-modal');
  if (modal) {
    modal.style.display = 'flex';
    modal.style.animation = 'fadeIn 0.3s ease';
    
    // Setup scenario card listeners
    const scenarioCards = modal.querySelectorAll('.scenario-card');
    scenarioCards.forEach(card => {
      card.addEventListener('click', () => {
        const scenario = card.getAttribute('data-scenario');
        selectScenario(scenario);
        closeScenarioModal();
      });
    });
  }
}

function closeScenarioModal() {
  const modal = document.getElementById('scenario-modal');
  if (modal) {
    modal.style.animation = 'fadeOut 0.3s ease';
    setTimeout(() => {
      modal.style.display = 'none';
    }, 300);
  }
}

let lastScenarioSpokenText = '';
let lastScenarioSpokenAt = 0;

function selectScenario(scenario) {
  AppState.selectedScenario = scenario;
  localStorage.setItem('selectedScenario', scenario);

  const scenarioNames = {
    'job-interview': '求职面试',
    restaurant: '餐厅点餐',
    meeting: '会议讨论',
    travel: '旅行出行',
    shopping: '购物交流',
    medical: '看医生',
    social: '社交聊天'
  };

  const scenarioName = scenarioNames[scenario] || scenario;

  showToast(`已进入「${scenarioName}」场景`, 'success');

  AppState.scenarioContext = getScenarioContext(scenario);
  AppState.learningMode = 'scenario';
  AppState.currentMode = 'scenario';
  localStorage.setItem('learningMode', 'scenario');
  updateConversationContext('scenario', scenario);

  const starter = getScenarioStarter(scenario);

  elements.outputYou.textContent = 'Scenario practice mode. Please respond in English.';
  elements.outputBot.textContent = starter;

  addToConversationHistory('tutor', starter, { scenario });

  updateFeedbackPanelForMode('scenario', scenario);

  if (!AppState.isMuted) {
    const now = Date.now();

    if (starter !== lastScenarioSpokenText || now - lastScenarioSpokenAt > 5000) {
      lastScenarioSpokenText = starter;
      lastScenarioSpokenAt = now;

      window.speechSynthesis.cancel();
      speakText(starter);
    }
  }

  closeScenarioModal();
}

function getScenarioContext(scenario) {
  return SCENARIO_CONTEXTS[scenario] || 'Practice general conversation.';
}

function getScenarioStarter(scenario) {
  const starters = {
    'job-interview': 'Please introduce yourself and tell me why you are interested in this role.',
    restaurant: 'Welcome. Are you ready to order, or would you like a recommendation first?',
    meeting: 'Could you give a quick update on your current progress?',
    travel: 'Good afternoon. How can I help with your trip today?',
    shopping: 'Hi there. What are you looking for today?',
    medical: 'Good morning. What brings you in today?',
    social: 'Nice to meet you. How has your day been so far?'
  };
  return starters[scenario] || 'Please start with one or two sentences.';
}

function forceScenarioFeedbackPanel(scenario) {
  const scenarioNames = {
    'job-interview': 'Interview',
    restaurant: 'Restaurant',
    meeting: 'Meeting',
    travel: 'Travel',
    shopping: 'Shopping',
    medical: 'Medical',
    social: 'Social'
  };

  const scenarioTasks = {
    'job-interview': 'Introduce yourself and explain why you are interested in this role.',
    restaurant: 'Order food, ask about the menu, or ask for a recommendation.',
    meeting: 'Give an update, share your opinion, or confirm next steps.',
    travel: 'Ask for help at the airport, hotel, or during a trip.',
    shopping: 'Ask about products, prices, sizes, or returns.',
    medical: 'Describe your symptoms clearly to the doctor.',
    social: 'Start a casual conversation and keep it going naturally.'
  };

  const scenarioTips = {
    'job-interview': 'Use confident and complete answers.',
    restaurant: 'Use polite phrases like “Could I have...” or “Do you recommend...?”',
    meeting: 'Use clear phrases like “In my opinion...” and “The next step is...”.',
    travel: 'Use simple questions like “Could you help me find...?”',
    shopping: 'Use polite questions like “How much is this?” or “Do you have this in another size?”',
    medical: 'Use clear symptom words like “pain”, “cough”, “fever”, or “headache”.',
    social: 'Use friendly follow-up questions to continue the conversation.'
  };

  const items = document.querySelectorAll('.feedback-item');
  if (items.length === 0) return;

  const firstTitle = items[0].querySelector('h5');
  if (firstTitle) firstTitle.innerHTML = '<i class="fas fa-microphone-alt"></i> 发音';

  setGrammarFeedbackCard({
    title: '当前任务',
    description: scenarioTasks[scenario] || 'Respond naturally in English.',
    issue: '用完整句回答，不只说单词',
    correction: '先完成当前角色对话，再关注细节纠错',
    focusTags: ['场景目标', '完整句']
  });

  setPronunciationFeedback(scenarioTips[scenario] || 'Use complete sentences and polite expressions.');

  setVocabularyFeedbackCard({
    title: '场景表达',
    description: '系统会结合当前场景给你更自然的说法。',
    better: scenarioTips[scenario] || 'Use complete sentences and polite expressions.',
    scenario: scenarioNames[scenario] || 'Scenario',
    tags: ['角色对话', '自然表达']
  });
}
// Enhanced Progress Display
function updateProgressDisplay() {
  const scoreTargets = [
    ['grammar', document.getElementById('grammar-score')],
    ['pronunciation', document.getElementById('pronunciation-score')],
    ['vocabulary', document.getElementById('vocabulary-score')],
    ['fluency', document.getElementById('fluency-score')]
  ];

  scoreTargets.forEach(([key, element]) => {
    const value = Number(AppState.scores[key]);
    if (element) element.textContent = Number.isFinite(value) && value > 0 ? `${Math.round(value)}%` : '--';
  });

  const progressBars = document.querySelectorAll('.progress-fill');
  const scores = [AppState.scores.grammar, AppState.scores.pronunciation, AppState.scores.vocabulary, AppState.scores.fluency];
  progressBars.forEach((bar, index) => {
    const value = Number(scores[index]);
    bar.style.width = Number.isFinite(value) && value > 0 ? `${Math.max(0, Math.min(100, value))}%` : '0%';
  });

  const streakEl = document.getElementById('streak-days');
  const todayMinutesEl = document.getElementById('today-minutes');
  const levelEl = document.getElementById('level-label');
  const streak = calculateStreakDays();
  AppState.analytics.streakDays = streak;
  localStorage.setItem('streakDays', streak);
  if (streakEl) streakEl.textContent = `连续练习 ${streak} 天`;
  if (todayMinutesEl) todayMinutesEl.textContent = `今日 ${getTodayPracticeMinutes()} 分钟`;
  if (levelEl) {
    const levelNames = { beginner: '初级', intermediate: '中级', advanced: '高级', native: '接近母语' };
    levelEl.textContent = `等级：${levelNames[AppState.difficultyLevel] || '中级'}`;
  }

  updateSessionTimer();
}

// Session Timer
function updateSessionTimer() {
  if (!AppState.sessionStartTime) {
    AppState.sessionStartTime = Date.now();
  }
  
  const timerDisplay = document.getElementById('timer-display');
  if (timerDisplay) {
    const elapsed = Date.now() - AppState.sessionStartTime;
    const minutes = Math.floor(elapsed / 60000);
    const seconds = Math.floor((elapsed % 60000) / 1000);
    timerDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
}

// Enhanced Theme Toggle with Animation
function toggleTheme() {
  const currentTheme = AppState.currentTheme === 'light' ? 'dark' : 'light';
  AppState.currentTheme = currentTheme;
  localStorage.setItem('theme', currentTheme);
  
  // Add transition class
  document.body.classList.add('theme-transitioning');
  
  applyTheme(currentTheme);
  
  // Remove transition class after animation
  setTimeout(() => {
    document.body.classList.remove('theme-transitioning');
  }, 300);
  
  // Update theme button icon with animation
  const themeBtn = document.getElementById('theme-btn');
  const icon = themeBtn.querySelector('i');
  
  themeBtn.style.transform = 'scale(0.8) rotate(180deg)';
  
  setTimeout(() => {
    icon.className = currentTheme === 'light' ? 'fas fa-moon' : 'fas fa-sun';
    themeBtn.style.transform = 'scale(1) rotate(0deg)';
  }, 150);
  
  showToast(`已切换到${currentTheme === 'light' ? '浅色' : '深色'}主题`, 'info');
}

// Enhanced Settings Panel with Animations
function toggleSettings() {
  const panel = elements.settingsPanel;
  const isOpen = panel.classList.contains('open');
  
  if (isOpen) {
    closeSettings();
  } else {
    panel.classList.add('open');
    
    // Animate settings groups
    const settingGroups = panel.querySelectorAll('.setting-group');
    settingGroups.forEach((group, index) => {
      group.style.opacity = '0';
      group.style.transform = 'translateX(20px)';
      
      setTimeout(() => {
        group.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
        group.style.opacity = '1';
        group.style.transform = 'translateX(0)';
      }, index * 100);
    });
  }
}

function closeSettings() {
  elements.settingsPanel.classList.remove('open');
  
  // Reset setting group animations
  const settingGroups = elements.settingsPanel.querySelectorAll('.setting-group');
  settingGroups.forEach(group => {
    group.style.transition = '';
    group.style.opacity = '';
    group.style.transform = '';
  });
}

// Add CSS for smooth theme transitions
const themeTransitionCSS = `
.theme-transitioning * {
  transition: background-color 0.3s ease, color 0.3s ease, border-color 0.3s ease !important;
}

@keyframes bounce {
  0%, 20%, 60%, 100% { transform: translateY(0); }
  40% { transform: translateY(-10px); }
  80% { transform: translateY(-5px); }
}

@keyframes fadeIn {
  from { opacity: 0; transform: scale(0.9); }
  to { opacity: 1; transform: scale(1); }
}

@keyframes fadeOut {
  from { opacity: 1; transform: scale(1); }
  to { opacity: 0; transform: scale(0.9); }
}
`;

// Inject CSS
const styleSheet = document.createElement('style');
styleSheet.textContent = themeTransitionCSS;
document.head.appendChild(styleSheet);

// Initialize active mode on page load
function initializeActiveMode() {
  const savedMode = AppState.learningMode;
  const modeCards = document.querySelectorAll('.mode-card');
  
  modeCards.forEach(card => {
    const cardMode = card.getAttribute('data-mode');
    if (cardMode === savedMode) {
      card.classList.add('active');
    }
  });
}

// Speech Recognition Handlers
function handleSpeechStart() {
  console.log('🎤 Speech detection started');
  elements.micBtn.classList.add('recording');
  startVoiceVisualization();
}

function handleSpeechEnd() {
  console.log('🔇 Speech detection ended');
  elements.micBtn.classList.remove('recording');
  stopVoiceVisualization();
  AppState.isRecording = false;
}

function handleSpeechError(event) {
  console.error('❌ Speech recognition error:', event.error);
  elements.micBtn.classList.remove('recording');
  stopVoiceVisualization();
  AppState.isRecording = false;

  if (messageSentThisTurn || finalTranscriptReceivedThisTurn || Date.now() - lastFinalTranscriptAt < 1500) {
    console.warn('Ignoring late speech recognition error after final transcript:', event.error);
    return;
  }

  const visibleTranscript = getVisibleRecognizedText();
  const recoverableTranscript = latestTranscriptThisTurn.trim() || visibleTranscript;

  if ((event.error === 'network' || event.error === 'no-speech') && recoverableTranscript) {
    console.warn('Recovering from speech recognition error with visible transcript:', event.error, recoverableTranscript);
    showTranscriptConfirmation(recoverableTranscript, { recoveredFromInterim: true });
    showToast('语音识别服务不稳定，请检查识别文本后再发送。', 'info');
    return;
  }
  
  let errorMessage = '语音识别错误：';
  switch (event.error) {
    case 'no-speech':
      errorMessage += '没有检测到语音，请重试。';
      break;
    case 'audio-capture':
      errorMessage += '无法访问麦克风，请检查权限。';
      break;
    case 'not-allowed':
      errorMessage += '麦克风权限被拒绝，请允许访问麦克风。';
      break;
    case 'network':
      errorMessage += '网络异常，请检查连接。';
      break;
    default:
      errorMessage += event.error;
  }
  
  showError(errorMessage);
  elements.outputBot.textContent = errorMessage;

  if (event.error === 'network' || event.error === 'audio-capture') {
    try {
      recognition.abort();
    } catch (abortError) {
      console.warn('Failed to abort recognition after error:', abortError);
    }
    recognition = null;
    setTimeout(initializeSpeechRecognition, 300);
  }
}

function getVisibleRecognizedText() {
  const text = (elements.outputYou?.textContent || '').trim();
  const placeholders = [
    '点击麦克风开始练习...',
    '点击麦克风重新录音...',
    'Click the microphone to start practicing...'
  ];
  if (!text || placeholders.includes(text)) return '';
  return text;
}

function handleNoMatch() {
  console.log('❓ No speech match found');
  showError('没有听清，请再说一遍。');
}

// Voice Visualization
function startVoiceVisualization() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    return;
  }
  
  navigator.mediaDevices.getUserMedia({ audio: true })
    .then(stream => {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
      analyser = audioContext.createAnalyser();
      microphone = audioContext.createMediaStreamSource(stream);
      
      analyser.fftSize = 256;
      microphone.connect(analyser);
      
      elements.voiceVisualizer.classList.add('show');
      drawVisualization();
    })
    .catch(error => {
      console.error('Error accessing microphone for visualization:', error);
    });
}

function stopVoiceVisualization() {
  if (animationId) {
    cancelAnimationFrame(animationId);
    animationId = null;
  }
  
  if (audioContext) {
    audioContext.close();
    audioContext = null;
  }
  
  elements.voiceVisualizer.classList.remove('show');
}

function drawVisualization() {
  if (!analyser) return;
  
  const canvas = elements.visualizerCanvas;
  const ctx = canvas.getContext('2d');
  const bufferLength = analyser.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);
  
  canvas.width = canvas.offsetWidth;
  canvas.height = canvas.offsetHeight;
  
  function draw() {
    animationId = requestAnimationFrame(draw);
    
    analyser.getByteFrequencyData(dataArray);
    
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--bg-color');
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    const barWidth = (canvas.width / bufferLength) * 2.5;
    let barHeight;
    let x = 0;
    
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#39C2C9');
    gradient.addColorStop(1, '#3FC8C9');
    
    for (let i = 0; i < bufferLength; i++) {
      barHeight = (dataArray[i] / 255) * canvas.height;
      
      ctx.fillStyle = gradient;
      ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
      
      x += barWidth + 1;
    }
  }
  
  draw();
}

// Enhanced Tutor Response Handling
function handleTutorResponse(data) {
  console.log('🎓 Enhanced tutor response received:', data);

  hideLoadingIndicator();

  if (data.error) {
    showError(data.reply || 'An error occurred. Please try again.');
    return;
  }

  const reply = data.reply || '';
  const speechAnalysis = data.speechAnalysis;
  const learningFeedback = data.learningFeedback;
  const metadata = data.metadata;

  function extractGrammarSpeakText(text) {
    if (!text) return '';

    const correctMatch = text.match(/(?:正确表达|Correct expression)[:：]\s*["“]?([^"\n。]+[.!?])["”]?/i);
    if (correctMatch && correctMatch[1]) {
      return correctMatch[1].trim();
    }

    const repeatMatch = text.match(/(?:跟读练习|请跟我读|Repeat)[:：]?\s*["“]?([^"\n。]+[.!?])["”]?/i);
    if (repeatMatch && repeatMatch[1]) {
      return repeatMatch[1].trim();
    }

    const englishMatch = text.match(/[A-Za-z][A-Za-z0-9\s,'’\-]+[.!?]/);
    return englishMatch ? englishMatch[0].trim() : '';
  }

  function extractPronunciationPractice(text) {
    if (!text) return '';

    const quotedPractice = text.match(/\[PRACTICE\][\s\S]*?(?:repeat after me|repeat this sentence|follow me|practice)[:：]?\s*["“]([^"”]+)["”]?/i);
    if (quotedPractice && quotedPractice[1]) {
      return quotedPractice[1].trim();
    }

    const linePractice = text.match(/\[PRACTICE\][\s\S]*?(?:repeat after me|repeat this sentence|follow me|practice)[:：]?\s*([A-Za-z][^\n。！？]+[.!?]?)/i);
    if (linePractice && linePractice[1]) {
      return linePractice[1].replace(/^["“]|["”]$/g, '').trim();
    }

    const repeatChinese = text.match(/(?:再读一次|请跟读|目标句)[:：]?\s*["“]?([^"\n。]+[.!?])["”]?/i);
    if (repeatChinese && repeatChinese[1]) {
      return repeatChinese[1].trim();
    }

    const quotedEnglish = text.match(/["“]([A-Za-z][^"”]+)["”]/);
    if (quotedEnglish && quotedEnglish[1]) {
      return quotedEnglish[1].trim();
    }

    const englishMatches = text.match(/[A-Za-z][A-Za-z0-9\s,'’\-]+[.!?]/g);
    return englishMatches && englishMatches.length
      ? englishMatches[englishMatches.length - 1].trim()
      : '';
  }
  function extractVocabularyPractice(text) {
    if (!text) return '';

    const practiceMatch = text.match(/\[PRACTICE\][\s\S]*?(?:repeat after me|practice)[:：]?\s*["“]([^"”]+)["”]?/i);
    if (practiceMatch && practiceMatch[1]) {
      return practiceMatch[1].trim();
    }

    const betterMatch = text.match(/\[BETTER\][\s\S]*?([A-Za-z][^\n。！？]+[.!?])/i);
    if (betterMatch && betterMatch[1]) {
      return betterMatch[1].trim();
    }

    const quotedEnglish = text.match(/["“]([A-Za-z][^"”]+)["”]/);
    if (quotedEnglish && quotedEnglish[1]) {
      return quotedEnglish[1].trim();
    }

    return '';
  }
  function extractFluencyPractice(text) {
    if (!text) return '';

    const practiceMatch = text.match(/\[PRACTICE\][\s\S]*?(?:repeat after me|practice)[:：]?\s*["“]([^"”]+)["”]?/i);
    if (practiceMatch && practiceMatch[1]) {
      return practiceMatch[1].trim();
    }

    const expandMatch = text.match(/\[EXPAND\][\s\S]*?([A-Za-z][^\n。！？]+[.!?])/i);
    if (expandMatch && expandMatch[1]) {
      return expandMatch[1].trim();
    }

    const quotedEnglish = text.match(/["“]([A-Za-z][^"”]+)["”]/);
    if (quotedEnglish && quotedEnglish[1]) {
      return quotedEnglish[1].trim();
    }

    return '';
  }


  function formatTutorReply(text) {
    if (!text) return '';

    return text



      .replace(/\s*(\[(?:PRONUNCIATION|TARGET|SCORE|PROBLEM|TIP|PRACTICE|ENCOURAGEMENT|FEEDBACK|VOCABULARY|BETTER|PHRASES|MORE NATURAL|FLUENCY|EXPAND|CONNECTORS)\])/gi, '\n\n$1\n')
      .replace(/\s*(【发音训练反馈】)/g, '\n\n$1\n')
      .replace(/\s*(【语法专项反馈】)/g, '\n\n$1\n')
      .replace(/\s*(\d+\.\s*(目标句|你的识别|发音评分|问题|练习建议|再读一次|错误定位|正确表达|简短解释|跟读练习)[:：])/g, '\n\n$1\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  const formattedReply = formatTutorReply(reply);

  console.log('📝 Setting output bot text to:', formattedReply);
  elements.outputBot.textContent = formattedReply;

  if (speechAnalysis) {
    console.log('📊 Processing speech analysis:', speechAnalysis);
    updateComprehensiveScores(speechAnalysis);
  }

  if (learningFeedback) {
    console.log('💡 Displaying enhanced feedback:', learningFeedback);
    displayEnhancedFeedback(learningFeedback);
  }

  if (metadata) {
    updateSessionMetadata(metadata);
  }

  addToConversationHistory('tutor', formattedReply, {
    speechAnalysis,
    learningFeedback,
    timestamp: new Date().toISOString()
  });

  if (!AppState.isMuted) {
    const currentMode = AppState.currentMode || AppState.learningMode || 'conversation';
    let speakContent = '';

    if (currentMode === 'grammar') {
      const grammarSentence = extractGrammarSpeakText(reply);
      speakContent = grammarSentence ? `You can follow me. ${grammarSentence}` : '';


    } else if (currentMode === 'pronunciation') {
      const practiceSentence = extractPronunciationPractice(reply);
      speakContent = practiceSentence
        ? `You can follow me. ${practiceSentence}. Try it again. ${practiceSentence}.`
        : reply;


    } else if (currentMode === 'vocabulary') {
      const practiceSentence = extractVocabularyPractice(reply);
      speakContent = practiceSentence
        ? `Here is a more natural way to say it. ${practiceSentence}. You can follow me. ${practiceSentence}.`
        : reply;
    } else if (currentMode === 'fluency') {
      const practiceSentence = extractFluencyPractice(reply);
      speakContent = practiceSentence
        ? `Let's make your answer more fluent. You can follow me. ${practiceSentence}.`
        : reply;
    } else {

      speakContent = reply;
    }


    if (speakContent) {
      window.speechSynthesis.cancel();

      const speakingHint = `🔊 正在朗读：${speakContent}`;
      elements.outputBot.textContent = `${formattedReply}\n\n${speakingHint}`;

      console.log('🔊 Speaking content:', speakContent);
      speakText(speakContent);
    } else {
      console.log('🔇 No suitable text found for TTS.');
    }
  }

  if (AppState.currentSession.messagesCount > 0 && AppState.currentSession.messagesCount % 5 === 0) {
    generateSessionReport();
  }
}

// Bot Response Handling (Backward Compatibility)
function handleBotReply(replyText) {
  console.log('🤖 Bot reply received:', replyText);
  
  // Hide loading indicator
  hideLoadingIndicator();
  
  if (!replyText || replyText.trim() === '') {
    replyText = 'I apologize, but I couldn\'t generate a response. Please try again.';
  }
  
  elements.outputBot.textContent = replyText;
  
  // Add to conversation history
  addToConversationHistory('bot', replyText);
  
  // Speak the response if not muted
  if (!AppState.isMuted) {
    speakText(replyText);
  }
}

// Text-to-Speech
function speakText(text) {
  if (!text || AppState.isMuted) return;

  window.speechSynthesis.cancel();

  const cleanText = String(text)
    .replace(/【.*?】/g, '')
    .replace(/\[(PRONUNCIATION|TARGET|SCORE|PROBLEM|TIP|PRACTICE)\]/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleanText) return;

  const chunks = cleanText
    .match(/[^.!?。！？]+[.!?。！？]+|[^.!?。！？]+$/g)
    ?.map(s => s.trim())
    .filter(Boolean) || [cleanText];

  let index = 0;

  function speakNext() {
    if (index >= chunks.length) return;

    const utterance = new SpeechSynthesisUtterance(chunks[index]);
    utterance.lang = 'en-US';
    utterance.rate = AppState.speechRate || 0.9;
    utterance.pitch = AppState.speechPitch || 1;

    const voices = window.speechSynthesis.getVoices();
    const englishVoice =
      voices.find(v => v.lang === 'en-US') ||
      voices.find(v => v.lang && v.lang.startsWith('en')) ||
      voices[0];

    if (englishVoice) {
      utterance.voice = englishVoice;
    }

    utterance.onend = function () {
      index++;
      setTimeout(speakNext, 180);
    };


    utterance.onerror = function (event) {
      console.warn('TTS error:', event);

      if (event.error === 'interrupted' || event.error === 'canceled') {
        return;
      }

      index++;
      setTimeout(speakNext, 180);
    };

    window.speechSynthesis.speak(utterance);
  }

  speakNext();
}

function extractEnglishSpeechText(text) {
  const raw = String(text || '').replace(/\s+/g, ' ').trim();
  if (!raw) return '';

  const quotedEnglish = [];
  const quoteRegex = /["“”]([A-Za-z][A-Za-z0-9\s'",.!?;:()-]{3,})["“”]/g;
  let match;
  while ((match = quoteRegex.exec(raw)) !== null) {
    quotedEnglish.push(match[1].trim());
  }

  const sentenceParts = raw
    .replace(/Correction:/gi, '. ')
    .replace(/Practice:/gi, '. ')
    .replace(/Why:/gi, '. ')
    .split(/(?<=[.!?])\s+/)
    .map(part => part.trim())
    .filter(Boolean);

  const englishSentences = sentenceParts.filter(part => {
    const letters = (part.match(/[A-Za-z]/g) || []).length;
    const chinese = (part.match(/[\u4e00-\u9fff]/g) || []).length;
    return letters >= 8 && letters > chinese * 2;
  });

  const candidates = [...quotedEnglish, ...englishSentences]
    .map(cleanSpeechSegment)
    .filter(Boolean);

  const unique = [];
  for (const item of candidates) {
    if (!unique.some(existing => existing.toLowerCase() === item.toLowerCase())) {
      unique.push(item);
    }
  }

  return unique.slice(0, 3).join(' ');
}

function cleanSpeechSegment(text) {
  return String(text || '')
    .replace(/^\d+\.\s*/g, '')
    .replace(/^[：:，,\s]+/g, '')
    .replace(/[（(][^()（）]*[\u4e00-\u9fff][^()（）]*[）)]/g, '')
    .trim();
}

function stopCurrentSpeech() {
  if (speechSynthesis.speaking) {
    speechSynthesis.cancel();
    elements.stopBtn.classList.remove('active');
  }
}

// Learning Progress Functions
function updateLearningProgress(speechAnalysis) {
  try {
    if (!speechAnalysis) return;
    AppState.currentSession.messagesCount++;
    AppState.currentSession.wordsSpoken += speechAnalysis.wordCount || 0;
    if (speechAnalysis.grammarIssues && speechAnalysis.grammarIssues.length > 0) {
      AppState.currentSession.grammarErrors += speechAnalysis.grammarIssues.length;
    }
    updateComprehensiveScores(speechAnalysis);
  } catch (error) {
    console.error('Error updating learning progress:', error);
  }
}

function displayLearningFeedback(learningFeedback) {
  try {
    // This function can be enhanced to show specific feedback in the UI
    // For now, we'll log it and could add UI elements later
    console.log('Learning feedback:', learningFeedback);
    
    // Could add visual feedback indicators here
    if (learningFeedback.grammar && learningFeedback.grammar.length > 0) {
      console.log('Grammar feedback available');
    }
    
    if (learningFeedback.pronunciation && learningFeedback.pronunciation.length > 0) {
      console.log('Pronunciation feedback available');
    }
    
    if (learningFeedback.vocabulary && learningFeedback.vocabulary.length > 0) {
      console.log('Vocabulary feedback available');
    }
    
  } catch (error) {
    console.error('Error displaying learning feedback:', error);
  }
}

// Conversation History Management
function addToConversationHistory(sender, message, metadata = {}) {
  const timestamp = new Date().toISOString();
  const historyItem = {
    id: Date.now(),
    sender,
    message,
    metadata,
    timestamp
  };
  
  AppState.conversationHistory.unshift(historyItem);
  
  // Limit history size
  if (AppState.conversationHistory.length > CONFIG.maxHistoryItems) {
    AppState.conversationHistory = AppState.conversationHistory.slice(0, CONFIG.maxHistoryItems);
  }
  
  // Save to localStorage
  localStorage.setItem('conversationHistory', JSON.stringify(AppState.conversationHistory));
  
  // Update UI
  updateConversationHistoryUI();
}

function loadConversationHistory() {
  updateConversationHistoryUI();
}

function updateConversationHistoryUI() {
  const historyContainer = elements.chatHistory;
  
  // Clear existing history (except welcome message)
  const welcomeMessage = historyContainer.querySelector('.welcome-message');
  historyContainer.innerHTML = '';
  if (welcomeMessage) {
    historyContainer.appendChild(welcomeMessage);
  }
  
  // Add conversation items
  AppState.conversationHistory.forEach(item => {
    const messageElement = createMessageElement(item);
    historyContainer.appendChild(messageElement);
  });
  
  // Scroll to bottom
  historyContainer.scrollTop = historyContainer.scrollHeight;
}

function createMessageElement(item) {
  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${item.sender}-message`;
  
  const avatar = document.createElement('div');
  avatar.className = 'message-avatar';
  avatar.innerHTML = item.sender === 'user' ? '<i class="fas fa-user"></i>' : '<i class="fas fa-robot"></i>';
  
  const content = document.createElement('div');
  content.className = 'message-content';
  content.innerHTML = `<p>${item.message}</p>`;
  
  const time = document.createElement('div');
  time.className = 'message-time';
  time.textContent = formatTimestamp(item.timestamp);
  
  content.appendChild(time);
  messageDiv.appendChild(avatar);
  messageDiv.appendChild(content);
  
  return messageDiv;
}

function formatTimestamp(timestamp) {
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function clearConversationHistory() {
  if (confirm('Are you sure you want to clear the conversation history?')) {
    AppState.conversationHistory = [];
    localStorage.removeItem('conversationHistory');
    updateConversationHistoryUI();
    showToast('练习记录已清空', 'success');
  }
}

// Theme Management
function applyTheme(theme) {
  AppState.currentTheme = theme;
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('theme', theme);
  
  // Update theme button icon
  const icon = elements.themeBtn.querySelector('i');
  icon.className = theme === 'light' ? 'fas fa-moon' : 'fas fa-sun';
}

// Settings Management
function applySettings() {
  // Apply settings to form elements safely
  if (elements.tutorModeSelect) {
    elements.tutorModeSelect.value = AppState.tutorMode;
  }
  
  if (elements.difficultyLevelSelect) {
    elements.difficultyLevelSelect.value = AppState.difficultyLevel;
  }
  
  if (elements.feedbackStyleSelect) {
    elements.feedbackStyleSelect.value = AppState.feedbackStyle;
  }
  
  if (elements.languageSelect) {
    elements.languageSelect.value = AppState.settings.language;
  }
  
  if (elements.voiceSelect) {
    elements.voiceSelect.value = AppState.settings.selectedVoice;
  }
  
  if (elements.sessionLengthSelect) {
    elements.sessionLengthSelect.value = AppState.sessionLength;
  }
}

function updateAIModel() {
  // Note: AI model selection not implemented in current UI
  // AppState.settings.aiModel = elements.aiModelSelect.value;
  // localStorage.setItem('aiModel', AppState.settings.aiModel);
  // showToast(`AI Model changed to ${AppState.settings.aiModel}`, 'success');
  console.log('AI Model selection not available in current UI');
}

function updateLanguage() {
  AppState.settings.language = elements.languageSelect.value;
  localStorage.setItem('language', AppState.settings.language);
  
  if (recognition) {
    recognition.lang = AppState.settings.language;
  }
  
  showToast('识别口音已更新', 'success');
}

function updatePersonality() {
  if (elements.tutorModeSelect) {
    AppState.tutorMode = elements.tutorModeSelect.value;
    localStorage.setItem('tutorMode', AppState.tutorMode);
    showToast('AI 导师模式已更新', 'success');
  }
}

function updateSelectedVoice() {
  AppState.settings.selectedVoice = elements.voiceSelect.value;
  localStorage.setItem('selectedVoice', AppState.settings.selectedVoice);
  showToast('导师声音已更新', 'success');
}

// Audio Controls
function toggleMute() {
  AppState.isMuted = !AppState.isMuted;
  elements.muteBtn.classList.toggle('active', AppState.isMuted);
  
  const icon = elements.muteBtn.querySelector('i');
  icon.className = AppState.isMuted ? 'fas fa-volume-mute' : 'fas fa-volume-up';
  
  if (AppState.isMuted) {
    stopCurrentSpeech();
    showToast('已静音', 'info');
  } else {
    showToast('已取消静音', 'info');
  }
}

// Socket Event Handlers
function handleSocketConnect() {
  console.log('✅ Connected to server');
  elements.connectionStatus.className = 'status-dot connected';
  elements.statusText.textContent = '已连接';
}

function handleSocketDisconnect() {
  console.log('❌ Disconnected from server');
  elements.connectionStatus.className = 'status-dot disconnected';
  elements.statusText.textContent = '连接断开';
  hideLoadingIndicator();
}

function handleSocketError(error) {
  console.error('Socket error:', error);
  showError('连接发生错误');
  hideLoadingIndicator();
}

// UI State Management
let loadingTimeout = null;

function showLoadingIndicator() {
  elements.loadingIndicator.classList.add('show');
  
  // Clear any existing timeout
  if (loadingTimeout) {
    clearTimeout(loadingTimeout);
  }
  
  // Auto-hide after 10 seconds to prevent getting stuck
  loadingTimeout = setTimeout(() => {
    console.log('⏰ Loading indicator timeout - hiding automatically');
    hideLoadingIndicator();
    showError('请求超时，请重试。');
  }, 10000);
}

function hideLoadingIndicator() {
  elements.loadingIndicator.classList.remove('show');
  
  // Clear the timeout
  if (loadingTimeout) {
    clearTimeout(loadingTimeout);
    loadingTimeout = null;
  }
}

// Error Handling and Notifications
function showError(message) {
  showToast(message, 'error');
}

function showToast(message, type = 'info') {
  elements.toastMessage.textContent = message;
  elements.errorToast.className = `toast ${type}`;
  elements.errorToast.classList.add('show');
  
  // Auto-hide after 5 seconds
  setTimeout(() => {
    hideToast();
  }, 5000);
}

function hideToast() {
  elements.errorToast.classList.remove('show');
}

// Keyboard Shortcuts
function handleKeyboardShortcuts(event) {
  // Space bar to toggle recording (when not in input)
  if (event.code === 'Space' && !event.target.matches('input, textarea, select')) {
    event.preventDefault();
    toggleRecording();
  }
  
  // Escape to close settings
  if (event.code === 'Escape') {
    closeSettings();
    hideToast();
  }
  
  // Ctrl/Cmd + M to toggle mute
  if ((event.ctrlKey || event.metaKey) && event.code === 'KeyM') {
    event.preventDefault();
    toggleMute();
  }
  
  // Ctrl/Cmd + T to toggle theme
  if ((event.ctrlKey || event.metaKey) && event.code === 'KeyT') {
    event.preventDefault();
    toggleTheme();
  }
}

// Click Outside Handler
function handleOutsideClick(event) {
  if (!elements.settingsPanel.contains(event.target) && 
      !elements.settingsBtn.contains(event.target)) {
    closeSettings();
  }
}

// Utility Functions
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Global error handler
window.addEventListener('error', (event) => {
  console.error('Global error:', event.error);
  showError('发生了一个意外错误。');
});

// Initialize when DOM is loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApp);
} else {
  initializeApp();
}

// Export for global access
window.VoiceGPT = {
  toggleRecording,
  toggleTheme,
  clearHistory: clearConversationHistory,
  hideToast
};

function updateDifficultyLevel() {
  if (elements.difficultyLevelSelect) {
    AppState.difficultyLevel = elements.difficultyLevelSelect.value;
    localStorage.setItem('difficultyLevel', AppState.difficultyLevel);
    showToast('难度等级已更新', 'success');
  }
}

function updateFeedbackStyle() {
  if (elements.feedbackStyleSelect) {
    AppState.feedbackStyle = elements.feedbackStyleSelect.value;
    localStorage.setItem('feedbackStyle', AppState.feedbackStyle);
    showToast('纠错方式已更新', 'success');
  }
}

function updateSessionLength() {
  if (elements.sessionLengthSelect) {
    AppState.sessionLength = elements.sessionLengthSelect.value;
    localStorage.setItem('sessionLength', AppState.sessionLength);
    showToast('练习时长已更新', 'success');
  }
}

// Update comprehensive scoring system
function updateComprehensiveScores(speechAnalysis) {
  if (!speechAnalysis) return;

  const levelScores = { beginner: 68, intermediate: 82, advanced: 92, native: 96 };
  const grammarIssues = Array.isArray(speechAnalysis.grammarIssues) ? speechAnalysis.grammarIssues.length : 0;
  const grammarScore = clampScore(speechAnalysis.grammarScore) ?? Math.max(45, 100 - grammarIssues * 18);
  const vocabularyScore = clampScore(speechAnalysis.vocabularyScore) ?? levelScores[speechAnalysis.vocabularyLevel] ?? null;
  const fluencyScore = clampScore(speechAnalysis.fluencyScore);

  addScoreRecord({
    grammar: grammarScore,
    vocabulary: vocabularyScore,
    fluency: fluencyScore
  }, 'speech-analysis');

  updateProgressDisplay();
  console.log('📈 Real progress updated:', AppState.scores);
}

// Display enhanced learning feedback
function displayEnhancedFeedback(learningFeedback) {
  const currentMode = AppState.currentMode || AppState.learningMode || 'conversation';
  const currentScenario = AppState.selectedScenario || '';

  updateFeedbackPanelForMode(currentMode, currentScenario);
}

// Update session metadata
function updateSessionMetadata(metadata) {
  if (!metadata) return;
  
  const {
    sessionDuration = 0,
    wordsPerMinute = 0,
    confidenceLevel = 0,
    interactionQuality = 'good'
  } = metadata;
  
  // Update session stats
  AppState.sessionDuration = sessionDuration;
  
  // Update analytics from real session duration
  const minutes = Math.max(0, Math.round(sessionDuration / 60000));
  const minutesByDate = getPracticeMinutesByDate();
  const key = todayKey();
  minutesByDate[key] = Math.max(Number(minutesByDate[key] || 0), minutes);
  savePracticeMinutesByDate(minutesByDate);
  AppState.analytics.totalMinutes = Object.values(minutesByDate).reduce((sum, value) => sum + Number(value || 0), 0);
  localStorage.setItem('totalMinutes', AppState.analytics.totalMinutes);
  
  console.log('📊 Session metadata updated:', metadata);
}

// Generate session report
function generateSessionReport() {
  const sessionDuration = Date.now() - AppState.sessionStartTime;
  const wordsSpoken = AppState.currentSession.wordsSpoken;
  const messagesCount = AppState.currentSession.messagesCount;
  const vocabularyUsed = AppState.currentSession.vocabularyUsed.size;
  
  const report = {
    duration: sessionDuration,
    wordsSpoken,
    messagesCount,
    vocabularyUsed,
    averageWordsPerMessage: Math.round(wordsSpoken / Math.max(messagesCount, 1)),
    wordsPerMinute: Math.round((wordsSpoken / (sessionDuration / 60000)) || 0),
    scores: { ...AppState.scores }
  };
  
  console.log('📋 Session Report:', report);
  
  // Show session summary toast
  showToast(`Session: ${messagesCount} messages, ${wordsSpoken} words, ${vocabularyUsed} unique words`, 'info');
  
  return report;
}

async function requestSessionSummary() {
  try {
    if (elements.summaryBtn) {
      elements.summaryBtn.classList.add('active');
      elements.summaryBtn.disabled = true;
    }
    showToast('正在生成课后报告...', 'info');

    const durationMs = Date.now() - (AppState.sessionStartTime || Date.now());
    const response = await fetch('/api/session-summary', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        scenario: AppState.selectedScenario,
        scores: AppState.scores,
        wordsSpoken: AppState.currentSession.wordsSpoken,
        messagesCount: AppState.currentSession.messagesCount,
        durationMs,
        interactions: AppState.currentSession.interactions,
        conversationHistory: AppState.conversationHistory.slice(-12),
        pronunciationResults: AppState.currentSession.pronunciationResults
      })
    });

    if (!response.ok) {
      throw new Error(`Summary API failed: ${response.status}`);
    }

    const summary = await response.json();
    renderSessionSummary(summary);
    showToast('课后总结已生成', 'success');
  } catch (error) {
    console.error('Failed to generate session summary:', error);
    renderSessionSummary(buildLocalSummary());
    showToast('已生成本地课后报告', 'info');
  } finally {
    if (elements.summaryBtn) {
      elements.summaryBtn.classList.remove('active');
      elements.summaryBtn.disabled = false;
    }
  }
}

function renderSessionSummary(summary) {
  if (!elements.summaryPanel || !elements.summaryContent) return;

  elements.summaryPanel.hidden = false;
  if (elements.summaryScenario) {
    elements.summaryScenario.textContent = summary.scenario || '通用练习';
  }

  const metrics = summary.metrics || {};
  const scoreCards = summary.scoreCards || [];
  const diagnosis = summary.diagnosis || [];
  const practicePlan = summary.practicePlan || [];
  elements.summaryContent.innerHTML = `
    <div class="summary-hero">
      <div>
        <span class="summary-kicker">本次课后报告</span>
        <h5>${summary.title || '口语练习总结'}</h5>
        <p>${summary.overview || '系统已根据本次练习生成表现总结。'}</p>
      </div>
      <div class="summary-overall">
        <span>综合表现</span>
        <strong>${metrics.overallScore || '--'}</strong>
      </div>
    </div>

    <div class="summary-metrics">
      <span><strong>${metrics.messagesCount || 0}</strong> 轮对话</span>
      <span><strong>${metrics.wordsSpoken || 0}</strong> 个词</span>
      <span><strong>${metrics.minutes || 0}</strong> 分钟</span>
      <span><strong>${metrics.wordsPerMinute || 0}</strong> 词/分钟</span>
    </div>

    <div class="summary-score-grid">
      ${scoreCards.map(card => `
        <div class="summary-score-card">
          <span>${card.label}</span>
          <strong>${card.value}</strong>
          <div class="summary-score-bar"><i style="width: ${card.percent || 0}%"></i></div>
          <small>${card.note || ''}</small>
        </div>
      `).join('')}
    </div>

    <div class="summary-section-grid">
      <section>
        <h5><i class="fas fa-check-circle"></i> 本次亮点</h5>
        <ul>${(summary.highlights || []).map(item => `<li>${item}</li>`).join('')}</ul>
      </section>
      <section>
        <h5><i class="fas fa-search"></i> 问题诊断</h5>
        <ul>${diagnosis.map(item => `<li>${item}</li>`).join('')}</ul>
      </section>
    </div>

    <div class="summary-practice-plan">
      <h5><i class="fas fa-bullseye"></i> 下次训练计划</h5>
      <div>
        ${practicePlan.map(item => `<span>${item}</span>`).join('')}
      </div>
    </div>

    <h5>下一步建议</h5>
    <ul>${(summary.nextSteps || []).map(item => `<li>${item}</li>`).join('')}</ul>
    <p class="summary-closing">${summary.closing || ''}</p>
  `;
  elements.summaryPanel.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function buildLocalSummary() {
  const durationMs = Date.now() - (AppState.sessionStartTime || Date.now());
  const minutes = Math.max(1, Math.round(durationMs / 60000));
  const scores = AppState.scores || {};
  const validScores = Object.values(scores).filter(value => Number.isFinite(Number(value)) && Number(value) > 0);
  const overallScore = validScores.length
    ? Math.round(validScores.reduce((sum, value) => sum + Number(value), 0) / validScores.length)
    : null;

  const scoreCards = [
    { key: 'grammar', label: '语法', value: scores.grammar ? `${scores.grammar}分` : '--', percent: scores.grammar || 0, note: '句子结构与时态控制' },
    { key: 'pronunciation', label: '发音', value: scores.pronunciation ? `${scores.pronunciation}分` : '--', percent: scores.pronunciation || 0, note: '准确度、完整度和清晰度' },
    { key: 'vocabulary', label: '词汇', value: scores.vocabulary ? `${scores.vocabulary}分` : '--', percent: scores.vocabulary || 0, note: '表达丰富度和场景贴合度' },
    { key: 'fluency', label: '流利度', value: scores.fluency ? `${scores.fluency}分` : '--', percent: scores.fluency || 0, note: '连续表达和停顿控制' }
  ];

  return {
    title: '口语练习总结',
    scenario: AppState.selectedScenario || '通用练习',
    overview: '本次报告基于你的对话轮次、发音评测和练习表现自动生成。',
    metrics: {
      messagesCount: AppState.currentSession.messagesCount,
      wordsSpoken: AppState.currentSession.wordsSpoken,
      minutes,
      wordsPerMinute: Math.round(AppState.currentSession.wordsSpoken / minutes) || 0,
      overallScore: overallScore || '--'
    },
    scoreCards,
    highlights: ['你完成了一次口语练习。'],
    diagnosis: ['当前可用数据较少，建议至少完成 3 轮对话后再生成报告。'],
    practicePlan: ['复述 AI 的关键问题', '补充一个原因和例子', '把短句扩展成完整回答'],
    nextSteps: ['再练一轮，并尽量使用更完整的长句回答。'],
    closing: '下一轮练习时，优先把回答说完整，再逐步追求语速。'
  };
}

// Comprehensive microphone diagnostic
async function runMicrophoneDiagnostic() {
  console.log('🔧 Running comprehensive microphone diagnostic...');
  
  const diagnostics = {
    browserSupport: false,
    mediaDevicesAPI: false,
    speechRecognition: false,
    microphoneAccess: false,
    audioContext: false,
    permissions: 'unknown',
    errors: []
  };
  
  try {
    // Check browser support
    diagnostics.browserSupport = !!(window.navigator && window.navigator.userAgent);
    
    // Check MediaDevices API
    diagnostics.mediaDevicesAPI = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
    
    // Check Speech Recognition
    diagnostics.speechRecognition = !!(window.SpeechRecognition || window.webkitSpeechRecognition);
    
    // Check AudioContext
    diagnostics.audioContext = !!(window.AudioContext || window.webkitAudioContext);
    
    // Test microphone access
    if (diagnostics.mediaDevicesAPI) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        diagnostics.microphoneAccess = true;
        diagnostics.permissions = 'granted';
        
        // Test audio levels
        if (diagnostics.audioContext) {
          const audioContext = new (window.AudioContext || window.webkitAudioContext)();
          const analyser = audioContext.createAnalyser();
          const microphone = audioContext.createMediaStreamSource(stream);
          analyser.fftSize = 256;
          microphone.connect(analyser);
          
          // Clean up
          stream.getTracks().forEach(track => track.stop());
          audioContext.close();
        }
        
        stream.getTracks().forEach(track => track.stop());
        
      } catch (error) {
        diagnostics.permissions = error.name;
        diagnostics.errors.push(`Microphone access: ${error.message}`);
      }
    }
    
  } catch (error) {
    diagnostics.errors.push(`Diagnostic error: ${error.message}`);
  }
  
  console.log('🔧 Microphone Diagnostic Results:', diagnostics);
  
  // Show diagnostic results
  showMicrophoneDiagnosticResults(diagnostics);
  
  return diagnostics;
}

// Show microphone diagnostic results
function showMicrophoneDiagnosticResults(diagnostics) {
  const issues = [];
  const fixes = [];
  
  if (!diagnostics.browserSupport) {
    issues.push('Browser not supported');
    fixes.push('Use Chrome, Edge, or Safari');
  }
  
  if (!diagnostics.mediaDevicesAPI) {
    issues.push('MediaDevices API not available');
    fixes.push('Update your browser to the latest version');
  }
  
  if (!diagnostics.speechRecognition) {
    issues.push('Speech Recognition not supported');
    fixes.push('Use Chrome, Edge, or Safari for speech recognition');
  }
  
  if (!diagnostics.microphoneAccess) {
    issues.push('Microphone access denied or unavailable');
    fixes.push('Allow microphone permissions in browser settings');
  }
  
  if (diagnostics.permissions === 'NotAllowedError') {
    fixes.push('Click the microphone icon in address bar and allow access');
  }
  
  if (diagnostics.permissions === 'NotFoundError') {
    fixes.push('Connect a microphone to your device');
  }
  
  const resultHtml = `
    <div class="diagnostic-results">
      <h4>🔧 Microphone Diagnostic Results</h4>
      
      <div class="diagnostic-status">
        <p><span class="${diagnostics.browserSupport ? 'success' : 'error'}">●</span> Browser Support: ${diagnostics.browserSupport ? 'OK' : 'Failed'}</p>
        <p><span class="${diagnostics.mediaDevicesAPI ? 'success' : 'error'}">●</span> Media Devices API: ${diagnostics.mediaDevicesAPI ? 'OK' : 'Failed'}</p>
        <p><span class="${diagnostics.speechRecognition ? 'success' : 'error'}">●</span> Speech Recognition: ${diagnostics.speechRecognition ? 'OK' : 'Failed'}</p>
        <p><span class="${diagnostics.microphoneAccess ? 'success' : 'error'}">●</span> Microphone Access: ${diagnostics.microphoneAccess ? 'OK' : 'Failed'}</p>
        <p><span class="${diagnostics.audioContext ? 'success' : 'error'}">●</span> Audio Context: ${diagnostics.audioContext ? 'OK' : 'Failed'}</p>
        <p><span class="info">●</span> Permissions: ${diagnostics.permissions}</p>
      </div>
      
      ${issues.length > 0 ? `
        <div class="diagnostic-issues">
          <h5>Issues Found:</h5>
          <ul>
            ${issues.map(issue => `<li>❌ ${issue}</li>`).join('')}
          </ul>
        </div>
      ` : ''}
      
      ${fixes.length > 0 ? `
        <div class="diagnostic-fixes">
          <h5>Recommended Fixes:</h5>
          <ul>
            ${fixes.map(fix => `<li>💡 ${fix}</li>`).join('')}
          </ul>
        </div>
      ` : ''}
      
      ${diagnostics.errors.length > 0 ? `
        <div class="diagnostic-errors">
          <h5>Error Details:</h5>
          <ul>
            ${diagnostics.errors.map(error => `<li>⚠️ ${error}</li>`).join('')}
          </ul>
        </div>
      ` : ''}
    </div>
  `;
  
  showToast(resultHtml, 'info');
}

// Auto-run diagnostic on microphone issues
function autoFixMicrophoneIssues() {
  console.log('🔧 Auto-fixing microphone issues...');
  
  // Reinitialize speech recognition
  if (!recognition && (window.SpeechRecognition || window.webkitSpeechRecognition)) {
    initializeSpeechRecognition();
  }
  
  // Test microphone access again
  testMicrophoneAccess();
  
  // Update UI state
  if (elements.micBtn) {
    elements.micBtn.disabled = false;
    elements.micBtn.style.opacity = '1';
  }
}

// Add diagnostic button to help users
function addMicrophoneDiagnosticButton() {
  const diagnosticBtn = document.createElement('button');
  diagnosticBtn.id = 'diagnostic-btn';
  diagnosticBtn.className = 'diagnostic-btn';
  diagnosticBtn.innerHTML = '<i class="fas fa-stethoscope"></i> Run Microphone Diagnostic';
  diagnosticBtn.onclick = runMicrophoneDiagnostic;
  
  // Add to controls area
  const controlsArea = document.querySelector('.controls');
  if (controlsArea && !document.getElementById('diagnostic-btn')) {
    controlsArea.appendChild(diagnosticBtn);
  }
}

// Initialize diagnostic features
function initializeDiagnostics() {
  addMicrophoneDiagnosticButton();
  
  // Auto-run diagnostic if microphone issues detected
  setTimeout(() => {
    if (!recognition || elements.micBtn.disabled) {
      console.log('🔧 Microphone issues detected, running auto-diagnostic...');
      runMicrophoneDiagnostic();
    }
  }, 2000);
}
