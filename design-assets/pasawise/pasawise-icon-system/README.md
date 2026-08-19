# PasaWise App Icon and Favicon System

This package is derived from the approved PasaWise identity: the **PW monogram**, **open book**, and **gold passing/upward arrow**.

## Recommended files

- `pasawise-app-icon-1024x1024.png` — master app-store icon
- `apple-touch-icon.png` — iPhone/iPad home-screen icon
- `pwa-icon-192x192.png` and `pwa-icon-512x512.png` — standard PWA icons
- `pwa-maskable-192x192.png` and `pwa-maskable-512x512.png` — Android/PWA maskable icons
- `favicon.svg` — preferred modern-browser favicon
- `favicon.ico` — legacy browser fallback
- `favicon-16x16.png`, `favicon-32x32.png`, `favicon-48x48.png` — explicit PNG fallbacks
- `safari-pinned-tab.svg` — monochrome Safari pinned-tab mark
- `android-adaptive-foreground-432x432.png` and `android-adaptive-background-432x432.png` — future native Android adaptive-icon layers

## Website integration

Place the files in your public icons folder, then add these tags inside `<head>`:

```html
<link rel="icon" href="/icons/favicon.svg" type="image/svg+xml" />
<link rel="icon" href="/icons/favicon.ico" sizes="any" />
<link rel="icon" href="/icons/favicon-32x32.png" type="image/png" sizes="32x32" />
<link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" sizes="180x180" />
<link rel="mask-icon" href="/icons/safari-pinned-tab.svg" color="#0B2F63" />
<link rel="manifest" href="/icons/site.webmanifest" />
<meta name="theme-color" content="#0B2F63" />
```

## Visual rules

- Keep the complete app icon unchanged; do not add text inside it.
- Use the simplified book/check favicon at very small sizes.
- Maintain the official colors: Navy `#0B2F63`, Blue `#1A73D9`, Gold `#F4B41A`, Light Blue `#DCEBFF`.
- Keep at least 12.5% clear space around the app-icon symbol; the maskable version already includes extra safe-area padding.
