"""MongoDB access. Django's own tables stay in SQLite; our data goes here."""

from functools import cache

from django.conf import settings
from django.core.exceptions import ImproperlyConfigured
from pymongo import MongoClient
from pymongo.database import Database


def is_configured() -> bool:
    return bool(settings.MONGODB_URI)


@cache
def _client() -> MongoClient:
    if not is_configured():
        raise ImproperlyConfigured(
            "MONGODB_URI is not set. Copy backend/.env.example to backend/.env."
        )
    return MongoClient(settings.MONGODB_URI)


def get_db() -> Database:
    return _client()[settings.MONGODB_DB]
