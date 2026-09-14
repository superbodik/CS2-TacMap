import disnake
from disnake.ext import commands

from config import config
from i18n import LANGUAGES, flag_of, name_of, t
from storage import storage
from ui.language import LanguageView, panel_embed
from ui.rules import RulesView, rules_embed
from ui.projects import ProjectsView, projects_embed
from projects import list_for, role_name

ROLE_STYLE = {
    "ru": {"name": "🇷🇺 Русский", "colour": 0x5B8DEF},
    "uk": {"name": "🇺🇦 Українська", "colour": 0xE0C15C},
    "en": {"name": "🇬🇧 English", "colour": 0x4CB782}
}

CATEGORY_NAMES = {
    "ru": "🇷🇺 РУССКИЙ",
    "uk": "🇺🇦 УКРАЇНСЬКА",
    "en": "🇬🇧 ENGLISH"
}

CHANNELS = {
    "ru": [("новости", "text", False), ("общение", "text", True), ("страты", "text", True), ("разбор-демок", "text", True), ("Голосовой", "voice", True)],
    "uk": [("новини", "text", False), ("спілкування", "text", True), ("страти", "text", True), ("розбір-демок", "text", True), ("Голосовий", "voice", True)],
    "en": [("news", "text", False), ("general", "text", True), ("strats", "text", True), ("demo-review", "text", True), ("Voice", "voice", True)]
}

INFO_CATEGORY = "ℹ️ ИНФОРМАЦИЯ · INFO"
RULES_CHANNEL = "правила-rules"
LANGUAGE_CHANNEL = "выбор-языка-language"
PROJECTS_CHANNEL = "выбор-проектов-projects"

TOPIC = "Выберите язык · Оберіть мову · Choose your language"


