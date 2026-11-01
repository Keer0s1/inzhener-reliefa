/**
 * ============================================================================
 * TELEGRAM-БОТ «ИНЖЕНЕР РЕЛЬЕФА» — УПРАВЛЕНИЕ АДМИНКОЙ ЧЕРЕЗ /admin
 * ============================================================================
 * Работает на чистом Node.js (без установки сторонних библиотек).
 *
 * ЗАПУСК:
 *   $env:BOT_TOKEN="ВАШ_ТОКЕН_ОТ_BOTFATHER"; node bot.js
 *
 * БЕЗОПАСНОСТЬ:
 *   1. В самом Mini App нет никаких кнопок админки — никто из пользователей их не увидит.
 *   2. Главный владелец (@Keer0s1) жёстко зашит в ROOT_OWNER и не может быть удалён.
 *   3. Команды /admin, /addadmin, /deladmin, /setlink работают ТОЛЬКО в чате бота
 *      и проверяют реальный Telegram @username отправителя на сервере Telegram.
 */

const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

const BOT_TOKEN = process.env.BOT_TOKEN || "";
const ROOT_OWNER = "keer0s1"; // Неудаляемый главный владелец (@Keer0s1)
const CONFIG_PATH = path.join(__dirname, "admin_config.json");

if (!BOT_TOKEN) {
  console.error("\n[!] ОШИБКА: Не указан BOT_TOKEN от @BotFather.");
  console.error("Запусти бота командой в PowerShell:");
  console.error('  $env:BOT_TOKEN="ТВОЙ_ТОКЕН_БОТА"; node bot.js\n');
  process.exit(1);
}

const API_BASE = `https://api.telegram.org/bot${BOT_TOKEN}`;
const recentBotMessages = []; // Хранит отправленные сообщения с кнопками, чтобы автоматически обновлять в них ссылку туннеля

function trackBotMessage(chatId, res, type) {
  if (res && res.ok && res.result && res.result.message_id) {
    recentBotMessages.push({ chatId, messageId: res.result.message_id, type });
    if (recentBotMessages.length > 40) recentBotMessages.shift();
  }
}

function normalizeUsername(u) {
  return String(u || "")
    .trim()
    .replace(/^@+/, "")
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "");
}

function loadConfig() {
  try {
    const raw = fs.readFileSync(CONFIG_PATH, "utf8");
    const parsed = JSON.parse(raw);
    const admins = Array.isArray(parsed.admins)
      ? parsed.admins.map(normalizeUsername).filter(Boolean)
      : [];
    const verifiedUserIds = Array.isArray(parsed.verifiedUserIds)
      ? parsed.verifiedUserIds.map(Number).filter(Boolean)
      : [];
    if (!admins.includes(ROOT_OWNER)) admins.unshift(ROOT_OWNER);
    return {
      rootOwner: ROOT_OWNER,
      admins: Array.from(new Set(admins)),
      verifiedUserIds: Array.from(new Set(verifiedUserIds)),
      channelChatId: parsed.channelChatId || null,
      channelTitle: parsed.channelTitle || "",
      channelInviteUrl: parsed.channelInviteUrl || "https://t.me/+eZ4CHSrLFxA0NzY6",
      miniAppUrl: parsed.miniAppUrl || "https://keer0s1.github.io/inzhener-reliefa"
    };
  } catch (e) {
    const fallback = {
      rootOwner: ROOT_OWNER,
      admins: [ROOT_OWNER],
      verifiedUserIds: [],
      channelChatId: null,
      channelTitle: "",
      channelInviteUrl: "https://t.me/+eZ4CHSrLFxA0NzY6",
      miniAppUrl: "https://keer0s1.github.io/inzhener-reliefa"
    };
    saveConfig(fallback);
    return fallback;
  }
}

function saveConfig(cfg, pushToGit = false) {
  if (!cfg.admins.includes(ROOT_OWNER)) {
    cfg.admins.unshift(ROOT_OWNER);
  }
  cfg.admins = Array.from(new Set(cfg.admins.map(normalizeUsername).filter(Boolean)));
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2), "utf8");
  if (pushToGit) {
    try {
      const isWin = process.platform === "win32";
      const shellCmd = isWin ? "cmd.exe" : "sh";
      const shellArgs = isWin
        ? ["/c", 'git add admin_config.json && git commit -m "Sync admin_config" && git push origin main']
        : ["-c", 'git add admin_config.json && git commit -m "Sync admin_config" && git pull --rebase origin main && git push origin main'];
      const gitSync = spawn(shellCmd, shellArgs, { cwd: __dirname, stdio: "ignore" });
      gitSync.unref();
    } catch (e) {}
  }
}

