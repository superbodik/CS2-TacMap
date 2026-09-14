import disnake
from disnake.ext import commands

from config import config
from i18n import from_discord_locale
from projects import MAX_PROJECTS, find, list_for, role_name, save_for
from storage import storage
from ui.projects import ProjectsView, projects_embed


class Projects(commands.Cog):
    def __init__(self, bot):
        self.bot = bot

    def lang_for(self, interaction):
        return storage.language_of(interaction.author.id, from_discord_locale(interaction.locale))

    async def ensure_roles(self, guild, items, log=None):
        updated = []
        for item in items:
            role = None
            if item.get("role_id"):
                role = guild.get_role(int(item["role_id"]))
            if role is None:
                role = disnake.utils.get(guild.roles, name=role_name(item))
            if role is None:
                role = await guild.create_role(
                    name=role_name(item),
                    colour=disnake.Colour(item["colour"]),
                    mentionable=True,
                    reason="CS2 TacMap project roles"
                )
                if log is not None:
                    log.append(f"➕ роль {role.name}")
            elif log is not None:
                log.append(f"✓ роль {role.name}")
            item["role_id"] = role.id
            updated.append(item)
        await save_for(guild.id, updated)
        return updated

    @commands.slash_command(name="projects", description="Подписаться на проекты / Subscribe to projects")
    async def projects(self, interaction: disnake.ApplicationCommandInteraction):
        if interaction.guild is None:
            await interaction.response.send_message("Команда работает только на сервере.", ephemeral=True)
            return
        items = list_for(interaction.guild.id)
        await interaction.response.send_message(
            embed=projects_embed(items, self.lang_for(interaction)),
            view=ProjectsView(items),
            ephemeral=True
        )

    @commands.slash_command(name="postprojects", description="Опубликовать панель проектов / Post the project panel")
    @commands.has_permissions(manage_guild=True)
    async def postprojects(
        self,
        interaction: disnake.ApplicationCommandInteraction,
        channel: disnake.TextChannel = commands.Param(default=None, description="Канал для панели"),
        pin: bool = commands.Param(default=True, description="Закрепить сообщение")
    ):
        target = channel or interaction.channel
        await interaction.response.defer(ephemeral=True)

        items = await self.ensure_roles(interaction.guild, list_for(interaction.guild.id))
        message = await target.send(embed=projects_embed(items), view=ProjectsView(items))
        await storage.set_panel_message(f"{target.id}:projects", message.id)
        if pin:
            try:
                await message.pin(reason="CS2 TacMap projects panel")
            except (disnake.Forbidden, disnake.HTTPException):
                pass
        await interaction.edit_original_response(content=f"Панель проектов опубликована: {message.jump_url}")

    @commands.slash_command(name="projectadd", description="Добавить проект в список подписок / Add a project")
    @commands.has_permissions(manage_guild=True)
    async def projectadd(
        self,
        interaction: disnake.ApplicationCommandInteraction,
        key: str = commands.Param(description="Короткий ключ, например cs2-tacmap"),
        name: str = commands.Param(description="Название проекта"),
        emoji: str = commands.Param(default="📌", description="Эмодзи"),
        description: str = commands.Param(default="", description="Короткое описание"),
        url: str = commands.Param(default="", description="Ссылка на проект"),
        colour: str = commands.Param(default="5B8DEF", description="Цвет роли в HEX")
    ):
        await interaction.response.defer(ephemeral=True)
        items = list_for(interaction.guild.id)

        if len(items) >= MAX_PROJECTS:
            await interaction.edit_original_response(content=f"Достигнут лимит {MAX_PROJECTS} проектов.")
            return
        if find(items, key):
            await interaction.edit_original_response(content=f"Проект `{key}` уже есть.")
            return

        try:
            colour_value = int(colour.lstrip("#"), 16)
        except ValueError:
            colour_value = 0x5B8DEF

        items.append({
            "key": key,
            "name": name,
            "emoji": emoji,
            "colour": colour_value,
            "description": description,
            "url": url
        })
        items = await self.ensure_roles(interaction.guild, items)
        await interaction.edit_original_response(
            content=f"Проект **{name}** добавлен. Обновите панель командой /postprojects."
        )

    @commands.slash_command(name="projectremove", description="Убрать проект из списка / Remove a project")
    @commands.has_permissions(manage_guild=True)
    async def projectremove(
        self,
        interaction: disnake.ApplicationCommandInteraction,
        key: str = commands.Param(description="Ключ проекта"),
        delete_role: bool = commands.Param(default=False, description="Удалить роль с сервера")
    ):
        await interaction.response.defer(ephemeral=True)
        items = list_for(interaction.guild.id)
        target = find(items, key)
        if target is None:
            await interaction.edit_original_response(content=f"Проект `{key}` не найден.")
            return

        if delete_role and target.get("role_id"):
            role = interaction.guild.get_role(int(target["role_id"]))
            if role:
                try:
                    await role.delete(reason="CS2 TacMap project removed")
                except (disnake.Forbidden, disnake.HTTPException):
                    pass

        await save_for(interaction.guild.id, [item for item in items if item["key"] != key])
        await interaction.edit_original_response(content=f"Проект **{target['name']}** убран из списка.")

    @commands.slash_command(name="projectlist", description="Список проектов и ролей / Project list")
    @commands.has_permissions(manage_guild=True)
    async def projectlist(self, interaction: disnake.ApplicationCommandInteraction):
        items = list_for(interaction.guild.id)
        lines = []
        for item in items:
            role = interaction.guild.get_role(int(item["role_id"])) if item.get("role_id") else None
            lines.append(f"`{item['key']}` · {item['emoji']} {item['name']} → {role.mention if role else 'роль не создана'}")
        embed = disnake.Embed(
            title="Проекты сервера",
            description="\n".join(lines) or "Список пуст",
            colour=config.accent
        )
        embed.set_footer(text=config.brand)
        await interaction.response.send_message(embed=embed, ephemeral=True)


def setup(bot):
    bot.add_cog(Projects(bot))