class Setup(commands.Cog):
    def __init__(self, bot):
        self.bot = bot

    def find_role(self, guild, name, stored_id):
        if stored_id:
            role = guild.get_role(int(stored_id))
            if role:
                return role
        return disnake.utils.get(guild.roles, name=name)

    def find_channel(self, guild, name, category=None):
        for channel in guild.channels:
            if channel.name.lower() == name.lower() and (category is None or channel.category_id == category.id):
                return channel
        return None

    async def ensure_roles(self, guild, log):
        stored = storage.guild_roles(guild.id)
        mapping = {}
        for code in LANGUAGES:
            style = ROLE_STYLE[code]
            role = self.find_role(guild, style["name"], stored.get(code))
            if role is None:
                role = await guild.create_role(
                    name=style["name"],
                    colour=disnake.Colour(style["colour"]),
                    mentionable=True,
                    reason="CS2 TacMap language setup"
                )
                log.append(f"➕ роль {role.name}")
            else:
                log.append(f"✓ роль {role.name}")
            mapping[code] = role.id
        await storage.set_guild(guild.id, {"roles": mapping})
        return {code: guild.get_role(role_id) for code, role_id in mapping.items()}

    async def ensure_info(self, guild, roles, log, post_rules):
        everyone = guild.default_role
        category = disnake.utils.get(guild.categories, name=INFO_CATEGORY)
        if category is None:
            category = await guild.create_category(INFO_CATEGORY, reason="CS2 TacMap setup")
            log.append(f"➕ категория {category.name}")
        else:
            log.append(f"✓ категория {category.name}")

        await category.edit(position=0)

        overwrites = {
            everyone: disnake.PermissionOverwrite(view_channel=True, send_messages=False, add_reactions=False, create_public_threads=False),
            guild.me: disnake.PermissionOverwrite(view_channel=True, send_messages=True, manage_messages=True, embed_links=True)
        }

        language_channel = self.find_channel(guild, LANGUAGE_CHANNEL, category) or self.find_channel(guild, LANGUAGE_CHANNEL)
        if language_channel is None:
            language_channel = await guild.create_text_channel(
                LANGUAGE_CHANNEL,
                category=category,
                topic=TOPIC,
                overwrites=overwrites,
                reason="CS2 TacMap language picker"
            )
            log.append(f"➕ канал #{language_channel.name}")
        else:
            await language_channel.edit(category=category, topic=TOPIC, overwrites=overwrites)
            log.append(f"✓ канал #{language_channel.name}")

        rules_channel = None
        if post_rules:
            rules_channel = self.find_channel(guild, RULES_CHANNEL, category) or self.find_channel(guild, RULES_CHANNEL)
            if rules_channel is None:
                rules_channel = await guild.create_text_channel(
                    RULES_CHANNEL,
                    category=category,
                    topic="Правила · Правила · Rules",
                    overwrites=overwrites,
                    reason="CS2 TacMap rules"
                )
                log.append(f"➕ канал #{rules_channel.name}")
            else:
                await rules_channel.edit(category=category, overwrites=overwrites)
                log.append(f"✓ канал #{rules_channel.name}")

        return language_channel, rules_channel

    async def ensure_language_space(self, guild, code, role, log):
        everyone = guild.default_role
        overwrites = {
            everyone: disnake.PermissionOverwrite(view_channel=False),
            role: disnake.PermissionOverwrite(view_channel=True, send_messages=True, connect=True, speak=True),
            guild.me: disnake.PermissionOverwrite(view_channel=True, send_messages=True, manage_channels=True)
        }

        category = disnake.utils.get(guild.categories, name=CATEGORY_NAMES[code])
        if category is None:
            category = await guild.create_category(CATEGORY_NAMES[code], overwrites=overwrites, reason="CS2 TacMap language space")
            log.append(f"➕ категория {category.name}")
        else:
            await category.edit(overwrites=overwrites)
            log.append(f"✓ категория {category.name}")

        created = []
        for name, kind, can_talk in CHANNELS[code]:
            existing = self.find_channel(guild, name, category)
            if existing is not None:
                continue
            channel_overwrites = dict(overwrites)
            if not can_talk:
                channel_overwrites[role] = disnake.PermissionOverwrite(view_channel=True, send_messages=False, add_reactions=True)
            if kind == "voice":
                await guild.create_voice_channel(name, category=category, overwrites=channel_overwrites, reason="CS2 TacMap language space")
            else:
                await guild.create_text_channel(name, category=category, overwrites=channel_overwrites, reason="CS2 TacMap language space")
            created.append(name)

        if created:
            log.append(f"➕ каналы {CATEGORY_NAMES[code]}: {', '.join(created)}")
        else:
            log.append(f"✓ каналы {CATEGORY_NAMES[code]} на месте")
        return category

    async def ensure_projects(self, guild, category, log):
        everyone = guild.default_role
        overwrites = {
            everyone: disnake.PermissionOverwrite(view_channel=True, send_messages=False, add_reactions=False),
            guild.me: disnake.PermissionOverwrite(view_channel=True, send_messages=True, manage_messages=True)
        }
        channel = self.find_channel(guild, PROJECTS_CHANNEL, category) or self.find_channel(guild, PROJECTS_CHANNEL)
        if channel is None:
            channel = await guild.create_text_channel(
                PROJECTS_CHANNEL,
                category=category,
                topic="Подписки на проекты · Project pings",
                overwrites=overwrites,
                reason="CS2 TacMap project roles"
            )
            log.append(f"➕ канал #{channel.name}")
        else:
            await channel.edit(category=category, overwrites=overwrites)
            log.append(f"✓ канал #{channel.name}")
        return channel

    async def ensure_project_roles(self, guild, log):
        items = list_for(guild.id)
        cog = self.bot.get_cog("Projects")
        if cog is not None:
            return await cog.ensure_roles(guild, items, log)
        return items

    @commands.slash_command(name="setup", description="Развернуть языковую структуру сервера / Set up language server")
    @commands.has_permissions(administrator=True)
    async def setup_command(
        self,
        interaction: disnake.ApplicationCommandInteraction,
        channels: bool = commands.Param(default=True, description="Создавать категории и каналы для каждого языка"),
        rules: bool = commands.Param(default=True, description="Создать канал с правилами"),
        panel: bool = commands.Param(default=True, description="Опубликовать панель выбора языка"),
        project_roles: bool = commands.Param(default=True, description="Создать роли и панель подписок на проекты")
    ):
        if interaction.guild is None:
            await interaction.response.send_message("Команда работает только на сервере.", ephemeral=True)
            return

        await interaction.response.defer(ephemeral=True)
        guild = interaction.guild
        log = []

        missing = []
        if not guild.me.guild_permissions.manage_roles:
            missing.append("Manage Roles")
        if not guild.me.guild_permissions.manage_channels:
            missing.append("Manage Channels")
        if missing:
            await interaction.edit_original_response(content=f"Боту не хватает прав: {', '.join(missing)}")
            return

        try:
            roles = await self.ensure_roles(guild, log)
            language_channel, rules_channel = await self.ensure_info(guild, roles, log, rules)
            category_for_info = language_channel.category

            if channels:
                for code in LANGUAGES:
                    await self.ensure_language_space(guild, code, roles[code], log)

            projects_channel = None
            if project_roles:
                projects_channel = await self.ensure_projects(guild, category_for_info, log)

            channel_ids = {"language": language_channel.id}
            if projects_channel:
                channel_ids["projects"] = projects_channel.id
            if rules_channel:
                channel_ids["rules"] = rules_channel.id
            await storage.set_guild(guild.id, {"channels": channel_ids})

            if panel:
                await self.publish(language_channel, panel_embed(), LanguageView(), "panel")
                log.append(f"➕ панель языков в #{language_channel.name}")

            if rules and rules_channel:
                await self.publish(rules_channel, rules_embed("ru"), RulesView(), "rules")
                log.append(f"➕ правила в #{rules_channel.name}")

            if project_roles and projects_channel:
                items = await self.ensure_project_roles(guild, log)
                await self.publish(projects_channel, projects_embed(items), ProjectsView(items), "projects")
                log.append(f"➕ панель проектов в #{projects_channel.name}")

        except disnake.Forbidden as error:
            await interaction.edit_original_response(content=f"Недостаточно прав: {error}. Поднимите роль бота выше языковых ролей.")
            return
        except disnake.HTTPException as error:
            await interaction.edit_original_response(content=f"Discord отклонил запрос: {error}")
            return

        embed = disnake.Embed(
            title="Сервер настроен",
            description="\n".join(log[:20]),
            colour=config.accent_ok
        )
        embed.add_field(
            name="Языки",
            value="\n".join(f"{flag_of(code)} {name_of(code)} → {roles[code].mention}" for code in LANGUAGES),
            inline=False
        )
        embed.add_field(name="Канал выбора", value=language_channel.mention, inline=True)
        if rules_channel:
            embed.add_field(name="Правила", value=rules_channel.mention, inline=True)
        embed.set_footer(text=config.brand)
        await interaction.edit_original_response(embed=embed)

    async def publish(self, channel, embed, view, key):
        stored = storage.panel_message(f"{channel.id}:{key}")
        if stored:
            try:
                message = await channel.fetch_message(stored)
                await message.edit(embed=embed, view=view)
                return message
            except (disnake.NotFound, disnake.Forbidden):
                pass
        message = await channel.send(embed=embed, view=view)
        await storage.set_panel_message(f"{channel.id}:{key}", message.id)
        try:
            await message.pin(reason="CS2 TacMap setup")
        except (disnake.Forbidden, disnake.HTTPException):
            pass
        return message

    @commands.slash_command(name="setupinfo", description="Что создаст /setup / What /setup creates")
    @commands.has_permissions(manage_guild=True)
    async def setupinfo(self, interaction: disnake.ApplicationCommandInteraction):
        embed = disnake.Embed(title="Что делает /setup", colour=config.accent)
        embed.add_field(
            name="Роли",
            value="\n".join(f"{ROLE_STYLE[code]['name']}" for code in LANGUAGES),
            inline=False
        )
        embed.add_field(
            name=INFO_CATEGORY,
            value=f"#{LANGUAGE_CHANNEL} — панель выбора языка\n#{RULES_CHANNEL} — правила сервера",
            inline=False
        )
        for code in LANGUAGES:
            embed.add_field(
                name=CATEGORY_NAMES[code],
                value=", ".join(name for name, _, _ in CHANNELS[code]),
                inline=False
            )
        embed.set_footer(text="Команда идемпотентна: существующие роли и каналы переиспользуются")
        await interaction.response.send_message(embed=embed, ephemeral=True)


def setup(bot):
    bot.add_cog(Setup(bot))