function isAuthorizedAdmin(userObj) {
  if (!userObj || !userObj.username) return false;
  const uname = normalizeUsername(userObj.username);
  if (uname === ROOT_OWNER) return true;
  const cfg = loadConfig();
  return cfg.admins.includes(uname);
}

async function tgCall(method, body = {}) {
  const res = await fetch(`${API_BASE}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  return res.json();
}

function buildAdminKeyboard(cfg) {
  const cleanUrl = cfg.miniAppUrl.replace(/\/+$/, "");
  return {
    inline_keyboard: [
      [
        {
          text: "🔓 Открыть Mini App (Режим Админа без подписки)",
          web_app: { url: `${cleanUrl}/?mode=admin_open&v=${Date.now()}` }
        }
      ],
      [
        {
          text: "🔒 Открыть глазами пользователя (С замками)",
          web_app: { url: `${cleanUrl}/?mode=user_preview&v=${Date.now()}` }
        }
      ],
      [
        { text: "👥 Список админов", callback_data: "admin_list" },
        { text: "🔗 Ссылка на канал", callback_data: "admin_link_info" }
      ],
      [
        { text: "➕ Как добавить админа", callback_data: "admin_add_help" },
        { text: "➖ Как удалить админа", callback_data: "admin_del_help" }
      ]
    ]
  };
}

function formatAdminPanelText(cfg, callerUsername) {
  const adminsFormatted = cfg.admins
    .map((u) => (u === ROOT_OWNER ? `• @${u} (Главный владелец)` : `• @${u}`))
    .join("\n");

  return (
    `🛡 *ПАНЕЛЬ УПРАВЛЕНИЯ «ИНЖЕНЕР РЕЛЬЕФА»*\n\n` +
    `Вы вошли как: *@${callerUsername}*\n` +
    `Статус защиты: *Активен (внутри Mini App кнопки админа скрыты от всех)*\n\n` +
    `👥 *Действующие администраторы (${cfg.admins.length}):*\n${adminsFormatted}\n\n` +
    `🔗 *Ссылка на закрытый канал:*\n\`${cfg.channelInviteUrl}\`\n\n` +
    `*Быстрые команды в этом чате:*\n` +
    `• \`/addadmin @username\` — добавить админа\n` +
    `• \`/deladmin @username\` — удалить админа\n` +
    `• \`/setlink https://t.me/+...\` — сменить ссылку на закрытый канал\n` +
    `• \`/setapp https://...\` — обновить URL Mini App`
  );
}

