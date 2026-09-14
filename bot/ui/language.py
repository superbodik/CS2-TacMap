import disnake

from config import config
from i18n import LANGUAGES, flag_of, name_of, t
from storage import storage

SELECT_ID = "tacmap:language:v1"


def panel_embed(lang="ru"):
    embed = disnake.Embed(
        title=t(lang, "panel.title"),
        description=t(lang, "panel.description"),
        colour=config.accent
    )
    embed.add_field(
        name=t(lang, "panel.field.site"),
        value=t(lang, "panel.field.site.value", url=config.site_url),
        inline=False
    )
    embed.add_field(
        name=t(lang, "panel.field.langs"),
        value=t(lang, "panel.field.langs.value"),
        inline=False
    )
    embed.set_footer(text=config.brand)
    return embed


def options():
    return [
        disnake.SelectOption(
            label=name_of(code),
            value=code,
            emoji=flag_of(code),
            description=t(code, "panel.title")
        )
        for code in LANGUAGES
    ]


async def apply_language(member, lang):
    target = config.role_for(lang)
    if not target:
        return None, "missing"

    guild = member.guild
    role = guild.get_role(target)
    if role is None:
        return None, "missing"

    remove = [
        guild.get_role(role_id)
        for role_id in config.language_roles()
        if role_id != target and guild.get_role(role_id) in member.roles
    ]

    try:
        if remove:
            await member.remove_roles(*[item for item in remove if item], reason="CS2 TacMap language switch")
        if role not in member.roles:
            await member.add_roles(role, reason="CS2 TacMap language switch")
    except disnake.Forbidden:
        return role, "forbidden"
    except disnake.HTTPException:
        return role, "forbidden"

    return role, "ok"


class LanguageSelect(disnake.ui.StringSelect):
    def __init__(self):
        super().__init__(
            custom_id=SELECT_ID,
            placeholder=t("ru", "panel.placeholder"),
            min_values=1,
            max_values=1,
            options=options()
        )

    async def callback(self, interaction: disnake.MessageInteraction):
        lang = self.values[0]
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

        embed = disnake.Embed(
            description="\n".join(lines),
            colour=config.accent_ok
        )
        embed.set_footer(text=config.brand)
        await interaction.response.send_message(embed=embed, ephemeral=True)


class LanguageView(disnake.ui.View):
    def __init__(self):
        super().__init__(timeout=None)
        self.add_item(LanguageSelect())
        self.add_item(disnake.ui.Button(
            label="CS2 TacMap",
            url=config.site_url,
            style=disnake.ButtonStyle.link,
            emoji="🗺️"
        ))
