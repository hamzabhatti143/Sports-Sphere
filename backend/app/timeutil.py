"""Helpers for slot time math, handling windows that end at midnight (00:00),
which represent 24:00 / end-of-day rather than the start of the day."""
from datetime import time


def minutes_of(t: time) -> int:
    return t.hour * 60 + t.minute


def start_minutes(t: time) -> int:
    """Minutes-since-midnight for a start boundary."""
    return minutes_of(t)


def end_minutes(t: time) -> int:
    """Minutes-since-midnight for an END boundary; 00:00 means 24:00 (1440)."""
    m = minutes_of(t)
    return 1440 if m == 0 else m


def start_hour(t: time) -> int:
    return t.hour


def end_hour(t: time) -> int:
    """Hour for an END boundary; 00:00 -> 24."""
    return 24 if (t.hour == 0 and t.minute == 0) else t.hour