async function handleMessage(msg) {
  const chatId = msg.chat.id;
  const text = String(msg.text || "").trim();
  const from = msg.from || {};
  const callerUsername = normalizeUsername(from.username);

  if (!text.startsWith("/")) return;

  const [cmdRaw, ...args] = text.split(/\s+/);
  const cmd = cmdRaw.toLowerCase().split("@")[0];

  if (cmd === "/start") {
    const cfg = loadConfig();
    const cleanUrl = cfg.miniAppUrl.replace(/\/+$/, "");
    const sent = await tgCall("sendMessage", {
      chat_id: chatId,
      text:
        "👋 *ИНЖЕНЕР РЕЛЬЕФА — Цифровая раскладка по телу за 30 секунд*\n\n" +
        "Жми кнопку ниже, чтобы открыть калькулятор биометрии, калистеники и силовых нормативов:",
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "📐 Открыть «Инженер Рельефа»",
              web_app: { url: `${cleanUrl}/?v=${Date.now()}` }
            }
          ]
        ]
      }
    });
    trackBotMessage(chatId, sent, "start");
    return;
  }

  // Все остальные команды (/admin, /addadmin, /deladmin, /setlink, /setapp) строго защищены
  if (["/admin", "/addadmin", "/deladmin", "/setlink", "/setapp"].includes(cmd)) {
    if (!isAuthorizedAdmin(from)) {
      await tgCall("sendMessage", {
        chat_id: chatId,
        text: "⛔ Доступ закрыт. Владелец этого бота — другой пользователь, а не вы. Команда доступна только главному владельцу и тем, кому он лично выдал права."
      });
      return;
    }

    // Выдавать и забирать права админа (/addadmin и /deladmin) может ТОЛЬКО лично главный владелец @Keer0s1
    if (["/addadmin", "/deladmin"].includes(cmd) && callerUsername !== ROOT_OWNER) {
      await tgCall("sendMessage", {
        chat_id: chatId,
        text: "⛔ Добавлять и удалять администраторов может только главный владелец (@Keer0s1)."
      });
      return;
    }

    const cfg = loadConfig();

    if (cmd === "/admin") {
      const sent = await tgCall("sendMessage", {
        chat_id: chatId,
        text: formatAdminPanelText(cfg, callerUsername),
        parse_mode: "Markdown",
        reply_markup: buildAdminKeyboard(cfg)
      });
      trackBotMessage(chatId, sent, "admin");
      return;
    }

    if (cmd === "/addadmin") {
      const target = normalizeUsername(args[0]);
      if (!target || target.length < 3) {
        await tgCall("sendMessage", {
          chat_id: chatId,
          text: "⚠️ Укажи никнейм через пробел, например:\n`/addadmin @ivan_fit`",
          parse_mode: "Markdown"
        });
        return;
      }
      if (!cfg.admins.includes(target)) {
        cfg.admins.push(target);
        saveConfig(cfg, true);
      }
      await tgCall("sendMessage", {
        chat_id: chatId,
        text: `✅ Пользователь *@${target}* добавлен в список администраторов.\nТеперь ему доступны команда \`/admin\` и автоматический вход в Mini App без замков.`,
        parse_mode: "Markdown",
        reply_markup: buildAdminKeyboard(cfg)
      });
      return;
    }

    if (cmd === "/deladmin") {
      const target = normalizeUsername(args[0]);
      if (!target) {
        await tgCall("sendMessage", {
          chat_id: chatId,
          text: "⚠️ Укажи никнейм администратора для удаления:\n`/deladmin @username`",
          parse_mode: "Markdown"
        });
        return;
      }
      if (target === ROOT_OWNER) {
        await tgCall("sendMessage", {
          chat_id: chatId,
          text: `🛡 Невозможно удалить главного владельца *@${ROOT_OWNER}*.`,
          parse_mode: "Markdown"
        });
        return;
      }
      cfg.admins = cfg.admins.filter((u) => u !== target);
      saveConfig(cfg, true);
      await tgCall("sendMessage", {
        chat_id: chatId,
        text: `🗑 Пользователь *@${target}* удалён из администраторов.`,
        parse_mode: "Markdown",
        reply_markup: buildAdminKeyboard(cfg)
      });
      return;
    }

    if (cmd === "/setlink") {
      const url = String(args[0] || "").trim();
      if (!url.startsWith("https://t.me/")) {
        await tgCall("sendMessage", {
          chat_id: chatId,
          text: "⚠️ Ссылка должна начинаться с `https://t.me/`. Пример:\n`/setlink https://t.me/+AbCdEfGh123`",
          parse_mode: "Markdown"
        });
        return;
      }
      cfg.channelInviteUrl = url;
      saveConfig(cfg, true);
      await tgCall("sendMessage", {
        chat_id: chatId,
        text: `✅ Пригласительная ссылка закрытого канала обновлена:\n\`${url}\``,
        parse_mode: "Markdown",
        reply_markup: buildAdminKeyboard(cfg)
      });
      return;
    }

    if (cmd === "/setapp") {
      const url = String(args[0] || "").trim();
      if (!url.startsWith("https://")) {
        await tgCall("sendMessage", {
          chat_id: chatId,
          text: "⚠️ URL должен начинаться с `https://`. Пример:\n`/setapp https://fcbd4b0ab93524.lhr.life`",
          parse_mode: "Markdown"
        });
        return;
      }
      cfg.miniAppUrl = url;
      saveConfig(cfg);
      await tgCall("sendMessage", {
        chat_id: chatId,
        text: `✅ Адрес Mini App обновлён:\n\`${url}\``,
        parse_mode: "Markdown",
        reply_markup: buildAdminKeyboard(cfg)
      });
      return;
    }
  }
}

