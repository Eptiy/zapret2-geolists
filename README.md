# Списки для zapret2

GitHub Actions обновляет списки ежедневно в 01:23 UTC. Ручной запуск доступен в **Actions → Generate zapret2 lists → Run workflow**. При ошибке скачивания или проверки в репозитории остаётся предыдущая версия списков.

| Файл | Назначение |
| --- | --- |
| [cloudflare.list](lists/cloudflare.list) | Домены Cloudflare для общего профиля |
| [github.list](lists/github.list) | Домены GitHub для общего профиля |
| [youtube.list](lists/youtube.list) | Домены для профиля YouTube |
| [ru-available-only-inside.list](lists/ru-available-only-inside.list) | Домены для `--hostlist-exclude` общего профиля |
| [cloudflare-ip.list](lists/cloudflare-ip.list) | Подсети Cloudflare для отдельного IP-списка |
| [ru-ip.list](lists/ru-ip.list) | Подсети категории `ru` из [GeoIP RunetFreedom](https://github.com/runetfreedom/russia-blocked-geoip/blob/release/text/ru.txt) |
| [aws.list](lists/aws.list) | Домены AWS, включая категорию `aws-cn` |
| [cloudfront-ip.list](lists/cloudfront-ip.list) | Подсети CloudFront из [GeoIP RunetFreedom](https://github.com/runetfreedom/russia-blocked-geoip/blob/release/text/cloudfront.txt) |

Для подписки открой файл и скопируй адрес кнопки **Raw**.

Доменные списки собираются из [GeoSite RunetFreedom](https://github.com/runetfreedom/russia-v2ray-rules-dat). Префикс `^` сохраняет точное совпадение. Правила по ключевым словам и регулярным выражениям журналируются и пропускаются. Если такие правила появятся в списке исключений, сборка завершится ошибкой, чтобы сохранить предыдущую версию исключений. Подсети берутся из [GeoIP RunetFreedom](https://github.com/runetfreedom/russia-blocked-geoip/blob/release/text/cloudflare.txt).
