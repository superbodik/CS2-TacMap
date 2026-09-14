# Радары карт

Изображения радаров в PNG, имя файла = id карты из `assets/js/data/maps.js`.

| Карта | Файл | Второй этаж |
|---|---|---|
| Mirage | `de_mirage.png` | — |
| Inferno | `de_inferno.png` | — |
| Dust II | `de_dust2.png` | — |
| Nuke | `de_nuke.png` (Upper) | `de_nuke_lower.png` |
| Vertigo | `de_vertigo.png` (Upper) | `de_vertigo_lower.png` |
| Ancient | `de_ancient.png` | — |
| Overpass | `de_overpass.png` | — |
| Train | `de_train.png` | — |
| Cache | `de_cache.png` | — |

Также подхватываются имена `de_mirage_radar.png` и `de_mirage_radar_psd.png`.
Если файла нет — рисуется схема-заглушка с маркерами сайтов и спавнов.

Текущие файлы сконвертированы из пака [Simple Radar](https://readtldr.gg/simpleradar)
(`.dds` → PNG 1024×1024). Чтобы добавить карту: положить PNG сюда и добавить запись в
`assets/js/data/maps.js` (масштаб, спавны, сайты).
