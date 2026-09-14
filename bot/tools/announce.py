import argparse
import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import disnake

from config import config

NEWS_CHANNELS = {
    "ru": ("новости", "news-ru", "announcements-ru"),
    "uk": ("новини", "news-uk", "announcements-uk"),
    "en": ("news", "news-en", "announcements-en")
}

RELEASES = {
    "cs2boost": {
        "url": "https://github.com/superbodik/CS2-Boost",
        "colour": 0x5B8DEF,
        "ru": {
            "title": "CS2-Boost — большое обновление",
            "text": (
                "Тулкит для Windows 10/11, который режет задержку и поднимает FPS в Counter-Strike 2. "
                "Каждое изменение пишется в точку отката, откат — одной командой."
            ),
            "fields": [
                ("Автоконфиг под твоё железо", "Читает CPU, видеокарту и её класс, ОЗУ, разрешение и герцовку — и сам собирает `autoexec.cfg`, правит настройки видео CS2 и прописывает параметры запуска прямо в Steam."),
                ("Видеокарта на своё ядро", "Прерывания GPU и сетевой карты уезжают на свободные ядра, а CS2 получает оставшиеся — меньше микрофризов и ровнее frametime."),
                ("Память", "Компрессия памяти и предзапуск приложений выключаются на 16 ГБ+, pagefile фиксируется, standby-список чистится одной командой перед матчем."),
                ("Сеть и таймеры", "Interrupt moderation off, буферы вверх, RSS on, таймер ядра держится на 0.5 мс.")
            ],
            "footer": "Скачать: сборка в один .exe командой build.ps1"
        },
        "uk": {
            "title": "CS2-Boost — велике оновлення",
            "text": (
                "Тулкіт для Windows 10/11, який ріже затримку та піднімає FPS у Counter-Strike 2. "
                "Кожна зміна пишеться в точку відкату, відкат — однією командою."
            ),
            "fields": [
                ("Автоконфіг під твоє залізо", "Читає CPU, відеокарту та її клас, ОЗП, роздільність і герцовку — і сам збирає `autoexec.cfg`, править налаштування відео CS2 та прописує параметри запуску просто в Steam."),
                ("Відеокарта на своє ядро", "Переривання GPU і мережевої карти їдуть на вільні ядра, а CS2 отримує решту — менше мікрофризів і рівніший frametime."),
                ("Памʼять", "Компресія памʼяті та передзапуск застосунків вимикаються на 16 ГБ+, pagefile фіксується, standby-список чиститься однією командою перед матчем."),
                ("Мережа й таймери", "Interrupt moderation off, буфери вгору, RSS on, таймер ядра тримається на 0.5 мс.")
            ],
            "footer": "Збірка в один .exe командою build.ps1"
        },
        "en": {
            "title": "CS2-Boost — major update",
            "text": (
                "A Windows 10/11 toolkit that cuts latency and lifts FPS in Counter-Strike 2. "
                "Every change is written to a restore point, and one command undoes all of it."
            ),
            "fields": [
                ("Auto config for your hardware", "Reads your CPU, GPU tier, RAM, resolution and refresh rate, then writes `autoexec.cfg`, tunes the CS2 video settings and pushes launch options straight into Steam."),
                ("GPU on its own core", "GPU and NIC interrupts move to free cores while CS2 keeps the rest — fewer micro stutters, steadier frametime."),
                ("Memory", "Memory compression and app pre-launch go off on 16 GB+ machines, the pagefile is pinned, and the standby list clears with one command before a match."),
                ("Network and timers", "Interrupt moderation off, bigger buffers, RSS on, kernel timer held at 0.5 ms.")
            ],
            "footer": "Build it into a single .exe with build.ps1"
        }
    },
    "tacmap": {
        "url": "https://superbodik.github.io/CS2-TacMap/",
        "colour": 0x4CB782,
        "ru": {
            "title": "CS2 TacMap — тактическая карта",
            "text": "Рисуйте страты прямо в браузере: маршруты, раскидки, тайминги и таймлайн раунда.",
            "fields": [
                ("Что умеет", "9 карт на радарах Simple Radar, этажи Nuke и Vertigo, drag-and-drop иконок, кривые траектории гранат, рулетка с таймингами."),
                ("Шаринг", "Страта упаковывается в ссылку — открыл и увидел. Вход через Discord сохраняет библиотеку страт с историей версий.")
            ],
            "footer": "Работает в браузере, ничего ставить не нужно"
        },
        "uk": {
            "title": "CS2 TacMap — тактична карта",
            "text": "Малюйте страти просто у браузері: маршрути, розкидки, тайминги та таймлайн раунду.",
            "fields": [
                ("Що вміє", "9 карт на радарах Simple Radar, поверхи Nuke і Vertigo, drag-and-drop іконок, криві траєкторії гранат, рулетка з таймингами."),
                ("Шеринг", "Страта пакується в посилання — відкрив і побачив. Вхід через Discord зберігає бібліотеку страт з історією версій.")
            ],
            "footer": "Працює у браузері, нічого встановлювати не треба"
        },
        "en": {
            "title": "CS2 TacMap — tactical board",
            "text": "Draw strats right in the browser: routes, nade lineups, timings and a round timeline.",
            "fields": [
                ("What it does", "9 maps on Simple Radar radars, Nuke and Vertigo floors, drag-and-drop icons, curved nade trajectories, a ruler with timings."),
                ("Sharing", "A strat packs into a link — open it and you see it. Signing in with Discord keeps your strat library with revision history.")
            ],
            "footer": "Runs in the browser, nothing to install"
        }
    }
}


