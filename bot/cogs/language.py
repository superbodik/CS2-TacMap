import disnake
from disnake.ext import commands

from config import config
from i18n import from_discord_locale, name_of
from storage import storage
from ui.language import LanguageView, panel_embed


class Language(commands.Cog):
    def __init__(self, bot):
        self.bot = bot

    def lang_for(self, interaction):
        return storage.language_of(interaction.author.id, from_discord_locale(interaction.locale))

    async def publish_panel(self, channel):
        message_id = storage.panel_message(channel.id)
        view = LanguageView()

        if message_id:
            try:
                message = await channel.fetch_message(message_id)
                await message.edit(embed=panel_embed(), view=view)
                return message
            except (disnake.NotFound, disnake.Forbidden):
                pass

        message = await channel.send(embed=panel_embed(), view=view)
        await storage.set_panel_message(channel.id, message.id)
        try:
            await message.pin(reason="CS2 TacMap language panel")
        except (disnake.Forbidden, disnake.HTTPException):
            pass
        return message

    @commands.Cog.listener()
    async def on_ready(self):
        if not config.main_channel_id:
            return
        channel = self.bot.get_channel(config.main_channel_id)
        if channel is None:
            return
        try:
            await self.publish_panel(channel)
        except disnake.Forbidden:
            print("[bot] нет прав писать в MAIN_CHANNEL_ID")

    @commands.slash_command(name="panel", description="Опубликовать панель выбора языка / Post the language panel")
    @commands.has_permissions(manage_guild=True)
    async def panel(
        self,
        interaction: disnake.ApplicationCommandInteraction,
        channel: disnake.TextChannel = commands.Param(default=None, description="Канал для панели")
    ):
        target = channel or interaction.channel
        await interaction.response.defer(ephemeral=True)
        message = await self.publish_panel(target)
        await interaction.edit_original_response(content=f"Панель опубликована: {message.jump_url}")

    @commands.slash_command(name="language", description="Сменить язык / Change language / Змінити мову")
    async def language(
        self,
        interaction: disnake.ApplicationCommandInteraction,
        lang: str = commands.Param(choices={"Русский": "ru", "Українська": "uk", "English": "en"})
    ):
        from ui.language import apply_language
        from i18n import t

        await storage.set_language(interaction.author.id, lang)
        lines = [t(lang, "select.applied", lang=name_of(lang))]

        if isinstance(interaction.author, disnake.Member):
            role, status = await apply_language(interaction.author, lang)
            if status == "ok" and role is not None:
                lines.append(t(lang, "select.role_added", role=role.mention))
            elif status == "missing":
                lines.append(t(lang, "select.role_missing"))
            else:
                lines.append(t(lang, "select.error"))

        embed = disnake.Embed(description="\n".join(lines), colour=config.accent_ok)
        embed.set_footer(text=config.brand)
        await interaction.response.send_message(embed=embed, ephemeral=True)

    @commands.slash_command(name="langstats", description="Статистика по языкам / Language stats")
    @commands.has_permissions(manage_guild=True)
    async def langstats(self, interaction: disnake.ApplicationCommandInteraction):
        counts = storage.counters()
        embed = disnake.Embed(title="Языки участников", colour=config.accent)
        for code, amount in counts.items():
            embed.add_field(name=name_of(code), value=str(amount), inline=True)
        embed.set_footer(text=config.brand)
        await interaction.response.send_message(embed=embed, ephemeral=True)


def setup(bot):
    bot.add_cog(Language(bot))
