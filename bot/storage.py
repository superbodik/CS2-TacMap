import asyncio
import json
from pathlib import Path

from config import config


class Storage:
    def __init__(self, path: Path):
        self.path = path
        self.lock = asyncio.Lock()
        self.data = {"users": {}, "panels": {}, "stats": {}, "guilds": {}}
        self._load()

    def _load(self):
        if not self.path.exists():
            self.path.parent.mkdir(parents=True, exist_ok=True)
            self._write()
            return
        try:
            with self.path.open(encoding="utf-8") as handle:
                loaded = json.load(handle)
            self.data.update(loaded)
        except (json.JSONDecodeError, OSError):
            self._write()

    def _write(self):
        self.path.parent.mkdir(parents=True, exist_ok=True)
        temp = self.path.with_suffix(".tmp")
        with temp.open("w", encoding="utf-8") as handle:
            json.dump(self.data, handle, ensure_ascii=False, indent=2)
        temp.replace(self.path)

    async def save(self):
        async with self.lock:
            await asyncio.to_thread(self._write)

    def language_of(self, user_id, fallback="ru"):
        return self.data["users"].get(str(user_id), {}).get("lang", fallback)

    async def set_language(self, user_id, lang):
        entry = self.data["users"].setdefault(str(user_id), {})
        entry["lang"] = lang
        await self.save()

    def panel_message(self, channel_id):
        return self.data["panels"].get(str(channel_id))

    async def set_panel_message(self, channel_id, message_id):
        self.data["panels"][str(channel_id)] = message_id
        await self.save()

    def guild(self, guild_id):
        return self.data["guilds"].get(str(guild_id), {})

    def guild_roles(self, guild_id):
        return self.guild(guild_id).get("roles", {})

    def guild_channels(self, guild_id):
        return self.guild(guild_id).get("channels", {})

    async def set_guild(self, guild_id, patch):
        entry = self.data["guilds"].setdefault(str(guild_id), {})
        entry.update(patch)
        await self.save()
        return entry

    def counters(self):
        counts = {"ru": 0, "uk": 0, "en": 0}
        for entry in self.data["users"].values():
            lang = entry.get("lang")
            if lang in counts:
                counts[lang] += 1
        return counts


storage = Storage(config.data_file)
