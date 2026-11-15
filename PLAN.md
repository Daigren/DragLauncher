# План разработки DragLauncher
> Minecraft-лаунчер с функционалом **Prism Launcher** (изолированные инстансы, управление модами, шейдерами и ресурс-паками через Modrinth) и поддержкой системы аккаунтов и скинов **TLauncher** (+ Ely.by, Offline, Microsoft).

---

## 📌 Архитектурный стек
- **Ядро и GUI**: Electron + TypeScript + Vite + React 19 + Tailwind CSS + Lucide Icons (в стиле NovaCode)
- **Скин-агент и сессии**: Интеграция `authlib-injector` и TLauncher Skin System (автоматическое внедрение Java-агента)
- **Менеджер процессов**: Node.js `child_process` (spawn с `shell: false`) с потоковым выводом логов Minecraft в UI
- **Сетевой слой**: Mojang Piston Meta API, TLauncher Auth API, Ely.by Yggdrasil API, Fabric Meta API, Modrinth v2 API
- **Платформа**: Windows x64 (полная поддержка изолированных инстансов)

---

## 📋 Этапы и статус реализации

### [x] Этап 1: Инфраструктура и каркас проекта
- [x] Создание структуры репозитория и базовых конфигураций (`package.json`, `tsconfig.json`, `tsconfig.main.json`, `vite.config.ts`, `postcss.config.js`, `tailwind.config.js`)
- [x] Настройка Electron (Main Process, Preload Script, Renderer Process)
- [x] Настройка TypeScript, React 19, Tailwind CSS и иконок Lucide
- [x] Архитектура межпроцессного взаимодействия (IPC) со строгой типизацией (`src/shared/types.ts`, `src/preload/index.ts`, `src/main/index.ts`)
- [x] Локальная база конфигурации (`src/main/config.ts`: `draglauncher.config.json` с папками инстансов, настройками ОЗУ и Java)

### [x] Этап 2: Система аккаунтов (TLauncher, Ely.by, Offline)
- [x] Модель данных аккаунтов (`Account`, `AccountType`, `AuthProfile`)
- [x] Реализация менеджера аккаунтов (`AccountManager` в `src/main/accountManager.ts`): сохранение, переключение, удаление
- [x] Поддержка **TLauncher Accounts**:
  - [x] Авторизация через API TLauncher (`auth.tlauncher.org` / Yggdrasil-совместимый протокол)
  - [x] Получение UUID, токена сессии и информации о скине
- [x] Поддержка **Ely.by / authlib-injector** (открытый стандарт скинов и Yggdrasil-аккаунтов)
- [x] Поддержка **Offline Accounts** (офлайн никнеймы с генерацией детерминированного UUID v3)
- [x] UI управления аккаунтами (`AccountsModal.tsx`, `TitleBar.tsx`):
  - [x] Диалог добавления аккаунта (выбор типа: TLauncher, Ely.by, Офлайн)
  - [x] Быстрое переключение активного аккаунта в верхнем тулбаре
  - [x] Отображение аватарок/голов скинов и статусов

### [x] Этап 3: Система изолированных инстансов (в стиле Prism Launcher)
- [x] Структура папки инстанса (`instances/<id>/.minecraft` с изолированными `mods`, `saves`, `resourcepacks`, `shaderpacks`, `config`)
- [x] Модель конфигурации инстанса (`instance.json`: название, версия MC, мод-лоадер, ОЗУ, JVM-аргументы, иконка, статистика времени)
- [x] Менеджер инстансов (`InstanceManager` в `src/main/instanceManager.ts`): сканирование, создание, обновление, удаление, открытие папки
- [x] UI сетки/списка инстансов:
  - [x] Карточки инстансов (`InstanceCard.tsx`) с бейджами лоадеров (Vanilla, Fabric, Forge) и счетчиком времени
  - [x] Быстрые действия: Запустить, Моды, Открыть папку, Удалить
  - [x] Поиск и фильтрация инстансов по названию и версии
  - [x] Диалоговое окно создания инстанса (`CreateInstanceModal.tsx`) с получением официальных версий из Mojang Manifest

### [x] Этап 4: Загрузчик файлов Minecraft и движок запуска
- [x] Клиент Mojang Version Manifest (`src/main/mojang.ts` с локальным кэшированием)
- [x] Менеджер загрузки файлов с индикатором прогресса:
  - [x] Скачивание `version.json`
  - [x] Скачивание клиентского JAR (`client.jar`)
  - [x] Загрузка библиотек с фильтрацией по правилам ОС (Windows)
  - [x] Параллельная загрузка ассетов и индексов (`assets/indexes`, `assets/objects`)
- [x] Модуль поиска и проверки установленных версий Java в системе (`src/main/javaDetector.ts` с автоподбором под версию MC: Java 8 / 17 / 21)
- [x] Формирование аргументов запуска игры (`src/main/launcher.ts`):
  - [x] Сборка classpath со всеми библиотеками и клиентским JAR
  - [x] Передача параметров авторизации (`--username`, `--uuid`, `--accessToken`, `--userType`)
  - [x] Инжекция Java-агента (`src/main/skinAgent.ts`: `-javaagent:authlib-injector.jar=...`) для скинов TLauncher / Ely.by
- [x] Запуск процесса Java без ограничений длины строки (`shell: false`), управление жизненным циклом и окно логов инстанса (`LogsModal.tsx`, потоковая передача `stdout`/`stderr`)

### [x] Этап 5: Поддержка мод-лоадеров, каталогов модов, шейдеров и ресурс-паков (Modrinth API)
- [x] Сервис версий Fabric Loader (`src/main/fabric.ts` через Fabric Meta API)
- [x] Встроенный каталог Modrinth (`src/main/modrinth.ts`):
  - [x] Поиск и установка **Модов** в папку `.minecraft/mods`
  - [x] Поиск и установка **Ресурс-паков** в папку `.minecraft/resourcepacks`
  - [x] Поиск и установка **Шейдеров** в папку `.minecraft/shaderpacks`
- [x] Менеджер контента инстанса (`ModsModal.tsx`):
  - [x] Переключение категорий (Моды / Ресурс-паки / Шейдеры)
  - [x] Включение/отключение файлов (`.disabled`), удаление, открытие соответствующих папок проводника

### [x] Этап 6: Финализация, минималистичный дизайн в стиле NovaCode и сборка
- [x] Минималистичный темный UI в стиле NovaCode (глубокий черный цвет, мягкое бирюзовое свечение, овальные pill-кнопки, строгая монохромная типографика)
- [x] Окно глобальных настроек лаунчера (`SettingsModal.tsx`: лимиты ОЗУ, дефолтный Java-путь, флаги JVM)
- [x] Окно лога консоли с подсветкой ошибок (`LogsModal.tsx`: копирование в буфер, очистка, кнопка аварийной остановки игры)
- [x] Полная компиляция фронтенда и бэкенда (`npm run build`)
- [x] Сборка исполняемых `.exe` файлов Windows (`release\DragLauncher 1.0.0.exe` и `release\win-unpacked\DragLauncher.exe`)
- [x] Создание документации и руководства пользователя (`README.md`)
