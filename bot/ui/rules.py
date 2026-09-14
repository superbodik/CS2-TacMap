import disnake

from config import config
from i18n import LANGUAGES, flag_of, name_of, t

RULES_SELECT_ID = "tacmap:rules:v1"

RULE_KEYS = ("respect", "spam", "nsfw", "ads", "language", "privacy", "identity", "moderation", "discord")


def rules_embed(lang):
    embed = disnake.Embed(
        title=t(lang, "rules.title"),
        description=t(lang, "rules.intro"),
        colour=config.accent
    )
    for index, key in enumerate(RULE_KEYS, start=1):
        embed.add_field(
            name=f"{index}. {t(lang, f'rules.{key}.title')}",
            value=t(lang, f"rules.{key}.text"),
            inline=False
        )
    embed.add_field(name=t(lang, "rules.docs"), value=t(lang, "rules.docs.value", terms=config.terms_url, privacy=config.privacy_url), inline=False)
    embed.set_footer(text=t(lang, "rules.footer"))
    return embed


def rules_view(lang="ru"):
    view = disnake.ui.View(timeout=None)
    view.add_item(disnake.ui.Button(label=t(lang, "rules.button.terms"), url=config.terms_url, style=disnake.ButtonStyle.link, emoji="📜"))
    view.add_item(disnake.ui.Button(label=t(lang, "rules.button.privacy"), url=config.privacy_url, style=disnake.ButtonStyle.link, emoji="🔒"))
    view.add_item(disnake.ui.Button(label="CS2 TacMap", url=config.site_url, style=disnake.ButtonStyle.link, emoji="🗺️"))
    view.add_item(RulesLanguageSelect())
    return view


class RulesLanguageSelect(disnake.ui.StringSelect):
    def __init__(self):
        super().__init__(
            custom_id=RULES_SELECT_ID,
            placeholder=t("ru", "rules.placeholder"),
            min_values=1,
            max_values=1,
            options=[
                disnake.SelectOption(label=name_of(code), value=code, emoji=flag_of(code), description=t(code, "rules.title"))
                for code in LANGUAGES
            ]
        )

    async def callback(self, interaction: disnake.MessageInteraction):
        lang = self.values[0]
        await interaction.response.send_message(embed=rules_embed(lang), ephemeral=True)


class RulesView(disnake.ui.View):
    def __init__(self):
        super().__init__(timeout=None)
        for item in rules_view().children:
            self.add_item(item)
