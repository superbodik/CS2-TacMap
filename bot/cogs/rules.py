import disnake
from disnake.ext import commands

from config import config
from i18n import from_discord_locale
from storage import storage
from ui.rules import RulesView, rules_embed


class Rules(commands.Cog):
    def __init__(self, bot):
        self.bot = bot

    def lang_for(self, interaction):
        return storage.language_of(interaction.author.id, from_discord_locale(interaction.locale))

    @commands.slash_command(name="rules", description="Показать правила сервера / Show the server rules")
    async def rules(
        self,
        interaction: disnake.ApplicationCommandInteraction,
        lang: str = commands.Param(default=None, choices={"Русский": "ru", "Українська": "uk", "English": "en"})
    ):
        chosen = lang or self.lang_for(interaction)
        await interaction.response.send_message(embed=rules_embed(chosen), view=RulesView(), ephemeral=True)

    @commands.slash_command(name="postrules", description="Опубликовать правила в канале / Post the rules")
    @commands.has_permissions(manage_guild=True)
    async def postrules(
        self,
        interaction: disnake.ApplicationCommandInteraction,
        channel: disnake.TextChannel = commands.Param(default=None, description="Канал для правил"),
        lang: str = commands.Param(default="ru", choices={"Русский": "ru", "Українська": "uk", "English": "en"}),
        pin: bool = commands.Param(default=True, description="Закрепить сообщение")
    ):
        target = channel or interaction.channel
        await interaction.response.defer(ephemeral=True)

        message = await target.send(embed=rules_embed(lang), view=RulesView())
        if pin:
            try:
                await message.pin(reason="CS2 TacMap rules")
            except (disnake.Forbidden, disnake.HTTPException):
                pass

        await interaction.edit_original_response(content=f"Правила опубликованы: {message.jump_url}")

    @commands.slash_command(name="legal", description="Документы mineDres-Team / Legal documents")
    async def legal(self, interaction: disnake.ApplicationCommandInteraction):
        lang = self.lang_for(interaction)
        embed = disnake.Embed(
            title="mineDres-Team · Legal",
            description=(
                f"[Условия использования]({config.terms_url})\n"
                f"[Политика конфиденциальности]({config.privacy_url})\n"
                "[Discord Terms of Service](https://discord.com/terms)\n"
                "[Discord Privacy Policy](https://discord.com/privacy)"
            ),
            colour=config.accent
        )
        embed.set_footer(text=config.brand)
        await interaction.response.send_message(embed=embed, view=RulesView(), ephemeral=True)


def setup(bot):
    bot.add_cog(Rules(bot))
