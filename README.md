# MOSCOW III

Меню в стиле GTA 3 — современная Москва. Интерактивная карта Покровского (Истринский р-н) на спутниковых тайлах.

## Локально
```
python3 -m http.server 8090
```
Открыть http://localhost:8090

## Деплой на Render
1. New → Static Site
2. Connect this repository
3. Build Command: (оставить пустым)
4. Publish directory: `.`
5. Create Static Site

## Технологии
- HTML/CSS/JS, без сборки
- Leaflet 1.9.4 (CDN) + Esri World Imagery
- Web Audio API для звуков меню
- Bebas Neue / Oswald (Google Fonts)
