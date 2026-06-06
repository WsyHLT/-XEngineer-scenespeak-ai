from pydantic import BaseModel, Field

from app.schemas.message import Correction


class WordPronunciationFeedback(BaseModel):
    word: str
    accuracy_score: float = Field(..., ge=0, le=100)
    phoneme: str | None = Field(default=None, description="标准音标/音素，如 AH0 L OW")
    error_type: str | None = Field(default=None, description="Omission / Insertion / Mispronunciation 等")


class PronunciationAssessment(BaseModel):
    """Azure Pronunciation Assessment 结构化结果。"""

    accuracy: float = Field(..., ge=0, le=100)
    fluency: float = Field(..., ge=0, le=100)
    completeness: float = Field(..., ge=0, le=100)
    overall: float = Field(..., ge=0, le=100, description="综合发音分 PronScore")
    prosody: float | None = Field(default=None, ge=0, le=100)
    words: list[WordPronunciationFeedback] = Field(default_factory=list)
    corrections: list[Correction] = Field(
        default_factory=list,
        description="由音素/词级错误生成的 pronunciation 类型纠错",
    )