async function handleCallbackQuery(cb) {
  const from = cb.from || {};
  const chatId = cb.message && cb.message.chat ? cb.message.chat.id : null;
  if (!chatId) return;

  if (!isAuthorizedAdmin(from)) {
    await tgCall("answerCallbackQuery", {
      callback_query_id: cb.id,
      text: "⛔ Доступ только для владельца @Keer0s1",
      show_alert: true
    });
    return;
  }

  const cfg = loadConfig();
  await tgCall("answerCallbackQuery", { callback_query_id: cb.id });

  if (cb.data === "admin_list") {
    const list = cfg.admins
      .map((u, i) => `${i + 1}. @${u}${u === ROOT_OWNER ? " (Главный владелец)" : ""}`)
      .join("\n");
    await tgCall("sendMessage", {
      chat_id: chatId,
      text: `👥 *Текущий список администраторов:*\n\n${list}`,
      parse_mode: "Markdown"
    });
  } else if (cb.data === "admin_link_info") {
    await tgCall("sendMessage", {
      chat_id: chatId,
      text: `🔗 *Текущая ссылка на закрытый канал:*\n\`${cfg.channelInviteUrl}\`\n\nЧтобы изменить её, отправь:\n\`/setlink https://t.me/+ТВОЯ_ССЫЛКА\``,
      parse_mode: "Markdown"
    });
  } else if (cb.data === "admin_add_help") {
    await tgCall("sendMessage", {
      chat_id: chatId,
      text: "➕ *Как добавить администратора:*\nОтправь в этот чат команду:\n`/addadmin @никнейм`",
      parse_mode: "Markdown"
    });
  } else if (cb.data === "admin_del_help") {
    await tgCall("sendMessage", {
      chat_id: chatId,
      text: "➖ *Как удалить администратора:*\nОтправь в этот чат команду:\n`/deladmin @никнейм`\n\n_(Главного владельца @Keer0s1 удалить нельзя)_",
      parse_mode: "Markdown"
    });
  }
}

async function handleChatJoinRequest(req) {
  const user = req.from;
  if (!user || !user.id) return;
  const cfg = loadConfig();
  if (req.chat && req.chat.id) {
    cfg.channelChatId = req.chat.id;
    cfg.channelTitle = req.chat.title || cfg.channelTitle;
  }
  if (!Array.isArray(cfg.verifiedUserIds)) cfg.verifiedUserIds = [];
  if (!cfg.verifiedUserIds.includes(Number(user.id))) {
    cfg.verifiedUserIds.push(Number(user.id));
  }
  saveConfig(cfg);
  const cleanUrl = cfg.miniAppUrl.replace(/\/+$/, "");

  // Отправляем пользователю в личку мгновенный доступ к калькулятору после подачи заявки
  await tgCall("sendMessage", {
    chat_id: user.id,
    text:
      "✅ *Заявка в закрытый канал «Инженер Рельефа» принята!*\n\n" +
      "Все расчёты биометрии, калистеники и твой 4-недельный протокол разблокированы:",
    parse_mode: "Markdown",
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: "🔓 Открыть разблокированный калькулятор",
            web_app: { url: `${cleanUrl}/?v=${Date.now()}` }
          }
        ]
      ]
    }
  });
}

async function handleChatMemberUpdate(upd) {
  const cfg = loadConfig();
  if (upd.chat && upd.chat.type === "channel") {
    cfg.channelChatId = upd.chat.id;
    cfg.channelTitle = upd.chat.title || cfg.channelTitle;
  }
  const newMember = upd.new_chat_member;
  if (newMember && newMember.user && !newMember.user.is_bot) {
    const st = newMember.status;
    const uid = Number(newMember.user.id);
    if (!Array.isArray(cfg.verifiedUserIds)) cfg.verifiedUserIds = [];
    if (["member", "administrator", "creator"].includes(st)) {
      if (!cfg.verifiedUserIds.includes(uid)) cfg.verifiedUserIds.push(uid);
    } else if (["left", "kicked"].includes(st)) {
      cfg.verifiedUserIds = cfg.verifiedUserIds.filter((id) => id !== uid);
    }
  }
  saveConfig(cfg);
}

let offset = 0;

