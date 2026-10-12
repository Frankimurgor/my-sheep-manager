# My Sheep Manager

**Offline-first sheep farm management.** No accounts. No cloud. No tracking.

A [Lumo Labs](https://github.com/Frankimurgor) app.

---

## What it does

- **Flock registry** — every sheep tracked with tag, breed, sex, DOB, photo, and pedigree
- **Health records** — vaccines, deworming, treatments, vet visits, shearing, hoof trims, with automatic withdrawal-period tracking
- **Weight tracking** — log weights over time, see growth curves, respects kg/lb
- **Breeding records** — mating dates, scan results, auto-computed lambing dates (147-day gestation)
- **Lambing records** — per-lamb sex, weight, survival, and welfare scores. Tag lambs and they join the flock instantly
- **Farm finances** — income (lamb sales, wool, milk) and expenses (feed, medicine, labour) with pie chart breakdown
- **Tasks & reminders** — recurring schedules for vaccinations and dosing
- **CSV export** — share all records as a spreadsheet
- **PIN lock** — SHA-256 hashed, never stored in plaintext
- **Dark mode** — system / light / dark
- **100% offline** — everything lives in AsyncStorage on your device

---

## Tech stack

- React Native + **Expo SDK 57**
- **Expo Router** (file-based routing with tabs + modal presentations)
- **TypeScript** throughout
- **AsyncStorage** for offline persistence
- **Context + Provider** pattern for state (`src/context/SheepContext.tsx`)
- **@expo-google-fonts** — Playfair Display (headings) + Inter (body)
- **react-native-svg** for the donut chart
- **expo-crypto** for PIN hashing
- **expo-file-system** + **expo-sharing** for CSV export
- **expo-image-picker** for sheep photos
- **EAS Build** for CI/CD

---

## Brand

| Token | Value |
|---|---|
| Forest green (primary) | `#2E5D3A` |
| Green dark | `#1F3D28` |
| Cream (background) | `#F5EFE0` |
| Gold accent | `#B8860B` |
| Wool | `#C4B998` |
| Healthy | `#2E7D32` |
| Warning | `#EF6C00` |
| Danger | `#C62828` |

Fonts: Playfair Display (serif, headings) · Inter (sans, body)

---

## Project structure
