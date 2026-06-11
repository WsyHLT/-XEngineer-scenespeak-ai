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
    grammar: parseInt(localStorage.getItem('grammarScore')) || 75,
    pronunciation: parseInt(localStorage.getItem('pronunciationScore')) || 78,
    vocabulary: parseInt(localStorage.getItem('vocabularyScore')) || 82,
    fluency: parseInt(localStorage.getItem('fluencyScore')) || 80,
    overall: parseInt(localStorage.getItem('overallScore')) || 79
  },
  
  // Detailed analytics
  analytics: {
    totalSessions: parseInt(localStorage.getItem('totalSessions')) || 0,
    totalMinutes: parseInt(localStorage.getItem('totalMinutes')) || 0,
    streakDays: parseInt(localStorage.getItem('streakDays')) || 7,
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

  if (!window.MediaRecorder) {
    console.warn('MediaRecorder is not supported; pronunciation scoring will use text fallback.');
    return;
  }

  try {
    mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
  } catch (error) {
    mediaRecorder = new MediaRecorder(stream);
  }

  mediaRecorder.addEventListener('dataavailable', event => {
    if (event.data && event.data.size > 0) {
      recordedChunks.push(event.data);
    }
  });

  mediaRecorder.addEventListener('stop', () => {
    const transcript = pendingPronunciationText;
    const blob = new Blob(recordedChunks, { type: mediaRecorder.mimeType || 'audio/webm' });
    recordedChunks = [];
    cleanupAudioCaptureStream();

    if (blob.size > 0 && transcript) {
      evaluatePronunciation(blob, transcript);
    } else if (blob.size > 0) {
      pendingAudioBlob = blob;
    }
  });

  mediaRecorder.start();
}

function stopAudioCapture(shouldUpload = true) {
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    if (shouldUpload) {
      mediaRecorder.stop();
    } else {
      mediaRecorder.ondataavailable = null;
      mediaRecorder.stop();
      recordedChunks = [];
      cleanupAudioCaptureStream();
    }
    return;
  }

  cleanupAudioCaptureStream();
}

function cleanupAudioCaptureStream() {
  if (activeRecordingStream) {
    activeRecordingStream.getTracks().forEach(track => track.stop());
    activeRecordingStream = null;
  }
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
  AppState.scores.pronunciation = Math.round(AppState.scores.pronunciation * 0.6 + score * 0.4);
  AppState.currentSession.pronunciationResults.push({
    score,
    transcript: result.transcript || '',
    errors: result.errors || [],
    feedback: result.feedback || '',
    source: result.source || 'openpronounce'
  });
  localStorage.setItem('pronunciationScore', AppState.scores.pronunciation);
  updateProgressDisplay();

  const errorWords = (result.errors || [])
    .map(item => item.word || item.expected)
    .filter(Boolean)
    .slice(0, 4);
  const detail = errorWords.length > 0
    ? `重点练习单词：${errorWords.join(', ')}。`
    : '暂未发现明显的单词级发音问题。';
  setPronunciationFeedback(`发音得分：${score}%。${detail}`);
}