function startAutoTunnel() {
  const ssh = spawn(
    "ssh",
    [
      "-o", "StrictHostKeyChecking=no",
      "-o", "ServerAliveInterval=30",
      "-R", "80:localhost:8080",
      "nokey@localhost.run"
    ],
    { stdio: ["ignore", "pipe", "pipe"] }
  );

  const onChunk = async (chunk) => {
    const text = chunk.toString("utf8");
    const match = text.match(/https:\/\/[a-z0-9-]+\.lhr\.life/i);
    if (match && match[0]) {
      const liveUrl = match[0].trim();
      const cfg = loadConfig();
      if (cfg.miniAppUrl !== liveUrl) {
        cfg.miniAppUrl = liveUrl;
        saveConfig(cfg);
        console.log(`[ТУННЕЛЬ ОБНОВЛЁН] Актуальный HTTPS URL: ${liveUrl}`);
        try {
          await tgCall("setChatMenuButton", {
            menu_button: {
              type: "web_app",
              text: "Инженер Рельефа",
              web_app: { url: `${liveUrl}/?v=${Date.now()}` }
            }
          });
          // Автоматически обновляем ссылку прямо внутри уже отправленных старых кнопок в чате!
          for (const item of recentBotMessages) {
            const replyMarkup =
              item.type === "admin"
                ? buildAdminKeyboard(cfg)
                : {
                    inline_keyboard: [
                      [
                        {
                          text: "📐 Открыть «Инженер Рельефа»",
                          web_app: { url: `${liveUrl}/?v=${Date.now()}` }
                        }
                      ]
                    ]
                  };
            await tgCall("editMessageReplyMarkup", {
              chat_id: item.chatId,
              message_id: item.messageId,
              reply_markup: replyMarkup
            });
          }
        } catch (e) {}
      }
    }
  };

  ssh.stdout.on("data", onChunk);
  ssh.stderr.on("data", onChunk);
  ssh.on("close", () => {
    setTimeout(startAutoTunnel, 3000);
  });
}

async function pollUpdates() {
  const me = await tgCall("getMe");
  const botName = me && me.ok && me.result ? `@${me.result.username}` : "Бот";
  const cfg = loadConfig();
  const cleanUrl = cfg.miniAppUrl.replace(/\/+$/, "");

  // Автоматически привязываем кнопку меню бота и описание к актуальному URL Mini App на серверах Telegram (работает 24/7)
  await tgCall("setChatMenuButton", {
    menu_button: {
      type: "web_app",
      text: "📐 Инженер Рельефа",
      web_app: { url: `${cleanUrl}/?v=${Date.now()}` }
    }
  });
  await tgCall("setMyDescription", {
    description:
      "📐 ИНЖЕНЕР РЕЛЬЕФА — Цифровая раскладка по телу за 30 секунд.\n\n" +
      "Калькулятор биометрии, процента жира, силовых нормативов калистеники и твой 4-недельный протокол.\n\n" +
      "👇 Нажми синюю кнопку «📐 Инженер Рельефа» внизу слева, чтобы сразу открыть приложение!"
  });
  await tgCall("setMyShortDescription", {
    short_description:
      "📐 Калькулятор биометрии, рельефа и силовых нормативов калистеники. Жми «📐 Инженер Рельефа»!"
  });

  console.log("====================================================");
  console.log(` Бот «ИНЖЕНЕР РЕЛЬЕФА» (${botName}) запущен!`);
  console.log(` Главный владелец: @${ROOT_OWNER}`);
  console.log(" Напиши боту /admin в Telegram для управления.");
  console.log("====================================================");

  const startTime = Date.now();
  const maxRuntimeMs = process.env.GITHUB_ACTIONS === "true" ? 5 * 60 * 60 * 1000 : Infinity;

  while (Date.now() - startTime < maxRuntimeMs) {
    try {
      const data = await tgCall("getUpdates", {
        offset,
        timeout: 25,
        allowed_updates: ["message", "callback_query", "chat_join_request", "chat_member", "my_chat_member"]
      });

      if (data && data.ok && Array.isArray(data.result)) {
        for (const upd of data.result) {
          offset = upd.update_id + 1;
          if (upd.message) await handleMessage(upd.message);
          if (upd.callback_query) await handleCallbackQuery(upd.callback_query);
          if (upd.chat_join_request) await handleChatJoinRequest(upd.chat_join_request);
          if (upd.chat_member) await handleChatMemberUpdate(upd.chat_member);
          if (upd.my_chat_member) await handleChatMemberUpdate(upd.my_chat_member);
        }
      }
    } catch (err) {
      await new Promise((r) => setTimeout(r, 3000));
    }
  }
  console.log("Цикл облачного воркера завершён планово, перезапуск следующей смены...");
}

pollUpdates();
