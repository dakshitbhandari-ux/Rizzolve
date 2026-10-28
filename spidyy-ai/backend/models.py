"""
Spidyy AI - database tables for question groups (Phase 2).

    question_groups       one row per group of questions that ask for the same answer
    question_submissions  one row per answered question, linked to its group

No personal data is stored: no user, session, IP address or device, and no Gemini answer.
question_count is the total number of submissions in a group (the same student asking twice
counts twice). Counting unique students would need a user identifier, which is not collected.
"""

from datetime import datetime, timezone

from sqlalchemy import (
    BigInteger,
    CheckConstraint,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    LargeBinary,
    String,
    Text,
    func,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship

# BIGINT ids on PostgreSQL. SQLite (used in tests) only auto-increments INTEGER primary keys.
BigId = BigInteger().with_variant(Integer, "sqlite")


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Base(DeclarativeBase):
    pass


class QuestionGroup(Base):
    __tablename__ = "question_groups"

    id: Mapped[int] = mapped_column(BigId, primary_key=True)
    # The group's first question. New questions are compared with its embedding.
    canonical_question: Mapped[str] = mapped_column(Text, nullable=False)
    # Unit-length embedding as little-endian float32 bytes (MiniLM: 384 values = 1536 bytes).
    representative_embedding: Mapped[bytes] = mapped_column(LargeBinary, nullable=False)
    # Embeddings from different models cannot be compared, so a question is only matched with
    # groups made by the same model.
    embedding_model: Mapped[str] = mapped_column(String(200), nullable=False)
    embedding_dim: Mapped[int] = mapped_column(Integer, nullable=False)
    # Total submissions in this group. Only changed in the transaction that inserts a submission,
    # so it always equals the number of question_submissions rows for the group.
    question_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utcnow, server_default=func.now()
    )
    last_asked_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utcnow, server_default=func.now()
    )

    submissions: Mapped[list["QuestionSubmission"]] = relationship(back_populates="group")

    __table_args__ = (
        CheckConstraint("question_count >= 0", name="ck_question_groups_count_not_negative"),
        CheckConstraint("embedding_dim > 0", name="ck_question_groups_dim_positive"),
        # Loading one model's groups in id order.
        Index("ix_question_groups_model_id", "embedding_model", "id"),
        # Most frequently asked groups (Phase 3).
        Index("ix_question_groups_question_count", "question_count"),
    )


class QuestionSubmission(Base):
    __tablename__ = "question_submissions"

    id: Mapped[int] = mapped_column(BigId, primary_key=True)
    # The question as asked (surrounding whitespace removed; case and punctuation kept).
    original_question: Mapped[str] = mapped_column(Text, nullable=False)
    # SHA-256 of the normalised question: finds exact repeats with a small index
    # (questions can be 2000 characters, too long for a plain text index).
    question_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    question_group_id: Mapped[int] = mapped_column(
        BigId, ForeignKey("question_groups.id", ondelete="RESTRICT"), nullable=False
    )
    # How the group was chosen: "exact", "similar" or "new", with the cosine score
    # (empty for "new"). Kept to audit grouping mistakes later.
    match_reason: Mapped[str] = mapped_column(String(20), nullable=False)
    similarity_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utcnow, server_default=func.now()
    )

    group: Mapped[QuestionGroup] = relationship(back_populates="submissions")

    __table_args__ = (
        Index("ix_question_submissions_question_hash", "question_hash"),
        Index("ix_question_submissions_group_created", "question_group_id", "created_at"),
    )
