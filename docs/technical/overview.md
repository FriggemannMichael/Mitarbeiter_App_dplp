# 📱 WPDL MitarbeiterPro

**Progressive Web App für digitale Stundenzettel, Urlaubsanträge und Krankmeldungen**

[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.3-blue.svg)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-7.2-purple.svg)](https://vitejs.dev/)
[![Material-UI](https://img.shields.io/badge/MUI-7-blue.svg)](https://mui.com/)
[![Code Quality](https://img.shields.io/badge/Code%20Quality-7.8%2F10-green.svg)](../refactoring/analyse.md)

## 🎯 Projektübersicht

Eine moderne, DSGVO-konforme Progressive Web App für die digitale Zeiterfassung und Dokumentenverwaltung. Die App funktioniert vollständig offline und speichert alle Daten lokal auf dem Gerät des Mitarbeiters.

### Hauptfunktionen

- ⏱️ **Digitale Stundenzettel** mit Wochen- und Monatsansicht
- 🏖️ **Urlaubsanträge** mit Unterschriftenfunktion
- 🏥 **Krankmeldungen** inkl. AU-Bescheinigung
- 💰 **Abschlagszahlungen** verwalten
- 📄 **PDF-Export** mit QR-Code-Verifizierung
- 📧 **Email & WhatsApp** Integration
- 🔐 **Admin-Dashboard** für Konfiguration
- 🌍 **Mehrsprachig** (DE/EN/FR/ES/IT/TR)
- 📴 **Offline-First** mit automatischer Synchronisation
- 🎨 **Anpassbares Design** (Logo, Farben, Texte)

---

## 🏗️ Technologie-Stack

### Frontend
- **React 18.3** - UI Framework
- **TypeScript 5.6** - Type-Safety (Strict Mode)
- **Vite 7.2** - Build Tool & Dev Server
- **Material-UI v7** - Component Library
- **Tailwind CSS** - Utility-First Styling

### State Management
- **React Context API** - Globaler State
- **Custom Hooks** - Wiederverwendbare Logik
- **BroadcastChannel API** - Tab-Synchronisation

### Offline & PWA
- **Workbox** - Service Worker & Caching
- **LocalStorage** - Persistente Datenspeicherung
- **IndexedDB** - (geplant für große Datensätze)

### Dokumenten-Verarbeitung
- **pdf-lib** - PDF-Generierung
- **signature_pad** - Digitale Unterschriften
- **qrcode.react** - QR-Code-Generation

### Testing
- **Vitest** - Unit & Integration Tests
- **React Testing Library** - Component Tests
- **Happy-DOM** - DOM-Simulation

### Code-Qualität
- **TypeScript Strict Mode** - Maximale Type-Safety
- **ESLint** - Code Linting (konfiguriert)
- **Knip** - Dead Code Detection

---

## 📦 Installation

### Voraussetzungen
- **Node.js** >= 18.0.0
- **npm** >= 9.0.0

### Setup

```bash
# Repository klonen
git clone <repository-url>
cd mitarbeiterapppro

# Dependencies installieren
npm install

# Development Server starten
npm run dev

# Production Build
npm run build

# Build Preview
npm run preview

# Tests ausführen
npm test

# TypeScript Check
npx tsc --noEmit

# Dead Code Analysis
npx knip
```

---

## 🗂️ Projektstruktur

```
src/
├── components/         # UI-Komponenten
│   ├── admin/         # Admin-Dashboard Komponenten
│   ├── DayCardHybrid.tsx
│   ├── ErrorBoundary.tsx
│   └── ...
├── contexts/          # React Contexts (State Management)
│   ├── ConfigContext.tsx
│   ├── WeekDataContext.tsx
│   ├── TimeCalculationContext.tsx
│   ├── SignatureWorkflowContext.tsx
│   ├── ShiftConfigContext.tsx
│   └── TimesheetActionsContext.tsx
├── hooks/             # Custom React Hooks
│   ├── useAutoLogout.ts
│   ├── useMonthEndReminder.ts
│   └── usePerformanceMonitoring.ts
├── pages/             # Seiten/Routes
│   ├── Welcome.tsx
│   ├── MainApp.tsx
│   ├── TimesheetHybrid.tsx
│   ├── VacationRequestHybrid.tsx
│   └── AdminDashboard.tsx
├── services/          # Business Logic & API
│   ├── apiService.ts
│   ├── authService.ts
│   ├── configService.ts
│   ├── logger.ts      # Logging Service
│   └── config/
│       └── ConfigManager.ts
├── utils/             # Hilfsfunktionen
│   ├── storage.ts
│   ├── pdfExporter.ts
│   ├── vacationPdfExporter.ts
│   └── performance.ts
├── types/             # TypeScript Type Definitions
│   ├── config.types.ts
│   └── weekdata.types.ts
├── core/              # Core Business Logic
│   ├── time/
│   │   └── TimeCalculationService.ts
│   └── validation/
│       └── WorkTimeValidator.ts
├── config/            # App-Konfiguration
│   └── appConfig.ts
└── test/              # Test-Dateien
    ├── helpers/
    └── integration.test.tsx
```

---

## 🚀 Features im Detail

### 1. Context-basierte Architektur

Die App nutzt eine saubere Context-Separation:

- **ConfigContext** - Globale App-Konfiguration
- **WeekDataContext** - Stundenzettel-Daten (650 Zeilen, optimiert)
- **TimeCalculationContext** - Zeitberechnungen
- **SignatureWorkflowContext** - Unterschriften-Workflow
- **ShiftConfigContext** - Schichtkonfiguration
- **TimesheetActionsContext** - Component Communication

### 2. Logger-Service

Strukturiertes Logging mit Umgebungs-Awareness:

```typescript
import { logger } from './services/logger';

// Debug (nur Development)
logger.debug('User action', { component: 'MyComponent', data: { userId: 123 } });

// Error (mit Context)
logger.error('API call failed', error, { component: 'ApiService' });

// Performance-Messung
const endTimer = logger.startTimer('PDF Generation');
// ... Code
endTimer(); // Logs: "PDF Generation completed in 234.56ms"
```

### 3. Offline-First Strategie

- **Service Worker** cached alle Assets
- **LocalStorage** für Stundenzettel & Konfiguration
- **BroadcastChannel** für Tab-Synchronisation
- **Automatic Retry** bei API-Fehlern

### 4. PDF-Export mit QR-Code

- **Personalisierte PDFs** mit Firmenlogo
- **QR-Code** für Dokumenten-Verifizierung
- **Digitale Unterschriften** eingebettet
- **DSGVO-konform** (keine Server-Speicherung)

### 5. Admin-Dashboard

Zentrale Konfiguration über `/admin`:

- **Company Settings** (Name, Adresse, Logo, Farben)
- **PDF Configuration** (Header, Footer, Texte)
- **Technical Settings** (API-Endpoint, Feature-Flags)
- **Work Settings** (Arbeitszeitregeln, Auto-Logout)

---

## 🔧 Konfiguration

### Environment Variables

Erstelle eine `.env` Datei im Root:

```env
# API Endpoint
VITE_API_ENDPOINT=https://your-domain.com/api

# Deployment Path
VITE_DEPLOYMENT_PATH=/pro/

# Feature Flags
VITE_ENABLE_EMAIL=true
VITE_ENABLE_WHATSAPP=true
```

### Admin-Zugang

Standard-Passwort: `admin123` (bitte ändern!)

Zugriff: `http://localhost:5173/admin`

---

## 📊 Code-Qualität: 7.8/10

### Stärken ✅
- Strict TypeScript Mode aktiviert
- Moderne React-Patterns (Hooks, Memo, Callbacks)
- Saubere Context-Separation (46% Code-Reduktion)
- Umfassende Type-Definitions
- Testing-Setup vorhanden

### Verbesserungspotenzial ⚠️
- 52 `any`-Types eliminieren (in Arbeit)
- Weitere console.logs durch Logger ersetzen
- Dead Code entfernen (50+ unused exports)
- E2E-Tests implementieren

**Detaillierte Analyse:** [analyse.md](../refactoring/analyse.md)

---

## 🧪 Testing

```bash
# Unit Tests
npm test

# Coverage Report
npm run test:coverage

# Watch Mode
npm run test:watch

# Integration Tests
npm run test:integration
```

### Test-Coverage
- **Unit Tests**: Core-Logik & Utils
- **Component Tests**: React Components
- **Integration Tests**: Context & Hooks
- **E2E Tests**: (geplant - Playwright)

---

## 📝 Changelog

### 2025-12-17 - Critical Bugfixes ✅

**Fixed:**
- ✅ Unresolved Import in `configTestHelpers.ts` behoben
- ✅ Logger-Service implementiert (Production-Ready)
- ✅ console.logs in kritischen Komponenten ersetzt
- ✅ Window-Object Pollution entfernt (TimesheetActionsContext)

**Added:**
- ✅ Neuer `Logger` Service mit Environment-Awareness
- ✅ Strukturiertes Logging mit Component-Context
- ✅ Performance-Timer für Profiling

**Improved:**
- ✅ Code-Qualität von 7.5 auf 7.8/10 verbessert
- ✅ Type-Safety in Test-Helpers erhöht
- ✅ Memory-Leak-Prävention durch Context-Pattern

---

## 🤝 Beiträge

### Commit-Konventionen

```bash
# Feature
feat: Add signature workflow context

# Bugfix
fix: Resolve TypeScript errors in configService

# Refactoring
refactor: Extract welcome form logic to custom hook

# Dokumentation
docs: Update README with logger service

# Tests
test: Add unit tests for TimeCalculationService
```

### Branching-Strategie

- `main` - Production-Ready Code
- `develop` - Development Branch
- `feature/*` - Feature-Branches
- `bugfix/*` - Bugfix-Branches
- `refactoring/*` - Refactoring-Branches

---

## 📄 Lizenz

**Proprietary** - Westfalia Personaldienstleistungen GmbH

Copyright © 2025 WPDL. Alle Rechte vorbehalten.

---

## 📞 Support

**Entwickler-Team:**
- Senior React & TypeScript Entwickler
- Code-Qualität: ⭐⭐⭐⭐⭐⭐⭐⭐☆☆ (7.8/10)

**Kontakt:**
- Email: info@wpdl.de
- Telefon: +49 2561 9792590
- Website: https://wpdl.de

---

## 🔜 Roadmap

### Q1 2025
- [ ] Alle `any`-Types eliminieren
- [ ] E2E-Tests mit Playwright
- [ ] Bundle-Size Optimierung
- [ ] Performance-Audit

### Q2 2025
- [ ] IndexedDB für große Datensätze
- [ ] Push-Notifications für Erinnerungen
- [ ] Biometric Authentication
- [ ] Dark Mode

### Q3 2025
- [ ] Backend-Integration (PocketBase)
- [ ] Team-Collaboration Features
- [ ] Advanced Analytics Dashboard
- [ ] Export zu Excel/CSV

---

**Made with ❤️ using React, TypeScript & Vite**
