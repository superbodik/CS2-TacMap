import os
from pathlib import Path

from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parent
PROJECT_ROOT = ROOT.parent
load_dotenv(PROJECT_ROOT / ".env")
load_dotenv(ROOT / ".env", override=True)


def _int(name, default=0):
    raw = os.getenv(name, "").strip()
    try:
        return int(raw)
    except ValueError:
        return default


def _str(name, default=""):
    return os.getenv(name, default).strip()


class Config:
    token = _str("BOT_TOKEN")
    guild_id = _int("GUILD_ID")
    main_channel_id = _int("MAIN_CHANNEL_ID")
    announce_channel_id = _int("ANNOUNCE_CHANNEL_ID")
    log_channel_id = _int("LOG_CHANNEL_ID")

    role_ru = _int("ROLE_RU")
    role_uk = _int("ROLE_UK")
    role_en = _int("ROLE_EN")

    api_base = _str("API_BASE", "http://127.0.0.1:8787").rstrip("/")
    site_url = _str("SITE_URL", "https://minedres.github.io/CS2-TacMap/").rstrip("/")
    invite_url = _str("INVITE_URL", "https://discord.gg/ZMG7Z8pTs5")

    data_file = Path(_str("DATA_FILE", str(ROOT / "data" / "bot.json")))
    accent = 0x5B8DEF
    accent_warn = 0xE0A35C
    accent_bad = 0xE0575F
    accent_ok = 0x4CB782
    brand = "CS2 TacMap · mineDres-Team"

    @classmethod
    def role_for(cls, lang):
        return {"ru": cls.role_ru, "uk": cls.role_uk, "en": cls.role_en}.get(lang, 0)

    @classmethod
    def language_roles(cls):
        return [role for role in (cls.role_ru, cls.role_uk, cls.role_en) if role]

    @classmethod
    def validate(cls):
        problems = []
        if not cls.token:
            problems.append("BOT_TOKEN не задан в bot/.env")
        if not cls.main_channel_id:
            problems.append("MAIN_CHANNEL_ID не задан — панель языков придётся ставить командой /panel")
        return problems


config = Config()
