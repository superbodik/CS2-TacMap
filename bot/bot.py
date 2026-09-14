import sys
from pathlib import Path

import disnake
from disnake.ext import commands

sys.path.insert(0, str(Path(__file__).resolve().parent))

from config import config
from ui.language import LanguageView

intents = disnake.Intents.default()
intents.members = config.members_intent

command_sync_flags = commands.CommandSyncFlags.default()

bot = commands.InteractionBot(
    intents=intents,
    command_sync_flags=command_sync_flags,
    test_guilds=[config.guild_id] if config.guild_id else None,
    activity=disnake.Activity(type=disnake.ActivityType.watching, name="CS2 TacMap")
)


@bot.event
async def on_ready():
    bot.add_view(LanguageView())
    print(f"[bot] вошёл как {bot.user} (id {bot.user.id})")
    print(f"[bot] серверов: {len(bot.guilds)} | API: {config.api_base}")


@bot.event
async def on_slash_command_error(interaction, error):
    if isinstance(error, commands.MissingPermissions):
        await respond(interaction, "Недостаточно прав для этой команды.")
        return
    print(f"[bot] ошибка команды: {error}")
    await respond(interaction, f"Ошибка: {str(error)[:180]}")


async def respond(interaction, message):
    embed = disnake.Embed(description=message, colour=config.accent_bad)
    try:
        if interaction.response.is_done():
            await interaction.followup.send(embed=embed, ephemeral=True)
        else:
            await interaction.response.send_message(embed=embed, ephemeral=True)
    except disnake.HTTPException:
        pass


def main():
    problems = config.validate()
    for problem in problems:
        print(f"[bot] {problem}")
    if not config.token:
        raise SystemExit(1)

    for extension in ("cogs.language", "cogs.tacmap", "cogs.announce"):
        bot.load_extension(extension)

    bot.run(config.token)


if __name__ == "__main__":
    main()
