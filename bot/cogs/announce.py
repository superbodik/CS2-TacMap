import disnake
from disnake.ext import commands

from config import config
from i18n import LANGUAGES, flag_of, name_of, t


class AnnounceModal(disnake.ui.Modal):
    def __init__(self, channel, mention_roles, colour):
        self.channel = channel
        self.mention_roles = mention_roles
        self.colour = colour
        components = [
            disnake.ui.TextInput(label="Заголовок", custom_id="title", max_length=200, style=disnake.TextInputStyle.short),
            disnake.ui.TextInput(label="Текст", custom_id="body", max_length=3500, style=disnake.TextInputStyle.paragraph),
            disnake.ui.TextInput(label="Ссылка (необязательно)", custom_id="link", required=False, max_length=300, style=disnake.TextInputStyle.short),
            disnake.ui.TextInput(label="Картинка URL (необязательно)", custom_id="image", required=False, max_length=300, style=disnake.TextInputStyle.short)
        ]
        super().__init__(title="Анонс mineDres-Team", custom_id="tacmap:announce", components=components)

    async def callback(self, interaction: disnake.ModalInteraction):
        values = interaction.text_values
        embed = disnake.Embed(
            title=values["title"],
            description=values["body"],
            colour=self.colour,
            url=values.get("link") or None
        )
        if values.get("image"):
            embed.set_image(url=values["image"])
        if interaction.guild and interaction.guild.icon:
            embed.set_thumbnail(url=interaction.guild.icon.url)
        embed.set_footer(text=t("ru", "announce.footer"), icon_url=interaction.author.display_avatar.url)
        embed.timestamp = interaction.created_at

        content = " ".join(role.mention for role in self.mention_roles) if self.mention_roles else None
        message = await self.channel.send(content=content, embed=embed)
        await interaction.response.send_message(f"Опубликовано: {message.jump_url}", ephemeral=True)


class Announce(commands.Cog):
    def __init__(self, bot):
        self.bot = bot

    @commands.slash_command(name="announce", description="Опубликовать красивый анонс / Post an announcement")
    @commands.has_permissions(manage_messages=True)
    async def announce(
        self,
        interaction: disnake.ApplicationCommandInteraction,
        channel: disnake.TextChannel = commands.Param(default=None, description="Куда публиковать"),
        ping: str = commands.Param(default="none", choices={"Без пинга": "none", "Все языки": "all", "Русский": "ru", "Українська": "uk", "English": "en"}),
        style: str = commands.Param(default="info", choices={"Инфо": "info", "Важное": "warn", "Апдейт": "ok"})
    ):
        target = channel or self.bot.get_channel(config.announce_channel_id) or interaction.channel

        roles = []
        if ping != "none" and interaction.guild:
            codes = LANGUAGES if ping == "all" else (ping,)
            for code in codes:
                role = interaction.guild.get_role(config.role_for(code))
                if role:
                    roles.append(role)

        colour = {"info": config.accent, "warn": config.accent_warn, "ok": config.accent_ok}[style]
        await interaction.response.send_modal(AnnounceModal(target, roles, colour))

    @commands.slash_command(name="say", description="Короткое сообщение от имени бота / Quick bot message")
    @commands.has_permissions(manage_messages=True)
    async def say(
        self,
        interaction: disnake.ApplicationCommandInteraction,
        text: str = commands.Param(description="Текст сообщения"),
        channel: disnake.TextChannel = commands.Param(default=None)
    ):
        target = channel or interaction.channel
        embed = disnake.Embed(description=text, colour=config.accent)
        embed.set_footer(text=config.brand)
        message = await target.send(embed=embed)
        await interaction.response.send_message(f"Отправлено: {message.jump_url}", ephemeral=True)

    @commands.slash_command(name="help", description="Помощь по боту / Bot help")
    async def help_command(self, interaction: disnake.ApplicationCommandInteraction):
        embed = disnake.Embed(
            title="CS2 TacMap Bot",
            description="\n".join([
                "`/setup` — развернуть языковую структуру сервера",
                "`/panel` — панель выбора языка в канале",
                "`/language` — сменить свой язык",
                "`/tacmap` — ссылка на тактическую карту",
                "`/strat <код>` — карточка страты из API",
                "`/maps` — список карт",
                "`/status` — статус API",
                "`/rules`, `/postrules` — правила сервера",
                "`/legal` — документы команды",
                "`/announce` — анонс с оформлением",
                "`/say` — быстрое сообщение"
            ]),
            colour=config.accent
        )
        embed.add_field(
            name="Языки",
            value=" · ".join(f"{flag_of(code)} {name_of(code)}" for code in LANGUAGES),
            inline=False
        )
        embed.set_footer(text=config.brand)
        await interaction.response.send_message(embed=embed, ephemeral=True)


def setup(bot):
    bot.add_cog(Announce(bot))
