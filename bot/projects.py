from storage import storage

DEFAULT_PROJECTS = [
    {
        "key": "cs2-tacmap",
        "name": "CS2 TacMap",
        "emoji": "🗺️",
        "colour": 0x5B8DEF,
        "description": "Тактическая карта CS2 · Tactical board",
        "url": "https://superbodik.github.io/CS2-TacMap/"
    },
    {
        "key": "crc-code",
        "name": "CRC Code",
        "emoji": "🧩",
        "colour": 0x4CB782,
        "description": "Редактор кода · Code editor",
        "url": "https://github.com/superbodik/crc-code"
    },
    {
        "key": "team-news",
        "name": "Новости команды",
        "emoji": "📣",
        "colour": 0xE0A35C,
        "description": "Анонсы mineDres-Team · Team announcements",
        "url": "https://discord.gg/ZMG7Z8pTs5"
    }
]

MAX_PROJECTS = 20


def normalize(entry):
    return {
        "key": str(entry.get("key", ""))[:32],
        "name": str(entry.get("name", ""))[:64],
        "emoji": str(entry.get("emoji", "📌"))[:8],
        "colour": int(entry.get("colour", 0x8A919B)),
        "description": str(entry.get("description", ""))[:96],
        "url": str(entry.get("url", ""))[:200],
        "role_id": entry.get("role_id")
    }


def list_for(guild_id):
    stored = storage.guild(guild_id).get("projects")
    if not stored:
        return [normalize(item) for item in DEFAULT_PROJECTS]
    return [normalize(item) for item in stored]


async def save_for(guild_id, items):
    trimmed = [normalize(item) for item in items][:MAX_PROJECTS]
    await storage.set_guild(guild_id, {"projects": trimmed})
    return trimmed


def role_name(entry):
    return f"{entry['emoji']} {entry['name']}"


def find(items, key):
    for item in items:
        if item["key"] == key:
            return item
    return None
