import disnake

from config import config
from i18n import t
from projects import DEFAULT_PROJECTS, list_for, normalize, role_name

SELECT_ID = "tacmap:projects:v1"


def projects_embed(items, lang="ru"):
    embed = disnake.Embed(
        title=t(lang, "projects.title"),
        description=t(lang, "projects.description"),
        colour=config.accent
    )
    for item in items:
        link = f"\n[{t(lang, 'projects.open')}]({item['url']})" if item["url"] else ""
        embed.add_field(
            name=f"{item['emoji']} {item['name']}",
            value=f"{item['description'] or '—'}{link}",
            inline=True
        )
    embed.set_footer(text=t(lang, "projects.footer"))
    return embed


def options_for(items):
    options = []
    for item in items:
        options.append(disnake.SelectOption(
            label=item["name"][:100],
            value=item["key"],
            emoji=item["emoji"] or None,
            description=(item["description"] or None)
        ))
    return options or [disnake.SelectOption(label="—", value="none")]


class ProjectSelect(disnake.ui.StringSelect):
    def __init__(self, items=None):
        entries = items if items else [normalize(entry) for entry in DEFAULT_PROJECTS]
        options = options_for(entries)
        super().__init__(
            custom_id=SELECT_ID,
            placeholder=t("ru", "projects.placeholder"),
            min_values=0,
            max_values=len(options),
            options=options
        )

    async def callback(self, interaction: disnake.MessageInteraction):
        if interaction.guild is None:
            await interaction.response.send_message("Только на сервере.", ephemeral=True)
            return

        lang = "ru"
        items = list_for(interaction.guild.id)
        chosen = set(self.values)
        added, removed, missing = [], [], []

        for item in items:
            role = None
            if item.get("role_id"):
                role = interaction.guild.get_role(int(item["role_id"]))
            if role is None:
                role = disnake.utils.get(interaction.guild.roles, name=role_name(item))
            if role is None:
                if item["key"] in chosen:
                    missing.append(item["name"])
                continue

            try:
                if item["key"] in chosen and role not in interaction.author.roles:
                    await interaction.author.add_roles(role, reason="CS2 TacMap project subscription")
                    added.append(role.mention)
                elif item["key"] not in chosen and role in interaction.author.roles:
                    await interaction.author.remove_roles(role, reason="CS2 TacMap project subscription")
                    removed.append(role.mention)
            except (disnake.Forbidden, disnake.HTTPException):
                missing.append(item["name"])

        lines = []
        if added:
            lines.append(t(lang, "projects.added", roles=", ".join(added)))
        if removed:
            lines.append(t(lang, "projects.removed", roles=", ".join(removed)))
        if missing:
            lines.append(t(lang, "projects.missing", names=", ".join(missing)))
        if not lines:
            lines.append(t(lang, "projects.nochange"))

        embed = disnake.Embed(description="\n".join(lines), colour=config.accent_ok)
        embed.set_footer(text=config.brand)
        await interaction.response.send_message(embed=embed, ephemeral=True)


class ProjectsView(disnake.ui.View):
    def __init__(self, items=None):
        super().__init__(timeout=None)
        self.add_item(ProjectSelect(items))