function setPronunciationFeedback(message) {
  const target = document.getElementById('pronunciation-feedback');
  if (target) {
    target.textContent = message;
  }
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

    if (grammarFeedback) {
      grammarFeedback.textContent = '当前是语法专项：系统会优先指出语法错误，例如时态、主谓一致、冠词、介词、句子结构等。';
    }

    if (pronunciationFeedback) {
      pronunciationFeedback.textContent = '语法专项下，发音不是主要评分项。请先保证句子完整。';
    }

    if (vocabularyFeedback) {
      vocabularyFeedback.textContent = '系统会给你一条更正确、更自然、可以直接跟读的英文改写句。';
    }

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
  
  progressBars.forEach((bar, index) => {
    const targetWidth = bar.style.width;
    bar.style.width = '0%';
    
    setTimeout(() => {
      bar.style.transition = 'width 1s ease-out';
      bar.style.width = targetWidth;
    }, index * 200);
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
    'job-interview': 'Interview',
    'restaurant': 'Restaurant',
    'meeting': 'Meeting',
    'travel': 'Travel',
    'shopping': 'Shopping',
    'medical': 'Medical',
    'social': 'Social'
  };

  const scenarioName = scenarioNames[scenario] || scenario;
  showToast(`Selected ${scenarioName} scenario`, 'success');

  AppState.scenarioContext = getScenarioContext(scenario);
  AppState.learningMode = 'scenario';
  AppState.currentMode = 'scenario';
  localStorage.setItem('learningMode', 'scenario');

  const starter = getScenarioStarter(scenario);

  elements.outputYou.textContent = 'Scenario practice mode. Please respond in English.';
  elements.outputBot.textContent = starter;

  addToConversationHistory('tutor', starter, { scenario });

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

// Enhanced Progress Display
function updateProgressDisplay() {
  // Update progress scores
  const grammarScore = document.getElementById('grammar-score');
  const pronunciationScore = document.getElementById('pronunciation-score');
  const vocabularyScore = document.getElementById('vocabulary-score');
  const fluencyScore = document.getElementById('fluency-score');
  
  if (grammarScore) grammarScore.textContent = `${AppState.scores.grammar}%`;
  if (pronunciationScore) pronunciationScore.textContent = `${AppState.scores.pronunciation}%`;
  if (vocabularyScore) vocabularyScore.textContent = `${AppState.scores.vocabulary}%`;
  if (fluencyScore) fluencyScore.textContent = `${AppState.scores.fluency}%`;
  
  // Update progress bars
  const progressBars = document.querySelectorAll('.progress-fill');
  progressBars.forEach((bar, index) => {
    const scores = [AppState.scores.grammar, AppState.scores.pronunciation, AppState.scores.vocabulary, AppState.scores.fluency];
    if (scores[index]) {
      bar.style.width = `${scores[index]}%`;
    }
  });
  
  // Update session timer
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
    // Update session stats
    AppState.currentSession.messagesCount++;
    AppState.currentSession.wordsSpoken += speechAnalysis.wordCount || 0;
    
    // Update grammar score based on issues found
    if (speechAnalysis.grammarIssues && speechAnalysis.grammarIssues.length > 0) {
      AppState.currentSession.grammarErrors += speechAnalysis.grammarIssues.length;
      // Slightly decrease grammar score if issues found
      AppState.scores.grammar = Math.max(50, AppState.scores.grammar - 1);
    } else if (speechAnalysis.wordCount > 5) {
      // Improve grammar score for longer error-free sentences
      AppState.scores.grammar = Math.min(100, AppState.scores.grammar + 0.5);
    }
    
    // Update fluency score
    if (speechAnalysis.fluencyScore) {
      AppState.scores.fluency = Math.round((AppState.scores.fluency + speechAnalysis.fluencyScore) / 2);
    }
    
    // Update vocabulary tracking
    if (speechAnalysis.vocabularyLevel) {
      const levelScores = { 'beginner': 70, 'intermediate': 85, 'advanced': 95 };
      const targetScore = levelScores[speechAnalysis.vocabularyLevel] || 80;
      AppState.scores.vocabulary = Math.round((AppState.scores.vocabulary + targetScore) / 2);
    }
    
    // Save progress to localStorage
    localStorage.setItem('grammarScore', AppState.scores.grammar);
    localStorage.setItem('pronunciationScore', AppState.scores.pronunciation);
    localStorage.setItem('vocabularyScore', AppState.scores.vocabulary);
    localStorage.setItem('fluencyScore', AppState.scores.fluency);
    
    // Update progress display
    updateProgressDisplay();
    
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
  
  const {
    grammarScore = 0,
    pronunciationScore = 0,
    vocabularyScore = 0,
    fluencyScore = 0,
    overallScore = 0
  } = speechAnalysis;
  
  // Apply weighted updates (new score influences 30%, existing 70%)
  const updateWeight = 0.3;
  
  AppState.scores.grammar = Math.round(
    (AppState.scores.grammar * (1 - updateWeight)) + (grammarScore * updateWeight)
  );
  AppState.scores.pronunciation = Math.round(
    (AppState.scores.pronunciation * (1 - updateWeight)) + (pronunciationScore * updateWeight)
  );
  AppState.scores.vocabulary = Math.round(
    (AppState.scores.vocabulary * (1 - updateWeight)) + (vocabularyScore * updateWeight)
  );
  AppState.scores.fluency = Math.round(
    (AppState.scores.fluency * (1 - updateWeight)) + (fluencyScore * updateWeight)
  );
  
  // Calculate overall score
  AppState.scores.overall = Math.round(
    (AppState.scores.grammar + AppState.scores.pronunciation + 
     AppState.scores.vocabulary + AppState.scores.fluency) / 4
  );
  
  // Save to localStorage
  localStorage.setItem('grammarScore', AppState.scores.grammar);
  localStorage.setItem('pronunciationScore', AppState.scores.pronunciation);
  localStorage.setItem('vocabularyScore', AppState.scores.vocabulary);
  localStorage.setItem('fluencyScore', AppState.scores.fluency);
  localStorage.setItem('overallScore', AppState.scores.overall);
  
  // Update UI
  updateProgressDisplay();
  
  console.log('📈 Scores updated:', AppState.scores);
}

// Display enhanced learning feedback
function displayEnhancedFeedback(learningFeedback) {
  if (!learningFeedback) return;
  
  const {
    grammarFeedback = '',
    pronunciationFeedback = '',
    vocabularyFeedback = '',
    fluencyFeedback = '',
    overallFeedback = '',
    suggestions = []
  } = learningFeedback;
  
  const grammarTarget = document.getElementById('grammar-feedback');
  const pronunciationTarget = document.getElementById('pronunciation-feedback');
  const vocabularyTarget = document.getElementById('vocabulary-feedback');

  if (grammarTarget && grammarFeedback) grammarTarget.textContent = grammarFeedback;
  if (pronunciationTarget && pronunciationFeedback) pronunciationTarget.textContent = pronunciationFeedback;
  if (vocabularyTarget) {
    const vocabText = vocabularyFeedback || fluencyFeedback || overallFeedback || suggestions.join(' ');
    if (vocabText) vocabularyTarget.textContent = vocabText;
  }
  
  // Show feedback panel if hidden
  const feedbackPanel = document.getElementById('feedback-panel');
  if (feedbackPanel) {
    feedbackPanel.style.display = 'block';
  }
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
  
  // Update analytics
  AppState.analytics.totalMinutes += Math.round(sessionDuration / 60000);
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
  }
}

function renderSessionSummary(summary) {
  if (!elements.summaryPanel || !elements.summaryContent) return;

  elements.summaryPanel.hidden = false;
  if (elements.summaryScenario) {
    elements.summaryScenario.textContent = summary.scenario || 'General Practice';
  }

  const metrics = summary.metrics || {};
  elements.summaryContent.innerHTML = `
    <div class="summary-metrics">
      <span>${metrics.messagesCount || 0} 轮对话</span>
      <span>${metrics.wordsSpoken || 0} 个词</span>
      <span>${metrics.wordsPerMinute || 0} 词/分钟</span>
    </div>
    <h5>本次表现</h5>
    <ul>${(summary.highlights || []).map(item => `<li>${item}</li>`).join('')}</ul>
    <h5>下一步建议</h5>
    <ul>${(summary.nextSteps || []).map(item => `<li>${item}</li>`).join('')}</ul>
    <p class="summary-closing">${summary.closing || ''}</p>
  `;
  elements.summaryPanel.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function buildLocalSummary() {
  return {
    scenario: AppState.selectedScenario || '通用练习',
    metrics: {
      messagesCount: AppState.currentSession.messagesCount,
      wordsSpoken: AppState.currentSession.wordsSpoken,
      wordsPerMinute: 0
    },
    highlights: ['你完成了一次口语练习。'],
    nextSteps: ['再练一轮，并尽量使用更完整的长句回答。'],
    closing: '总结服务暂时不可用，因此这里显示本地总结。'
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
