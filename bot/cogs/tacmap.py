import datetime

import aiohttp
import disnake
from disnake.ext import commands

from config import config
from i18n import from_discord_locale, t
from storage import storage


class TacMap(commands.Cog):
    def __init__(self, bot):
        self.bot = bot
        self.session = None

    async def cog_load(self):
        self.session = aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=12))

    async def cog_unload(self):
        if self.session:
            await self.session.close()

    def lang_for(self, interaction):
        return storage.language_of(interaction.author.id, from_discord_locale(interaction.locale))

    async def fetch(self, path):
        if self.session is None:
            self.session = aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=12))
        async with self.session.get(f"{config.api_base}{path}") as response:
            payload = await response.json(content_type=None)
            return response.status, payload

    @commands.slash_command(name="tacmap", description="Ссылка на тактическую карту / Tactical board link")
    async def tacmap(self, interaction: disnake.ApplicationCommandInteraction):
        lang = self.lang_for(interaction)
        embed = disnake.Embed(
            title=t(lang, "cmd.tacmap.title"),
            description=t(lang, "cmd.tacmap.description"),
            colour=config.accent,
            url=config.site_url
        )
        embed.set_footer(text=config.brand)

        view = disnake.ui.View()
        view.add_item(disnake.ui.Button(label=t(lang, "cmd.tacmap.button"), url=config.site_url, style=disnake.ButtonStyle.link, emoji="🗺️"))
        view.add_item(disnake.ui.Button(label=t(lang, "cmd.tacmap.invite"), url=config.invite_url, style=disnake.ButtonStyle.link))
        await interaction.response.send_message(embed=embed, view=view)

    @commands.slash_command(name="strat", description="Показать страту по коду / Show a strat by id")
    async def strat(
        self,
        interaction: disnake.ApplicationCommandInteraction,
        code: str = commands.Param(description="Код страты из короткой ссылки")
    ):
        lang = self.lang_for(interaction)
        await interaction.response.defer()

        try:
            status, payload = await self.fetch(f"/api/strats/{code}")
        except Exception as error:
            await interaction.edit_original_response(content=t(lang, "cmd.strat.api_down", error=str(error)[:120]))
            return

        if status != 200 or not payload or "strat" not in payload:
            await interaction.edit_original_response(content=t(lang, "cmd.strat.not_found", id=code))
            return

        strat = payload["strat"]
        doc = strat.get("doc", {})
        link = f"{config.site_url}?s={strat['id']}"

        embed = disnake.Embed(
            title=t(lang, "cmd.strat.title", name=strat.get("name", code)),
            colour=config.accent,
            url=link,
            timestamp=datetime.datetime.fromtimestamp(strat.get("updatedAt", 0) / 1000, tz=datetime.timezone.utc)
        )
        embed.add_field(name=t(lang, "cmd.strat.map"), value=str(strat.get("map", "—")), inline=True)
        embed.add_field(
            name=t(lang, "cmd.strat.objects"),
            value=t(
                lang,
                "cmd.strat.objects.value",
                entities=len(doc.get("e", [])),
                strokes=len(doc.get("s", [])),
                nades=len(doc.get("n", [])),
                rulers=len(doc.get("r", []))
            ),
            inline=True
        )
        embed.set_footer(text=config.brand)

        view = disnake.ui.View()
        view.add_item(disnake.ui.Button(label=t(lang, "cmd.strat.open"), url=link, style=disnake.ButtonStyle.link, emoji="🗺️"))
        await interaction.edit_original_response(embed=embed, view=view)

    @commands.slash_command(name="maps", description="Список карт / Map list")
    async def maps(self, interaction: disnake.ApplicationCommandInteraction):
        lang = self.lang_for(interaction)
        await interaction.response.defer()

        try:
            status, payload = await self.fetch("/api/maps")
        except Exception as error:
            await interaction.edit_original_response(content=t(lang, "cmd.strat.api_down", error=str(error)[:120]))
            return

        items = payload.get("items", []) if status == 200 else []
        lines = [f"`{item['id']}` — {item['name']} ({', '.join(item['floors'])})" for item in items]

        embed = disnake.Embed(
            title=t(lang, "cmd.maps.title"),
            description="\n".join(lines) or t(lang, "cmd.status.offline"),
            colour=config.accent
        )
        embed.set_footer(text=config.brand)
        await interaction.edit_original_response(embed=embed)

    @commands.slash_command(name="status", description="Статус API / API status")
    async def status(self, interaction: disnake.ApplicationCommandInteraction):
        lang = self.lang_for(interaction)
        await interaction.response.defer(ephemeral=True)

        try:
            code, payload = await self.fetch("/api/health")
            online = code == 200 and payload.get("ok")
        except Exception:
            payload, online = {}, False

        embed = disnake.Embed(
            title=t(lang, "cmd.status.title"),
            colour=config.accent_ok if online else config.accent_bad
        )
        embed.add_field(
            name=t(lang, "cmd.status.api"),
            value=t(lang, "cmd.status.online", version=payload.get("version", "?")) if online else t(lang, "cmd.status.offline"),
            inline=False
        )
        if online:
            embed.add_field(
                name=t(lang, "cmd.status.stats"),
                value=t(lang, "cmd.status.stats.value", strats=payload.get("strats", 0), users=payload.get("users", 0)),
                inline=False
            )
        embed.set_footer(text=config.brand)
        await interaction.edit_original_response(embed=embed)


def setup(bot):
    bot.add_cog(TacMap(bot))