def build_embed(release, lang):
    data = release[lang]
    embed = disnake.Embed(
        title=data["title"],
        description=data["text"],
        colour=release["colour"],
        url=release["url"]
    )
    for name, value in data["fields"]:
        embed.add_field(name=name, value=value, inline=False)
    embed.add_field(name="Ссылка · Посилання · Link", value=release["url"], inline=False)
    embed.set_footer(text=f"{data['footer']} · mineDres-Team")
    return embed


def pick_channel(guild, lang):
    names = NEWS_CHANNELS[lang]
    for channel in guild.text_channels:
        if channel.name.lower() in names and channel.permissions_for(guild.me).send_messages:
            return channel
    for channel in guild.text_channels:
        if any(channel.name.lower().startswith(n) for n in names) and channel.permissions_for(guild.me).send_messages:
            return channel
    return None


async def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--release", choices=sorted(RELEASES), default="cs2boost")
    parser.add_argument("--list", action="store_true")
    parser.add_argument("--channel", type=int, action="append", default=[])
    parser.add_argument("--lang", choices=["ru", "uk", "en"], action="append", default=[])
    parser.add_argument("--dry", action="store_true")
    args = parser.parse_args()

    intents = disnake.Intents.default()
    client = disnake.Client(intents=intents)
    done = asyncio.Event()

    @client.event
    async def on_ready():
        try:
            guild = client.get_guild(config.guild_id) or (client.guilds[0] if client.guilds else None)
            if guild is None:
                print("бот не состоит ни в одной гильдии")
                return

            print(f"гильдия: {guild.name} ({guild.id})")

            if args.list:
                for channel in guild.text_channels:
                    perms = channel.permissions_for(guild.me)
                    mark = "+" if perms.send_messages else "-"
                    category = channel.category.name if channel.category else "—"
                    print(f"  [{mark}] {channel.id}  #{channel.name}   ({category})")
                return

            languages = args.lang or ["ru", "uk", "en"]
            release = RELEASES[args.release]
            targets = []

            if args.channel:
                for index, channel_id in enumerate(args.channel):
                    lang = languages[index] if index < len(languages) else languages[-1]
                    channel = guild.get_channel(channel_id)
                    if channel:
                        targets.append((lang, channel))
            else:
                for lang in languages:
                    channel = pick_channel(guild, lang)
                    if channel:
                        targets.append((lang, channel))
                    else:
                        print(f"канал для языка {lang} не найден")

            if not targets:
                print("нечего постить: каналы не найдены, запусти /setup или укажи --channel")
                return

            for lang, channel in targets:
                embed = build_embed(release, lang)
                if args.dry:
                    print(f"[dry] {lang} -> #{channel.name}: {embed.title}")
                    continue
                message = await channel.send(embed=embed)
                print(f"опубликовано {lang} -> #{channel.name}: {message.jump_url}")
        finally:
            done.set()

    task = asyncio.create_task(client.start(config.token))
    await done.wait()
    await client.close()
    try:
        await asyncio.wait_for(task, timeout=10)
    except Exception:
        pass


if __name__ == "__main__":
    asyncio.run(main())
