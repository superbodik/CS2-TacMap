import json
from pathlib import Path

LOCALES_DIR = Path(__file__).resolve().parent / "locales"
LANGUAGES = ("ru", "uk", "en")
DEFAULT = "ru"

_cache = {}


def _load(locale):
    if locale not in _cache:
        path = LOCALES_DIR / f"{locale}.json"
        with path.open(encoding="utf-8") as handle:
            _cache[locale] = json.load(handle)
    return _cache[locale]


def t(locale, key, **params):
    bundle = _load(locale if locale in LANGUAGES else DEFAULT)
    text = bundle.get(key)
    if text is None:
        text = _load(DEFAULT).get(key, key)
    if params:
        try:
            return text.format(**params)
        except (KeyError, IndexError):
            return text
    return text


def name_of(locale):
    return t(locale, "meta.name")


def flag_of(locale):
    return t(locale, "meta.flag")


def from_discord_locale(locale):
    raw = str(locale or "").lower()
    if raw.startswith("uk"):
        return "uk"
    if raw.startswith("ru"):
        return "ru"
    if raw.startswith("en"):
        return "en"
    return DEFAULT
