from enum import Enum


class SceneId(str, Enum):
    INTERVIEW = "interview"
    ORDERING = "ordering"
    MEETING = "meeting"
    CASUAL_CHAT = "casual_chat"
    TRAVEL = "travel"
    IELTS = "ielts"


class MessageRole(str, Enum):
    USER = "user"
    ASSISTANT = "assistant"
    SYSTEM = "system"


class CorrectionType(str, Enum):
    GRAMMAR = "grammar"
    EXPRESSION = "expression"
    PRONUNCIATION = "pronunciation"
    VOCABULARY = "vocabulary"


class CorrectionSeverity(str, Enum):
    MINOR = "minor"
    MODERATE = "moderate"
    MAJOR = "major"


class SessionStatus(str, Enum):
    ACTIVE = "active"
    ENDED = "ended"
    REPORT_READY = "report_ready"


class WSEventType(str, Enum):
    """WebSocket 事件类型 — 客户端与服务端共用。"""

    # Client → Server
    AUDIO_CHUNK = "audio_chunk"
    AUDIO_END = "audio_end"
    TEXT_INPUT = "text_input"
    PING = "ping"

    # Server → Client
    TRANSCRIPT = "transcript"
    ASSISTANT_MESSAGE = "assistant_message"
    ASSISTANT_DELTA = "assistant_delta"
    ASSISTANT_AUDIO = "assistant_audio"
    CORRECTION = "correction"
    ERROR = "error"
    PONG = "pong"
    SESSION_ENDED = "session_ended"
