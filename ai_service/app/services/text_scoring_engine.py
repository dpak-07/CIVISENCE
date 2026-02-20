import re
from dataclasses import dataclass


HIGH_RISK = [
    "accident",
    "injury",
    "emergency",
    "collapsed",
    "fire",
    "exposed wire",
    "flooding main road",
]

MEDIUM_RISK = [
    "dangerous",
    "deep",
    "overflow",
    "blocking traffic",
    "severe",
    "heavy leakage",
]

NORMAL_RISK = [
    "pothole",
    "garbage",
    "drainage",
    "leak",
    "broken",
    "damaged",
    "streetlight",
]

DEFAULT_STOP_WORDS = {
    "a",
    "an",
    "and",
    "are",
    "as",
    "at",
    "be",
    "but",
    "by",
    "for",
    "from",
    "has",
    "have",
    "he",
    "her",
    "his",
    "i",
    "in",
    "is",
    "it",
    "its",
    "me",
    "my",
    "of",
    "on",
    "or",
    "our",
    "she",
    "that",
    "the",
    "their",
    "them",
    "there",
    "they",
    "this",
    "to",
    "was",
    "we",
    "were",
    "with",
    "you",
    "your",
}


@dataclass(frozen=True)
class TextScoreResult:
    filtered_text: str
    high_count: int
    medium_count: int
    normal_count: int
    base_score: float
    matched_high: list[str]
    matched_medium: list[str]
    matched_normal: list[str]


class TextScoringEngine:
    def __init__(self, stop_words: set[str] | None = None) -> None:
        self.stop_words = stop_words or DEFAULT_STOP_WORDS
        self._high_patterns = self._compile_patterns(HIGH_RISK)
        self._medium_patterns = self._compile_patterns(MEDIUM_RISK)
        self._normal_patterns = self._compile_patterns(NORMAL_RISK)

    def score(self, title: str | None, description: str | None) -> TextScoreResult:
        combined = f"{title or ''} {description or ''}".strip().lower()
        filtered_text = self._normalize(combined, remove_stop_words=True)

        high_count, matched_high = self._count_group_matches(filtered_text, self._high_patterns)
        medium_count, matched_medium = self._count_group_matches(filtered_text, self._medium_patterns)
        normal_count, matched_normal = self._count_group_matches(filtered_text, self._normal_patterns)

        base_score = float(min(6, (high_count * 3) + (medium_count * 2) + normal_count))
        return TextScoreResult(
            filtered_text=filtered_text,
            high_count=high_count,
            medium_count=medium_count,
            normal_count=normal_count,
            base_score=base_score,
            matched_high=matched_high,
            matched_medium=matched_medium,
            matched_normal=matched_normal,
        )

    def _compile_patterns(self, keywords: list[str]) -> list[tuple[str, re.Pattern[str]]]:
        patterns: list[tuple[str, re.Pattern[str]]] = []
        for keyword in keywords:
            normalized = self._normalize(keyword, remove_stop_words=True)
            if not normalized:
                continue
            patterns.append(
                (
                    keyword,
                    re.compile(rf"(?<!\w){re.escape(normalized)}(?!\w)"),
                )
            )
        return patterns

    def _normalize(self, text: str, remove_stop_words: bool) -> str:
        tokens = re.findall(r"[a-z0-9]+", text.lower())
        if remove_stop_words:
            tokens = [token for token in tokens if token not in self.stop_words]
        return " ".join(tokens)

    @staticmethod
    def _count_group_matches(
        text: str,
        patterns: list[tuple[str, re.Pattern[str]]],
    ) -> tuple[int, list[str]]:
        count = 0
        matched_keywords: list[str] = []

        for keyword, pattern in patterns:
            matches = len(pattern.findall(text))
            if matches > 0:
                count += matches
                matched_keywords.append(keyword)

        return count, matched_keywords
