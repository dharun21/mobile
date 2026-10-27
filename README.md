# ZengenAI Mobile

React Native + Expo + TypeScript app for iOS, Android, and browser preview. NativeWind 4.2.7 provides Tailwind CSS 3.4 utility classes. It lives beside `frontend/` and `backend/` and connects to the existing FastAPI service.

The mobile theme follows the ZengenAI web app: the **Great Vibes** wordmark, **DM Sans** body text, **Manrope** headings, and its dark violet palette. The fonts ship with the app and work offline. The login, home, finance, chat, assistant, profile, pricing, and admin screens share the same visual system.

Text entry and bottom sheets resize and keep the focused field visible above the keyboard. Android builds use the `resize` software keyboard layout mode; Expo Go users can run `npx expo start --clear` to reload the latest UI.

## Requirements

- Node.js 22.13 or newer
- Android Studio and Android SDK for an Android emulator, or Expo Go on a physical phone
- macOS with Xcode to build/run the iOS simulator

## Finance reminders

The app asks for notification permission and schedules local device reminders from the signed-in user's finance schedule. High priority reminders can be read aloud after opening the notification screen. The notification screen also lets users snooze an event or add it to their device calendar through the system calendar editor. Device calendar import is a user action, so changes to a bill do not silently edit events already copied into another calendar.

Remote push can also be enabled by configuring an Expo/EAS project for the app and building a development or production app with push credentials. Expo Go does not support remote push on current Android SDKs; local scheduled notifications are the fallback. The backend must be running to create in-app notifications and send remote push. If a reminder is changed on the web while the mobile app is offline, its local schedule is updated when the app reconnects. The backend sends generic push text to keep financial amounts off the lock screen.

## Run in VS Code

Open the `mobile/` folder in VS Code. In its terminal:

```powershell
npm install
npx expo install --fix
$env:EXPO_PUBLIC_API_BASE_URL="http://10.0.2.2:8000/api/v1"
npx expo start
```

Start the FastAPI backend in another VS Code terminal first. For native development:

```powershell
cd ..\backend
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Press `a` in the Expo terminal to open an Android emulator, or scan the QR code with Expo Go. For a physical phone, replace `10.0.2.2` with your computer's LAN IP. The backend command above binds to `0.0.0.0` so the phone can reach it. For a deployed service, set the URL to an HTTPS API root ending in `/api/v1`.

`10.0.2.2` is the Android emulator's host alias. If using an iOS simulator, set `EXPO_PUBLIC_API_BASE_URL` to `http://127.0.0.1:8000/api/v1`. iOS simulator and native iOS builds require macOS/Xcode.

## Run in a browser

In the backend terminal, stop the server if it is already running, then restart it with Expo's local browser origins allowed:

```powershell
cd ..\backend
$env:ZENGENAI_ALLOWED_ORIGINS="http://localhost:5173,http://127.0.0.1:5173,http://localhost:8081,http://127.0.0.1:8081"
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

In a separate terminal opened in `mobile/`:

```powershell
$env:EXPO_PUBLIC_API_BASE_URL="http://127.0.0.1:8000/api/v1"
npm run web
```

Expo opens the app at `http://localhost:8081`. If it selects another port, add that port's `http://localhost:<port>` and `http://127.0.0.1:<port>` origins to `ZENGENAI_ALLOWED_ORIGINS`, then restart the backend. Browser preview stores the sign-in session in browser storage; iOS and Android continue to use device secure storage.

## VS Code setup

Install the Expo Tools extension if desired, then choose **TypeScript React Native** language mode for `.tsx` files. Run `npm run typecheck` to check the TypeScript app. Expo Go is the quickest way to preview; use an Android emulator or development build for native device debugging.

## Structure

```text
App.tsx                     Authenticated app shell and tab navigation
src/
  components/               Branded UI, keyboard-aware forms and sheets, animated tab bar
  config.ts                 API base URL and design tokens
  context/                  Auth and in-app navigation state
  features/
    access/                 Admin specialist access management
    assistant/              Personal assistant tasks, reminders, notes
    auth/                   Branded login, registration, password recovery
    chat/                   Finance AI chat and saved conversations
    finance/                Workspace, insights, records, statements, uploads
    home/                   Workspace dashboard and enabled AI team
    notifications/          In-app notification center
    pricing/                Specialist and workforce plan preview
    profile/                Profile, preferences, and sign out
  services/api.ts           Axios client, bearer token and API errors
  types/api.ts              Typed backend data models
app.json                    Expo identifiers, scheme, and native plugins
global.css                  Tailwind directives and NativeWind utilities
tailwind.config.js           Tailwind colors and source scanning
metro.config.js             NativeWind Metro integration
```

JWTs use Expo SecureStore on iOS and Android, and browser storage for web previews. Assistant notes/tasks/reminders use local AsyncStorage and do not sync with the web version because the backend has no matching persistence API. HR and Sales remain early-access areas. Pricing is a launch preview; the backend does not yet implement purchase verification or checkout. Finance automatic extraction currently supports text-based PDF invoices; the API accepts other documented file types but does not automatically process them yet.

General chat displays source links below answers that use live weather, exchange-rate,
or place information. These lookups run on the backend, so the backend computer or
server needs internet access. Other general responses still use the configured local
Ollama model.

For temporary chat testing, open **AI Chat → Chats → Testing export**. **Current chat**
exports the open saved conversation; **All chats** exports every saved conversation
for the signed-in account. The JSON file includes the full API message history,
timestamps, roles, and answer metadata. The browser downloads the file; iOS and
Android open the system share sheet. Remove the marked controls in `ChatScreen.tsx`
and `src/services/chatExport.ts` when testing is finished.

## Useful commands

```powershell
npm run typecheck
npx expo start --clear
npx expo-doctor
```

Set the production API URL before starting Expo:

```powershell
$env:EXPO_PUBLIC_API_BASE_URL="https://api.example.com/api/v1"
npx expo start
```
