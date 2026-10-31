/**
 * ============================================================================
 * TELEGRAM MINI APP «ИНЖЕНЕР РЕЛЬЕФА» — ОСНОВНОЙ МОДУЛЬ UI И ИНТЕРАКТИВА (v5)
 * ============================================================================
 */
const CONFIG = Object.freeze({
  channelBrand: "ИНЖЕНЕР РЕЛЬЕФА",
  // Сюда вставь свою пригласительную ссылку на закрытый канал с заявками:
  channelInviteUrl: "https://t.me/+eZ4CHSrLFxA0NzY6",
  minSecondsAway: 3,

  // ГЛАВНЫЙ ВЛАДЕЛЕЦ (@Keer0s1) — неудаляемый root-администратор
  rootAdminUsernames: Object.freeze(["keer0s1"]),
  adminUserIds: Object.freeze([])
});

const BW_EXERCISE_META = {
  pushups:  { title: "Отжимания классические", label: "Максимум повторений за подход", unit: "повт", min: 0, max: 120, step: 1, defaultVal: 25, hasTimer: false },
  pullups:  { title: "Подтягивания (без веса)", label: "Максимум чистых повторений", unit: "повт", min: 0, max: 50, step: 1, defaultVal: 10, hasTimer: false },
  dips:     { title: "Брусья (без веса)", label: "Максимум повторений", unit: "повт", min: 0, max: 70, step: 1, defaultVal: 14, hasTimer: false },
  squats60: { title: "Приседания за 60 с", label: "Максимум повторений за 60 секунд", unit: "повт", min: 0, max: 100, step: 1, defaultVal: 38, hasTimer: true },
  hang:     { title: "Вис на турнике", label: "Время удержания, сек", unit: "сек", min: 0, max: 240, step: 5, defaultVal: 55, hasTimer: true },
  wallsit:  { title: "Стульчик у стены", label: "Время удержания (90°), сек", unit: "сек", min: 0, max: 300, step: 5, defaultVal: 65, hasTimer: true },
  plank:    { title: "Планка", label: "Время удержания, сек", unit: "сек", min: 0, max: 360, step: 5, defaultVal: 90, hasTimer: true },
  srt:      { title: "Тест «Сесть-встать» (SRT)", label: "Баллы по инструкции (0–10)", unit: "балл.", min: 0, max: 10, step: 0.5, defaultVal: 8.5, hasTimer: false }
};

const state = {
  gender: "male",
  goal: "cut",
  weight: 82.0,
  targetWeight: 75.0,
  height: 178,
  age: 25,
  waist: 82,
  bf: 15,
  activity: 1.375,
  kcal: 2140,

  // Модуль Силы
  strengthMode: "bw",
  bwExercise: "pushups",
  bwValue: 25,
  pushupKnees: false,
  lastBwEval: null,
  bwScoresByEx: {
    pushups: 58,
    pullups: 50,
    dips: 52,
    squats60: 60,
    hang: 55,
    wallsit: 55,
    plank: 62,
    srt: 75
  },
  restTimerSec: 120,
  restInterval: null,

  // Секундомер для изометрических тестов
  swRunning: false,
  swStartTime: 0,
  swElapsedMs: 0,
  swInterval: null,

  lift: "bench",
  liftKg: 80.0,
  liftReps: 6,
  wrist: 17.5,
  ankle: 22.5,
  lastBarbellEval: null,

  // Добавки и противопоказания
  hasCaffeineContra: false,
  matrixSetIdx: 0,

  // Замеры и хранилище
  logs: {
    weight: [],
    pushups: [],
    pullups: [],
    dips: [],
    squats60: [],
    hang: [],
    wallsit: [],
    plank: [],
    srt: [],
    barbell_1rm: []
  },
  nextReminderDate: null,

  // Статус подписки и защищённый список администраторов
  unlocked: false,
  isAdmin: false,
  customAdminUsernames: [],
  verifiedUserIds: [],
  customChannelUrl: "",
  joinClickedAt: 0
};

const tg = window.Telegram && window.Telegram.WebApp ? window.Telegram.WebApp : null;
if (tg) {
  tg.ready();
  tg.expand();
  if (tg.setHeaderColor) tg.setHeaderColor("#090A0D");
  if (tg.setBackgroundColor) tg.setBackgroundColor("#090A0D");
}

/**
 * Обёртка над Telegram.WebApp.CloudStorage + fallback на localStorage
 */
const AppStorage = {
  set(key, valueObj) {
    const raw = JSON.stringify(valueObj);
    try {
      localStorage.setItem(key, raw);
    } catch (e) {}
    if (tg && tg.CloudStorage) {
      try {
        tg.CloudStorage.setItem(key, raw, () => {});
      } catch (e) {}
    }
  },
  get(key, callback) {
    if (tg && tg.CloudStorage) {
      try {
        tg.CloudStorage.getItem(key, (err, val) => {
          if (!err && val) {
            try {
              return callback(JSON.parse(val));
            } catch (e) {}
          }
          const local = localStorage.getItem(key);
          callback(local ? JSON.parse(local) : null);
        });
        return;
      } catch (e) {}
    }
    const local = localStorage.getItem(key);
    callback(local ? JSON.parse(local) : null);
  }
};

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("headerChannelName").textContent = CONFIG.channelBrand;

  loadPersistedUserState(() => {
    initNavigation();
    initSteppersAndSliders();
    initMetabolicControls();
    initStrengthControls();
    initStopwatchAndSrtChips();
    initNutritionControls();
    initLogsAndReminderControls();
    initPrivacyAndShareModals();
    renderScientificSources();
    applyGenderTheme();

    recalcMetabolic();
    recalcBodyweight();
    recalcStrength();
    renderNutritionMatrix();
    renderLogsView();
    syncGateUI();
    updateAllSliderFills();

    handleDeepLinkStartParam();
  });

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden && state.joinClickedAt > 0 && !state.unlocked) {
      triggerVerifyAccess();
    }
  });
});

function normalizeUsername(u) {
  return String(u || "")
    .trim()
    .replace(/^@+/, "")
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "");
}

function getAllAdminUsernames() {
  const base = CONFIG.rootAdminUsernames.map(normalizeUsername).filter(Boolean);
  const extra = (state.customAdminUsernames || []).map(normalizeUsername).filter(Boolean);
  return Array.from(new Set([...base, ...extra]));
}

function checkIsAuthorizedAdmin() {
  const tgUser = tg && tg.initDataUnsafe && tg.initDataUnsafe.user ? tg.initDataUnsafe.user : null;
  if (tgUser) {
    const uname = normalizeUsername(tgUser.username);
    const uid = Number(tgUser.id);
    if (uname && getAllAdminUsernames().includes(uname)) return true;
    if (uid && CONFIG.adminUserIds.includes(uid)) return true;
  }
  return false;
}

function syncAdminConfigFromBot(callback) {
  fetch(`./admin_config.json?t=${Date.now()}`, { cache: "no-store" })
    .then((r) => (r.ok ? r.json() : null))
    .then((cfg) => {
      if (cfg && typeof cfg === "object") {
        if (Array.isArray(cfg.admins)) {
          state.customAdminUsernames = cfg.admins.map(normalizeUsername).filter(Boolean);
        }
        if (Array.isArray(cfg.verifiedUserIds)) {
          state.verifiedUserIds = cfg.verifiedUserIds.map(Number).filter(Boolean);
        }
        if (typeof cfg.channelInviteUrl === "string" && cfg.channelInviteUrl.startsWith("https://t.me/")) {
          state.customChannelUrl = cfg.channelInviteUrl;
        }
      }
      callback();
    })
    .catch(() => callback());
}

function checkIsUserVerifiedInChannel() {
  const tgUser = tg && tg.initDataUnsafe && tg.initDataUnsafe.user ? tg.initDataUnsafe.user : null;
  if (tgUser && tgUser.id && state.verifiedUserIds.includes(Number(tgUser.id))) {
    return true;
  }
  return false;
}

function loadPersistedUserState(done) {
  // Сбрасываем старый тестовый ключ, чтобы проверка подписки была честной
  localStorage.removeItem("ir_sub_verified_v2");

  syncAdminConfigFromBot(() => {
    AppStorage.get("ir_user_data_v1", (saved) => {
      if (saved) {
        if (saved.gender) state.gender = saved.gender;
        if (saved.weight) state.weight = saved.weight;
        if (saved.targetWeight) state.targetWeight = saved.targetWeight;
        if (saved.height) state.height = saved.height;
        if (saved.age) state.age = saved.age;
        if (saved.bf) state.bf = saved.bf;
        if (saved.logs) state.logs = { ...state.logs, ...saved.logs };
        if (saved.nextReminderDate) state.nextReminderDate = saved.nextReminderDate;

        document.getElementById("inWeight").value = state.weight;
        document.getElementById("valWeight").textContent = state.weight.toFixed(1);
        document.getElementById("inTargetWeight").value = state.targetWeight;
        document.getElementById("valTargetWeight").textContent = state.targetWeight.toFixed(1);
        document.getElementById("inHeight").value = state.height;
        document.getElementById("inAge").value = state.age;
      } else {
        if (!localStorage.getItem("ir_privacy_seen")) {
          document.getElementById("privacyModal").classList.remove("hidden");
        }
      }

      state.isAdmin = checkIsAuthorizedAdmin();
      const urlParams = new URLSearchParams(window.location.search);
      const modeParam = urlParams.get("mode") || "";

      // Если вошёл Админ (@Keer0s1 или добавленный через /admin в боте) —
      // Mini App сразу узнаёт его и открывает все расчёты без заявки!
      if (state.isAdmin && modeParam !== "user_preview") {
        state.unlocked = true;
      } else if (
        modeParam !== "user_preview" &&
        (checkIsUserVerifiedInChannel() || localStorage.getItem("ir_join_request_sent") === "1")
      ) {
        state.unlocked = true;
      } else {
        state.unlocked = false;
      }
      done();
    });
  });
}

function saveUserState() {
  AppStorage.set("ir_user_data_v1", {
    gender: state.gender,
    weight: state.weight,
    targetWeight: state.targetWeight,
    height: state.height,
    age: state.age,
    bf: state.bf,
    logs: state.logs,
    nextReminderDate: state.nextReminderDate
  });
}

/**
 * Визуальная заливка трека всех ползунков слева направо (#2EC5F0)
 */
function getThemePalette() {
  if (state.gender === "female") {
    return {
      accent: "#F472B6",
      bright: "#F9A8D4",
      fill: "rgba(244, 114, 182, 0.18)",
      track: "#261B24",
      bgHeader: "#0E090D"
    };
  }
  return {
    accent: "#E11D48",
    bright: "#FB7185",
    fill: "rgba(225, 29, 72, 0.16)",
    track: "#1A171D",
    bgHeader: "#070709"
  };
}

function applyGenderTheme() {
  document.body.setAttribute("data-gender", state.gender);
  document.querySelectorAll("#genderSwitch .seg-opt").forEach((b) => {
    b.classList.toggle("active", b.dataset.val === state.gender);
  });
  const pal = getThemePalette();
  if (tg) {
    if (tg.setHeaderColor) tg.setHeaderColor(pal.bgHeader);
    if (tg.setBackgroundColor) tg.setBackgroundColor(pal.bgHeader);
  }
  updateAllSliderFills();
}

function updateSliderFill(sliderEl) {
  const min = parseFloat(sliderEl.min) || 0;
  const max = parseFloat(sliderEl.max) || 100;
  const val = parseFloat(sliderEl.value) || 0;
  const pct = Math.max(0, Math.min(100, ((val - min) / (max - min)) * 100));
  const pal = getThemePalette();
  sliderEl.style.background = `linear-gradient(90deg, ${pal.accent} 0%, ${pal.bright} ${pct}%, ${pal.track} ${pct}%, ${pal.track} 100%)`;
}

function updateAllSliderFills() {
  document.querySelectorAll(".track-slider").forEach(updateSliderFill);
}

/**
 * Инженерный SVG-силуэт торса, меняющий ширину талии, пропорции и палитру (Мужской / Женский)
 */
function renderBodyFatBlueprint() {
  const container = document.getElementById("bfSilhouetteSvg");
  if (!container) return;

  const { bf, weight, height, gender } = state;
  const pal = getThemePalette();
  const bmi = Formulas.calcBMI(weight, height);
  const fatKg = +((weight * bf) / 100).toFixed(1);

  document.getElementById("bpLiveBmi").textContent = `${bmi} кг/м²`;
  document.getElementById("bpLiveFatKg").textContent = `~${fatKg} кг`;

  const descMap = {
    10: "Сухой рельеф: отчётливые кубики пресса и зубчатые мышцы, сечение дельт",
    15: "Атлетичная форма: видны верхние кубики пресса, узкая талия без боков",
    20: "Нормальная кондиция: пресс сглажен под слоем, контур тела ровный",
    26: "Сглаженный рельеф: заметная складка на животе и внизу боков",
    32: "Избыток жировой ткани: выраженный объём в области талии и живота"
  };
  document.getElementById("bpLiveVisualDesc").textContent = descMap[bf] || descMap[15];

  let waistHalf = 15;
  let absOpacity = 0.85;
  if (bf <= 10) { waistHalf = 13; absOpacity = 0.95; }
  else if (bf <= 15) { waistHalf = 15.5; absOpacity = 0.65; }
  else if (bf <= 20) { waistHalf = 18.5; absOpacity = 0.25; }
  else if (bf <= 26) { waistHalf = 22.5; absOpacity = 0.08; }
  else { waistHalf = 26.5; absOpacity = 0.0; }

  const shoulderHalf = gender === "male" ? 24 : 19.5;
  const hipHalf = gender === "male" ? 17 : 21.5;

  const leftShoulder = 48 - shoulderHalf;
  const rightShoulder = 48 + shoulderHalf;
  const leftWaist = 48 - waistHalf;
  const rightWaist = 48 + waistHalf;
  const leftHip = 48 - hipHalf;
  const rightHip = 48 + hipHalf;

  container.innerHTML = `
    <svg viewBox="0 0 96 104" width="88" height="96">
      <line x1="48" y1="6" x2="48" y2="98" stroke="rgba(255,255,255,0.14)" stroke-dasharray="2,2" stroke-width="1"/>
      <line x1="12" y1="62" x2="84" y2="62" stroke="rgba(255,255,255,0.18)" stroke-dasharray="2,2" stroke-width="1"/>
      <path d="M ${leftShoulder} 22
               C ${leftShoulder - 4} 32, ${leftWaist} 46, ${leftWaist} 62
               C ${leftWaist} 74, ${leftHip} 82, ${leftHip} 92
               L ${rightHip} 92
               C ${rightHip} 82, ${rightWaist} 74, ${rightWaist} 62
               C ${rightWaist} 46, ${rightShoulder + 4} 32, ${rightShoulder} 22
               Z"
            fill="${pal.fill}" stroke="${pal.accent}" stroke-width="1.7" />
      <path d="M ${leftShoulder + 3} 28 Q 40 38 47 34 M ${rightShoulder - 3} 28 Q 56 38 49 34"
            fill="none" stroke="${pal.bright}" stroke-width="1.3" opacity="0.75" />
      <g opacity="${absOpacity}" stroke="${pal.bright}" stroke-width="1.2" fill="none">
        <rect x="41" y="40" width="6" height="7" rx="1.5"/>
        <rect x="49" y="40" width="6" height="7" rx="1.5"/>
        <rect x="41" y="49" width="6" height="7" rx="1.5"/>
        <rect x="49" y="49" width="6" height="7" rx="1.5"/>
        <rect x="41" y="58" width="6" height="7" rx="1.5"/>
        <rect x="49" y="58" width="6" height="7" rx="1.5"/>
      </g>
      <circle cx="${leftWaist}" cy="62" r="2.4" fill="${pal.accent}"/>
      <circle cx="${rightWaist}" cy="62" r="2.4" fill="${pal.accent}"/>
    </svg>
  `;
}

/**
 * P1.5: Глубокие ссылки из роликов (startapp)
 */
function handleDeepLinkStartParam() {
  const urlParams = new URLSearchParams(window.location.search);
  const rawStart =
    (tg && tg.initDataUnsafe && tg.initDataUnsafe.start_param) ||
    urlParams.get("startapp") ||
    "";

  if (!rawStart) return;

  const parts = rawStart.toLowerCase().split("_");
  const targetKey = parts[0];
  const videoCode = parts.slice(1).join("_") || "direct";

  try {
    const stats = JSON.parse(localStorage.getItem("ir_startapp_stats") || "{}");
    stats[rawStart] = (stats[rawStart] || 0) + 1;
    localStorage.setItem("ir_startapp_stats", JSON.stringify(stats));
    console.info(`[StartApp Analytics] test=${targetKey}, video=${videoCode}`);
  } catch (e) {}

  const bwMap = {
    pushups: "pushups",
    pullups: "pullups",
    dips: "dips",
    squats: "squats60",
    squats60: "squats60",
    hang: "hang",
    wallsit: "wallsit",
    plank: "plank",
    srt: "srt"
  };

  if (bwMap[targetKey]) {
    switchView("view-strength");
    switchStrengthMode("bw");
    selectBwExercise(bwMap[targetKey]);
  } else if (targetKey === "biometry" || targetKey === "metabolic") {
    switchView("view-metabolic");
  } else if (targetKey === "protocol" || targetKey === "nutrition") {
    switchView("view-nutrition");
  } else if (targetKey === "barbell" || targetKey === "1rm") {
    switchView("view-strength");
    switchStrengthMode("barbell");
  } else if (targetKey === "logs") {
    switchView("view-logs");
  }
}

function initNavigation() {
  document.querySelectorAll(".dock-item").forEach((btn) => {
    btn.addEventListener("click", () => {
      switchView(btn.dataset.view);
    });
  });

  // Безопасная привязка кнопок замка подписки (без inline onclick в HTML)
  document.querySelectorAll(".js-join-channel").forEach((btn) => {
    btn.addEventListener("click", triggerJoinChannel);
  });
  document.querySelectorAll(".js-verify-access").forEach((btn) => {
    btn.addEventListener("click", triggerVerifyAccess);
  });

  const scrollBtn = document.getElementById("scrollToMetabolicResultBtn");
  if (scrollBtn) {
    scrollBtn.addEventListener("click", () => {
      document.getElementById("gateMetabolic").scrollIntoView({ behavior: "smooth", block: "start" });
      if (tg && tg.HapticFeedback) tg.HapticFeedback.impactOccurred("medium");
    });
  }

  // Только для распознанного Админа (@Keer0s1 и список из /admin):
  // нажатие на верхний бейдж статуса мгновенно переключает между режимом Админа (без замков)
  // и просмотром глазами обычного неподписанного пользователя (с плашкой «Подать заявку»).
  // У обычных пользователей этот бейдж не кликается.
  const userBadge = document.getElementById("userAccessBadge");
  if (userBadge) {
    userBadge.addEventListener("click", () => {
      if (!checkIsAuthorizedAdmin()) return;
      state.unlocked = !state.unlocked;
      syncGateUI();
      if (tg && tg.HapticFeedback) tg.HapticFeedback.impactOccurred("light");
    });
  }
}

function switchView(viewId) {
  document.querySelectorAll(".dock-item").forEach((b) => {
    b.classList.toggle("active", b.dataset.view === viewId);
  });
  document.querySelectorAll(".view").forEach((v) => {
    v.classList.toggle("active", v.id === viewId);
  });
  window.scrollTo({ top: 0, behavior: "smooth" });
  if (tg && tg.HapticFeedback) tg.HapticFeedback.selectionChanged();
}

function initSteppersAndSliders() {
  document.querySelectorAll(".step-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const input = document.getElementById(btn.dataset.target);
      const step = parseFloat(input.step) || parseFloat(btn.dataset.step) || 1;
      const dir = parseFloat(btn.dataset.step) < 0 ? -1 : 1;
      const min = parseFloat(input.min) || 0;
      const max = parseFloat(input.max) || 300;
      let next = +(parseFloat(input.value) + dir * Math.abs(step)).toFixed(1);
      next = Math.max(min, Math.min(max, next));
      input.value = next;
      input.dispatchEvent(new Event("input"));
      if (tg && tg.HapticFeedback) tg.HapticFeedback.impactOccurred("light");
    });
  });

  const bind = (id, key, labelId, decimals, cb) => {
    const el = document.getElementById(id);
    el.addEventListener("input", () => {
      const val = parseFloat(el.value);
      state[key] = val;
      if (labelId) {
        document.getElementById(labelId).textContent = decimals > 0 ? val.toFixed(decimals) : val;
      }
      if (el.classList.contains("track-slider")) {
        updateSliderFill(el);
      }
      cb();
      saveUserState();
    });
  };

  bind("inWeight", "weight", "valWeight", 1, () => {
    recalcMetabolic();
    recalcBodyweight();
    recalcStrength();
  });
  bind("inTargetWeight", "targetWeight", "valTargetWeight", 1, recalcMetabolic);
  bind("inHeight", "height", null, 0, () => {
    recalcMetabolic();
    recalcStrength();
  });
  bind("inAge", "age", null, 0, () => {
    recalcMetabolic();
    recalcBodyweight();
  });
  bind("inWaist", "waist", "valWaist", 0, recalcMetabolic);

  bind("inBwValue", "bwValue", "valBwInput", 0, recalcBodyweight);
  bind("inLiftKg", "liftKg", "valLiftKg", 1, recalcStrength);
  bind("inLiftReps", "liftReps", "valLiftReps", 0, recalcStrength);
  bind("inWrist", "wrist", null, 1, recalcStrength);
  bind("inAnkle", "ankle", null, 1, recalcStrength);
}

/**
 * Встроенный секундомер для изометрических тестов + интерактивный калькулятор баллов SRT
 */
function initStopwatchAndSrtChips() {
  const toggleBtn = document.getElementById("swToggleBtn");
  const applyBtn = document.getElementById("swApplyBtn");
  const resetBtn = document.getElementById("swResetBtn");
  const display = document.getElementById("swDisplay");

  function formatSw(ms) {
    const totalSec = ms / 1000;
    const m = Math.floor(totalSec / 60);
    const s = Math.floor(totalSec % 60);
    const tenths = Math.floor((ms % 1000) / 100);
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${tenths}`;
  }

  toggleBtn.addEventListener("click", () => {
    if (!state.swRunning) {
      state.swRunning = true;
      state.swStartTime = Date.now() - state.swElapsedMs;
      toggleBtn.textContent = "СТОП";
      toggleBtn.classList.add("running");
      state.swInterval = setInterval(() => {
        state.swElapsedMs = Date.now() - state.swStartTime;
        display.textContent = formatSw(state.swElapsedMs);
      }, 100);
      if (tg && tg.HapticFeedback) tg.HapticFeedback.impactOccurred("medium");
    } else {
      state.swRunning = false;
      clearInterval(state.swInterval);
      toggleBtn.textContent = "СТАРТ";
      toggleBtn.classList.remove("running");
      if (tg && tg.HapticFeedback) tg.HapticFeedback.notificationOccurred("success");
    }
  });

  applyBtn.addEventListener("click", () => {
    const secs = Math.round(state.swElapsedMs / 1000);
    if (secs <= 0) return;
    const input = document.getElementById("inBwValue");
    input.value = Math.min(parseFloat(input.max), secs);
    input.dispatchEvent(new Event("input"));
    if (tg && tg.HapticFeedback) tg.HapticFeedback.notificationOccurred("success");
  });

  resetBtn.addEventListener("click", () => {
    state.swRunning = false;
    clearInterval(state.swInterval);
    state.swElapsedMs = 0;
    display.textContent = "00:00.0";
    toggleBtn.textContent = "СТАРТ";
    toggleBtn.classList.remove("running");
  });

  // Интерактивные кнопки вычета баллов SRT (Сесть-встать с пола)
  document.querySelectorAll("#srtPenaltyChips .srt-chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      if (chip) chip.classList.toggle("active");
      let totalPenalty = 0;
      document.querySelectorAll("#srtPenaltyChips .srt-chip.active").forEach((c) => {
        totalPenalty += parseFloat(c.dataset.penalty);
      });
      const finalScore = Math.max(0, +(10 - totalPenalty).toFixed(1));
      const input = document.getElementById("inBwValue");
      input.value = finalScore;
      input.dispatchEvent(new Event("input"));
      if (tg && tg.HapticFeedback) tg.HapticFeedback.selectionChanged();
    });
  });

  // Таймер отдыха между подходами (90с / 120с)
  function startRestCountdown(seconds) {
    clearInterval(state.restInterval);
    state.restTimerSec = seconds;
    const disp = document.getElementById("restTimerDisplay");
    const renderRest = () => {
      const m = Math.floor(state.restTimerSec / 60);
      const s = state.restTimerSec % 60;
      disp.textContent = `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    };
    renderRest();
    if (tg && tg.HapticFeedback) tg.HapticFeedback.impactOccurred("light");

    state.restInterval = setInterval(() => {
      state.restTimerSec--;
      if (state.restTimerSec <= 0) {
        clearInterval(state.restInterval);
        disp.textContent = "ГОТОВО! В ПОДХОД";
        if (tg && tg.HapticFeedback) tg.HapticFeedback.notificationOccurred("success");
        return;
      }
      renderRest();
    }, 1000);
  }

  document.getElementById("rest90Btn").addEventListener("click", () => startRestCountdown(90));
  document.getElementById("rest120Btn").addEventListener("click", () => startRestCountdown(120));
  document.getElementById("restStopBtn").addEventListener("click", () => {
    clearInterval(state.restInterval);
    document.getElementById("restTimerDisplay").textContent = "02:00";
  });
}

/**
 * МОДУЛЬ 1: БИОМЕТРИЯ И ПЕРЕСЧЁТ ПО ФАКТУ
 */
function initMetabolicControls() {
  document.querySelectorAll("#genderSwitch .seg-opt").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.gender = btn.dataset.val;
      applyGenderTheme();
      recalcMetabolic();
      recalcBodyweight();
      recalcStrength();
      renderLogsView();
      saveUserState();
      if (tg && tg.HapticFeedback) tg.HapticFeedback.selectionChanged();
    });
  });

  document.querySelectorAll("#goalSwitch .proto-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll("#goalSwitch .proto-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      state.goal = btn.dataset.val;

      if (state.goal === "cut" && state.targetWeight >= state.weight) {
        state.targetWeight = Math.max(45, +(state.weight - 5).toFixed(1));
      } else if (state.goal === "bulk" && state.targetWeight <= state.weight) {
        state.targetWeight = +(state.weight + 4).toFixed(1);
      }
      const tInput = document.getElementById("inTargetWeight");
      tInput.value = state.targetWeight;
      updateSliderFill(tInput);
      document.getElementById("valTargetWeight").textContent = state.targetWeight.toFixed(1);
      recalcMetabolic();
    });
  });

  document.querySelectorAll("#bfSelector .bf-node").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll("#bfSelector .bf-node").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      state.bf = parseFloat(btn.dataset.bf);
      document.getElementById("valBf").textContent = state.bf;
      recalcMetabolic();
      saveUserState();
      if (tg && tg.HapticFeedback) tg.HapticFeedback.selectionChanged();
    });
  });

  document.querySelectorAll("#activitySelector .chip").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll("#activitySelector .chip").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      state.activity = parseFloat(btn.dataset.act);
      document.getElementById("valActivityTag").textContent = `x${state.activity.toFixed(2)}`;
      recalcMetabolic();
    });
  });

  document.getElementById("saveFactWeightBtn").addEventListener("click", () => {
    const val = parseFloat(document.getElementById("inFactWeight").value);
    if (!val || val < 35 || val > 200) return;

    state.logs.weight.push({
      date: new Date().toISOString(),
      weight: val,
      value: val
    });
    state.weight = val;
    const wInput = document.getElementById("inWeight");
    wInput.value = val;
    updateSliderFill(wInput);
    document.getElementById("valWeight").textContent = val.toFixed(1);
    document.getElementById("inFactWeight").value = "";

    saveUserState();
    recalcMetabolic();
    renderLogsView();
    if (tg && tg.HapticFeedback) tg.HapticFeedback.notificationOccurred("success");
  });
}

function recalcMetabolic() {
  renderBodyFatBlueprint();

  const plan = Formulas.calcMetabolicPlan({
    gender: state.gender,
    goal: state.goal,
    weight: state.weight,
    targetWeight: state.targetWeight,
    height: state.height,
    age: state.age,
    bf: state.bf,
    activity: state.activity,
    weeklyLogs: state.logs.weight
  });

  state.kcal = plan.targetKcal;

  document.getElementById("liveKcalPreview").textContent = plan.targetKcal;
  document.getElementById("liveDeficitTag").textContent = plan.tagLabel;
  document.getElementById("liveLbmPreview").textContent = plan.lbm.toFixed(1);
  document.getElementById("liveBmrPreview").textContent = plan.bmr;
  document.getElementById("liveTdeePreview").textContent = plan.tdee;

  const pct = Math.min(1, Math.max(0.25, plan.targetKcal / 3400));
  document.getElementById("kcalRing").setAttribute("stroke-dashoffset", Math.round(314 * (1 - pct)));

  const warnBox = document.getElementById("metabolicWarningsBox");
  if (plan.warnings.length > 0) {
    warnBox.classList.remove("hidden");
    warnBox.innerHTML = plan.warnings.map((w) => `<div>• ${w}</div>`).join("");
  } else {
    warnBox.classList.add("hidden");
  }

  const bmiStopPanel = document.getElementById("bmiBlockedPanel");
  const normalContent = document.getElementById("metabolicNormalContent");
  if (plan.blockedByLowBMI) {
    bmiStopPanel.classList.remove("hidden");
    normalContent.classList.add("hidden");
    return;
  } else {
    bmiStopPanel.classList.add("hidden");
    normalContent.classList.remove("hidden");
  }

  const mNames = ["ЯНВ", "ФЕВ", "МАР", "АПР", "МАЙ", "ИЮН", "ИЮЛ", "АВГ", "СЕН", "ОКТ", "НОЯ", "ДЕК"];
  const dMinStr = `${plan.dateMin.getDate()} ${mNames[plan.dateMin.getMonth()]}`;
  const dMaxStr = `${plan.dateMax.getDate()} ${mNames[plan.dateMax.getMonth()]} ${plan.dateMax.getFullYear()}`;
  document.getElementById("projDateBadge").textContent = `ОРИЕНТИР: ${dMinStr} — ${dMaxStr}`;

  document.getElementById("projWeeksVal").textContent = `${plan.weeksMin}–${plan.weeksMax} НЕД`;
  document.getElementById("projRateVal").textContent = `${plan.rateCautiousKg}–${plan.rateRealisticKg} КГ/Н`;
  document.getElementById("projWaterVal").textContent = `${plan.waterLiters} Л/ДЕНЬ`;
  document.getElementById("projRateExplanation").textContent = plan.rateNote;

  document.getElementById("factLogsCount").textContent = `Замеров: ${state.logs.weight.length}`;
  if (plan.actualWeeklyRate) {
    document.getElementById("factTrendStatus").textContent =
      `По твоим замерам средний темп сейчас ≈ ${plan.actualWeeklyRate} кг/нед — прогноз скорректирован.`;
  }

  const totalKcalCalc = plan.proteinG * 4 + plan.fatsG * 9 + plan.carbsG * 4;
  const pPct = Math.round(((plan.proteinG * 4) / totalKcalCalc) * 100);
  const fPct = Math.round(((plan.fatsG * 9) / totalKcalCalc) * 100);
  const cPct = 100 - pPct - fPct;

  document.getElementById("macroRatioCode").textContent = `Б:${pPct}% / Ж:${fPct}% / У:${cPct}%`;
  document.getElementById("barP").style.width = `${pPct}%`;
  document.getElementById("barF").style.width = `${fPct}%`;
  document.getElementById("barC").style.width = `${cPct}%`;

  document.getElementById("outProtein").textContent = `${plan.proteinG} г`;
  document.getElementById("outProteinPerKg").textContent = `${(plan.proteinG / state.weight).toFixed(1)} г/кг`;
  document.getElementById("outFats").textContent = `${plan.fatsG} г`;
  document.getElementById("outFatsPerKg").textContent = `${(plan.fatsG / state.weight).toFixed(2)} г/кг`;
  document.getElementById("outCarbs").textContent = `${plan.carbsG} г`;
  document.getElementById("outCarbsKcal").textContent = `${plan.carbsG * 4} ккал`;

  drawRangeTrajectoryChart(state.weight, state.targetWeight, plan.weeksMin, plan.weeksMax);

  // Индекс Талия / Рост (WHtR — Ashwell et al., 2012)
  const whtr = Formulas.calcWaistToHeight({ waistCm: state.waist, heightCm: state.height });
  document.getElementById("outWhtrBadge").textContent = `КОЭФ: ${whtr.ratio}`;
  const diffNote =
    whtr.diffToAthletic > 0.5
      ? ` (до сухого V-силуэта убрать ≈ ${whtr.diffToAthletic} см в талии)`
      : "";
  document.getElementById("outWhtrStatus").textContent = `${whtr.statusText}${diffNote}`;
  document.getElementById("outAthleticWaist").textContent = `${whtr.athleticTargetCm} см`;
  document.getElementById("outHealthyWaist").textContent = `${whtr.healthyMaxCm} см`;

  document.getElementById("matrixKcalSpan").textContent = plan.targetKcal;
  renderNutritionMatrix();
  recalcSupplementsUI();
}

function drawRangeTrajectoryChart(startW, endW, weeksMin, weeksMax) {
  const container = document.getElementById("weightChartBox");
  const w = 380;
  const h = 130;
  const padX = 28;
  const padY = 24;

  const steps = 5;
  const fastPts = [];
  const slowPts = [];

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const xSlow = Math.round(padX + t * (w - padX * 2));
    const fastRatio = Math.min(1, t * (weeksMax / Math.max(1, weeksMin)));
    const easedFast = 1 - Math.pow(1 - fastRatio, 1.3);
    const easedSlow = 1 - Math.pow(1 - t, 1.15);

    const yFast = Math.round(padY + easedFast * (h - padY * 2));
    const ySlow = Math.round(padY + easedSlow * (h - padY * 2));
    const valSlow = +(startW + (endW - startW) * easedSlow).toFixed(1);
    const wk = Math.round(t * weeksMax);

    fastPts.push({ x: xSlow, y: yFast });
    slowPts.push({ x: xSlow, y: ySlow, val: valSlow, wk });
  }

  const fastLine = fastPts.map((p) => `${p.x},${p.y}`).join(" ");
  const slowLine = slowPts.map((p) => `${p.x},${p.y}`).join(" ");
  const corridorPolygon = [
    ...fastPts.map((p) => `${p.x},${p.y}`),
    ...[...slowPts].reverse().map((p) => `${p.x},${p.y}`)
  ].join(" ");

  const pal = getThemePalette();
  let labels = "";
  slowPts.forEach((p, idx) => {
    if (idx === 0 || idx === 2 || idx === steps) {
      labels += `
        <circle cx="${p.x}" cy="${p.y}" r="3.8" fill="${pal.accent}" stroke="#090A0D" stroke-width="1.5" />
        <text x="${p.x}" y="${p.y - 8}" fill="#F4F6F9" font-family="JetBrains Mono" font-size="9.5" text-anchor="middle">${p.val} кг</text>
        <text x="${p.x}" y="${h - 2}" fill="#8A7E86" font-family="JetBrains Mono" font-size="8.5" text-anchor="middle">Нед ${p.wk}</text>
      `;
    }
  });

  container.innerHTML = `
    <svg viewBox="0 0 ${w} ${h}" width="100%" height="100%">
      <polygon points="${corridorPolygon}" fill="${pal.fill}" />
      <polyline fill="none" stroke="${pal.bright}" stroke-width="1.6" stroke-dasharray="4,3" points="${fastLine}" />
      <polyline fill="none" stroke="${pal.accent}" stroke-width="2.4" points="${slowLine}" />
      ${labels}
    </svg>
  `;
}

/**
 * МОДУЛЬ 2: СИЛА — СВОЙ ВЕС (КАЛИСТЕНИКА) + ШТАНГА (1ПМ)
 */
function initStrengthControls() {
  document.querySelectorAll("#strengthModeSwitch .mode-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      switchStrengthMode(btn.dataset.mode);
    });
  });

  document.querySelectorAll("#bwExerciseSelector .lift-tab").forEach((btn) => {
    btn.addEventListener("click", () => {
      selectBwExercise(btn.dataset.ex);
    });
  });

  document.getElementById("inPushupKnees").addEventListener("change", (e) => {
    state.pushupKnees = e.target.checked;
    recalcBodyweight();
  });

  document.getElementById("saveBwResultBtn").addEventListener("click", () => {
    const ex = state.bwExercise;
    if (!state.logs[ex]) state.logs[ex] = [];
    state.logs[ex].push({
      date: new Date().toISOString(),
      value: state.bwValue
    });
    saveUserState();
    recalcBodyweight();
    renderLogsView();
    if (tg && tg.HapticFeedback) tg.HapticFeedback.notificationOccurred("success");
  });

  document.querySelectorAll("#liftSelector .lift-tab").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll("#liftSelector .lift-tab").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      state.lift = btn.dataset.lift;

      const isWeightedCal = state.lift === "pullup" || state.lift === "dips_w";
      document.getElementById("barbellWeightLabel").textContent = isWeightedCal
        ? "Дополнительный вес на поясе (кг)"
        : "Рабочий вес штанги (кг)";

      if (isWeightedCal && state.liftKg > 60) {
        state.liftKg = 20;
        const lInput = document.getElementById("inLiftKg");
        lInput.value = 20;
        updateSliderFill(lInput);
        document.getElementById("valLiftKg").textContent = "20.0";
      }
      recalcStrength();
    });
  });

  document.getElementById("saveBarbellResultBtn").addEventListener("click", () => {
    if (!state.lastBarbellEval) return;
    state.logs.barbell_1rm.push({
      date: new Date().toISOString(),
      value: state.lastBarbellEval.external1RM,
      lift: state.lift
    });
    saveUserState();
    renderLogsView();
    if (tg && tg.HapticFeedback) tg.HapticFeedback.notificationOccurred("success");
  });
}

function switchStrengthMode(mode) {
  state.strengthMode = mode;
  document.querySelectorAll("#strengthModeSwitch .mode-btn").forEach((b) => {
    b.classList.toggle("active", b.dataset.mode === mode);
  });
  document.getElementById("strengthSubBw").classList.toggle("hidden", mode !== "bw");
  document.getElementById("strengthSubBarbell").classList.toggle("hidden", mode !== "barbell");
}

function selectBwExercise(exKey) {
  state.bwExercise = exKey;
  document.querySelectorAll("#bwExerciseSelector .lift-tab").forEach((b) => {
    b.classList.toggle("active", b.dataset.ex === exKey);
  });

  const meta = BW_EXERCISE_META[exKey] || BW_EXERCISE_META.pushups;
  const input = document.getElementById("inBwValue");
  input.min = meta.min;
  input.max = meta.max;
  input.step = meta.step;
  input.value = meta.defaultVal;
  state.bwValue = meta.defaultVal;
  updateSliderFill(input);

  document.getElementById("bwInputLabel").textContent = meta.label;
  document.getElementById("valBwInput").textContent = meta.defaultVal;
  document.getElementById("valBwUnit").textContent = meta.unit;

  document.getElementById("pushupKneeRow").classList.toggle("hidden", exKey !== "pushups");
  document.getElementById("bwStopwatchWidget").classList.toggle("hidden", !meta.hasTimer);
  document.getElementById("srtInstructionBox").classList.toggle("hidden", exKey !== "srt");

  recalcBodyweight();
}

function recalcBodyweight() {
  const res = Formulas.evaluateBodyweightExercise({
    exercise: state.bwExercise,
    value: state.bwValue,
    gender: state.gender,
    age: state.age,
    weight: state.weight,
    kneeVariant: state.pushupKnees
  });
  state.lastBwEval = res;

  const meta = BW_EXERCISE_META[state.bwExercise];
  document.getElementById("bwResultHeaderTitle").textContent = meta.title.toUpperCase();
  document.getElementById("bwOutLevelBadge").textContent = `УРОВЕНЬ: ${res.levelName.toUpperCase()}`;
  document.getElementById("bwOutMainVal").innerHTML = `${state.bwValue} <small>${meta.unit.toUpperCase()}</small>`;

  if (res.nextTierName) {
    document.getElementById("bwOutNextGoal").textContent =
      `Следующая цель: до уровня «${res.nextTierName}» тебе +${res.deltaToNext} ${meta.unit}`;
  } else {
    document.getElementById("bwOutNextGoal").textContent = "Ты достиг высшего ориентира в этом тесте!";
  }

  // Обновляем 4-ступенчатую лестницу порогов
  const ladder = document.getElementById("bwTierLadder");
  if (res.thresholds) {
    const [t1, t2, t3] = res.thresholds;
    document.getElementById("tlVal0").textContent = `<${t1}`;
    document.getElementById("tlVal1").textContent = `${t1}+`;
    document.getElementById("tlVal2").textContent = `${t2}+`;
    document.getElementById("tlVal3").textContent = `${t3}+`;
  } else {
    document.getElementById("tlVal0").textContent = `<6.0`;
    document.getElementById("tlVal1").textContent = `6.0+`;
    document.getElementById("tlVal2").textContent = `8.0+`;
    document.getElementById("tlVal3").textContent = `9.5+`;
  }

  let activeTierIdx = 0;
  if (res.levelName.includes("Элита")) activeTierIdx = 3;
  else if (res.levelName.includes("Атлет")) activeTierIdx = 2;
  else if (res.levelName.includes("Любитель")) activeTierIdx = 1;

  ladder.querySelectorAll(".tl-step").forEach((stepEl, idx) => {
    stepEl.classList.toggle("passed", idx < activeTierIdx);
    stepEl.classList.toggle("current", idx === activeTierIdx);
  });

  document.getElementById("bwOutSpectrumBar").style.width = `${res.progressPct}%`;

  const kinBox = document.getElementById("bwKineticBox");
  if (res.equivalentKgText) {
    kinBox.classList.remove("hidden");
    kinBox.textContent = res.equivalentKgText;
  } else if (res.clinicalNote) {
    kinBox.classList.remove("hidden");
    kinBox.textContent = res.clinicalNote;
  } else {
    kinBox.classList.add("hidden");
  }

  document.getElementById("bwSourceNote").textContent = res.sourceText;

  const hist = state.logs[state.bwExercise] || [];
  const cmpEl = document.getElementById("bwCompareBadge");
  if (hist.length >= 1) {
    const firstVal = hist[0].value;
    if (firstVal > 0 && state.bwValue !== firstVal) {
      const diffPct = Math.round(((state.bwValue - firstVal) / firstVal) * 100);
      const sign = diffPct > 0 ? `+${diffPct}%` : `${diffPct}%`;
      cmpEl.classList.remove("hidden");
      cmpEl.textContent = `Динамика: было ${firstVal} → сейчас ${state.bwValue} (${sign})`;
    } else {
      cmpEl.classList.add("hidden");
    }
  } else {
    cmpEl.classList.add("hidden");
  }

  // Сохраняем процент выполнения для 5-осевого Радара баланса тела
  state.bwScoresByEx[state.bwExercise] = res.progressPct;
  renderProgressionAndRadar(meta);
}

function renderProgressionAndRadar(meta) {
  // 1. 4-недельный план прогрессии под текущий максимум
  const prog = Formulas.buildProgressionPlan({
    exercise: state.bwExercise,
    currentMax: state.bwValue,
    unit: meta.unit
  });
  document.getElementById("progPlanTitle").textContent = prog.title.toUpperCase();
  const listEl = document.getElementById("progWeeksList");
  listEl.innerHTML = prog.weeks
    .map(
      (item) => `
      <div class="prog-week-item">
        <div class="pw-title">${item.wk}</div>
        <div class="pw-desc">${item.scheme}</div>
      </div>
    `
    )
    .join("");

  // 2. 5-осевой SVG Радар Баланса Тела
  const axes = [
    { name: "ЖИМ", val: Math.max(state.bwScoresByEx.pushups, state.bwScoresByEx.dips) },
    { name: "ТЯГА", val: state.bwScoresByEx.pullups },
    { name: "ХВАТ", val: state.bwScoresByEx.hang },
    { name: "КОР", val: state.bwScoresByEx.plank },
    { name: "НОГИ", val: Math.max(state.bwScoresByEx.squats60, state.bwScoresByEx.wallsit, state.bwScoresByEx.srt) }
  ];

  const cx = 115, cy = 102, maxR = 68;
  const angleFor = (idx) => -Math.PI / 2 + (idx * 2 * Math.PI) / 5;

  const ringPolys = [0.35, 0.68, 1.0]
    .map((scale) => {
      const pts = axes
        .map((_, idx) => {
          const a = angleFor(idx);
          return `${(cx + Math.cos(a) * maxR * scale).toFixed(1)},${(cy + Math.sin(a) * maxR * scale).toFixed(1)}`;
        })
        .join(" ");
      return `<polygon points="${pts}" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="1"/>`;
    })
    .join("");

  const axisLinesAndLabels = axes
    .map((ax, idx) => {
      const a = angleFor(idx);
      const xEnd = (cx + Math.cos(a) * maxR).toFixed(1);
      const yEnd = (cy + Math.sin(a) * maxR).toFixed(1);
      const xLbl = (cx + Math.cos(a) * (maxR + 22)).toFixed(1);
      const yLbl = (cy + Math.sin(a) * (maxR + 16) + 3).toFixed(1);
      return `
        <line x1="${cx}" y1="${cy}" x2="${xEnd}" y2="${yEnd}" stroke="rgba(255,255,255,0.08)" stroke-width="1"/>
        <text x="${xLbl}" y="${yLbl}" fill="#929AA8" font-family="JetBrains Mono" font-size="9" font-weight="700" text-anchor="middle">${ax.name}</text>
      `;
    })
    .join("");

  const userPts = axes.map((ax, idx) => {
    const a = angleFor(idx);
    const r = (Math.max(15, ax.val) / 100) * maxR;
    return {
      x: +(cx + Math.cos(a) * r).toFixed(1),
      y: +(cy + Math.sin(a) * r).toFixed(1)
    };
  });

  const pal = getThemePalette();
  const userPoly = userPts.map((p) => `${p.x},${p.y}`).join(" ");
  const userDots = userPts.map((p) => `<circle cx="${p.x}" cy="${p.y}" r="3.5" fill="${pal.accent}" />`).join("");

  document.getElementById("athleticRadarBox").innerHTML = `
    <svg viewBox="0 0 230 205" width="230" height="205">
      ${ringPolys}
      ${axisLinesAndLabels}
      <polygon points="${userPoly}" fill="${pal.fill}" stroke="${pal.accent}" stroke-width="2" />
      ${userDots}
    </svg>
  `;

  const sorted = [...axes].sort((a, b) => b.val - a.val);
  const strongest = sorted[0];
  const weakest = sorted[sorted.length - 1];
  document.getElementById("radarVerdictText").textContent =
    `Ведущее качество: ${strongest.name} (${strongest.val}%). Точка роста для симметрии: ${weakest.name} (${weakest.val}%).`;
}

function recalcStrength() {
  const res = Formulas.calcOneRepMax({
    lift: state.lift,
    liftKg: state.liftKg,
    liftReps: state.liftReps,
    bodyWeight: state.weight,
    gender: state.gender
  });
  state.lastBarbellEval = res;

  document.getElementById("outStrengthClass").textContent = `УРОВЕНЬ: ${res.levelName.toUpperCase()}`;

  const warnBox = document.getElementById("highRepsWarningBox");
  if (res.highRepsWarning) {
    warnBox.classList.remove("hidden");
    warnBox.textContent = res.highRepsWarning;
  } else {
    warnBox.classList.add("hidden");
  }

  if (res.isWeightedCalisthenics) {
    document.getElementById("out1RM").innerHTML =
      `+${res.external1RM.toFixed(1)} <small>КГ НА ПОЯСЕ</small>`;
    document.getElementById("out1RMSubDetail").textContent =
      `Суммарный 1ПМ (вес тела + доп. вес): ${res.meanSystem1RM.toFixed(1)} кг • ${res.formulaCaption}`;
  } else {
    document.getElementById("out1RM").innerHTML = `${res.external1RM.toFixed(1)} <small>КГ</small>`;
    document.getElementById("out1RMSubDetail").textContent =
      `${res.formulaCaption} (Эпли: ${res.epley1RM} кг / Бжицки: ${res.brzycki1RM} кг)`;
  }

  const nextGoalStr = res.nextLevelName
    ? ` • До уровня «${res.nextLevelName}»: +${res.kgToNextTier} кг`
    : "";
  document.getElementById("outBwRatio").textContent =
    `${res.percentileText} (${res.ratio}x от веса)${nextGoalStr}`;
  document.getElementById("outSpectrumBar").style.width = `${res.barW}%`;
  document.getElementById("outPercentileSourceNote").textContent = res.percentileSourceNote;

  const zones = [
    { label: "92% • 3 ПОВТ", pct: 0.92 },
    { label: "86% • 5 ПОВТ", pct: 0.86 },
    { label: "80% • 8 ПОВТ", pct: 0.80 },
    { label: "75% • 10 ПОВТ", pct: 0.75 },
    { label: "70% • 12 ПОВТ", pct: 0.70 },
    { label: "65% • 15 ПОВТ", pct: 0.65 }
  ];

  const zList = document.getElementById("zonesList");
  zList.innerHTML = "";
  zones.forEach((z) => {
    const base1RM = res.isWeightedCalisthenics ? res.meanSystem1RM : res.external1RM;
    const rawLoad = base1RM * z.pct;
    const displayKg = res.isWeightedCalisthenics
      ? `+${Math.max(0, +(rawLoad - state.weight).toFixed(1))} кг`
      : `${(Math.round(rawLoad / 2.5) * 2.5).toFixed(1)} кг`;
    const div = document.createElement("div");
    div.className = "zone-cell";
    div.innerHTML = `<span class="z-meta mono">${z.label}</span><span class="z-kg mono">${displayKg}</span>`;
    zList.appendChild(div);
  });

  const cb = Formulas.calcCaseyButtPotential({
    heightCm: state.height,
    wristCm: state.wrist,
    ankleCm: state.ankle
  });
  document.getElementById("outMaxWeight").textContent = `${cb.maxWeightKg} кг`;
  document.getElementById("outMaxChest").textContent = `${cb.maxChestCm} см`;
  document.getElementById("outMaxBicep").textContent = `${cb.maxBicepCm} см`;
  document.getElementById("outMaxThigh").textContent = `${cb.maxThighCm} см`;
}

/**
 * МОДУЛЬ 3: ПРОТОКОЛ И ДОБАВКИ С ПРЕДОХРАНИТЕЛЯМИ
 */
function initNutritionControls() {
  document.getElementById("cycleMatrixBtn").addEventListener("click", () => {
    state.matrixSetIdx = (state.matrixSetIdx + 1) % 3;
    renderNutritionMatrix();
  });

  document.querySelectorAll(".contra-cb").forEach((cb) => {
    cb.addEventListener("change", () => {
      const anyChecked = Array.from(document.querySelectorAll(".contra-cb")).some((el) => el.checked);
      state.hasCaffeineContra = anyChecked;
      recalcSupplementsUI();
    });
  });
}

function recalcSupplementsUI() {
  const supp = Formulas.calcSupplements({
    weightKg: state.weight,
    age: state.age,
    hasContraindications: state.hasCaffeineContra
  });

  document.getElementById("outCreatineBox").textContent = supp.creatineText;
  document.getElementById("outCaffeineBox").textContent = supp.caffeineText;
}

function renderNutritionMatrix() {
  const scale = state.kcal / 2140;
  const sets = [
    [
      { name: "Филе грудки индейки / цыплёнка", sub: "Белковая основа (вес в сыром виде)", base: 420, unit: "г" },
      { name: "Крупа гречневая / Овсяные хлопья", sub: "Сложные углеводы (в сухом виде)", base: 165, unit: "г" },
      { name: "Яйцо куриное С1", sub: "Завтрак / источник жиров и белка", base: 3, unit: "шт" },
      { name: "Творог 5%", sub: "Вечерний приём белка", base: 200, unit: "г" },
      { name: "Масло оливковое / Орехи", sub: "Ненасыщенные жирные кислоты", base: 35, unit: "г" }
    ],
    [
      { name: "Постная говядина / Белая рыба", sub: "Белковая основа (вес в сыром виде)", base: 410, unit: "г" },
      { name: "Рис Басмати / Паста из тв. сортов", sub: "Сложные углеводы (в сухом виде)", base: 170, unit: "г" },
      { name: "Яйцо куриное + Сыр лёгкий", sub: "Завтрак", base: 3, unit: "шт" },
      { name: "Греческий йогурт / Скир", sub: "Перекус", base: 240, unit: "г" },
      { name: "Авокадо / Грецкий орех", sub: "Жировой компонент", base: 65, unit: "г" }
    ],
    [
      { name: "Филе бедра индейки / Треска", sub: "Белковая основа (вес в сыром виде)", base: 400, unit: "г" },
      { name: "Булгур / Киноа (сухой вес)", sub: "Сложные углеводы", base: 165, unit: "г" },
      { name: "Творог 2–5% + Ягоды", sub: "Перекус / ужин", base: 220, unit: "г" },
      { name: "Яйца куриные", sub: "Завтрак", base: 3, unit: "шт" },
      { name: "Арахисовая паста / Тёмный шоколад", sub: "Жировой компонент", base: 35, unit: "г" }
    ]
  ];

  const list = document.getElementById("rationTable");
  list.innerHTML = "";
  sets[state.matrixSetIdx].forEach((item) => {
    const val =
      item.unit === "шт"
        ? Math.max(2, Math.round(item.base * scale))
        : Math.round((item.base * scale) / 10) * 10;
    const row = document.createElement("div");
    row.className = "ration-row";
    row.innerHTML = `
      <div>
        <div class="r-name">${item.name}</div>
        <div class="r-sub">${item.sub}</div>
      </div>
      <div class="r-weight mono">${val} ${item.unit}</div>
    `;
    list.appendChild(row);
  });
}

/**
 * МОДУЛЬ 4: МОИ ЗАМЕРЫ И НАПОМИНАНИЕ ЧЕРЕЗ 28 ДНЕЙ
 */
function initLogsAndReminderControls() {
  document.getElementById("logMetricSelect").addEventListener("change", renderLogsView);

  document.getElementById("clearLogsBtn").addEventListener("click", () => {
    const metric = document.getElementById("logMetricSelect").value;
    state.logs[metric] = [];
    saveUserState();
    renderLogsView();
  });

  document.getElementById("schedule28DaysBtn").addEventListener("click", () => {
    const targetDate = new Date(Date.now() + 28 * 24 * 3600 * 1000);
    const formatted = targetDate.toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" });
    state.nextReminderDate = formatted;
    saveUserState();

    if (tg && tg.requestWriteAccess) {
      tg.requestWriteAccess((allowed) => {
        if (allowed) {
          document.getElementById("reminderStatusText").textContent =
            `Разрешение получено. Следующий контрольный замер назначен на ${formatted} (через 28 дней).`;
        } else {
          document.getElementById("reminderStatusText").textContent =
            `Ориентир следующего замера: ${formatted} (сохрани дату в календарь).`;
        }
      });
    } else {
      document.getElementById("reminderStatusText").textContent =
        `Контрольная дата следующего замера (через 28 дней): ${formatted}.`;
    }
  });
}

function renderLogsView() {
  const metric = document.getElementById("logMetricSelect").value;
  const entries = state.logs[metric] || [];
  const histEl = document.getElementById("logsHistoryList");
  const cmpBanner = document.getElementById("logComparisonBanner");
  const chartBox = document.getElementById("logsChartBox");

  if (state.nextReminderDate) {
    document.getElementById("reminderStatusText").textContent =
      `Запланированный замер через 4 недели: ${state.nextReminderDate}`;
  }

  if (entries.length === 0) {
    cmpBanner.classList.add("hidden");
    chartBox.innerHTML = `<div style="height:100%;display:flex;align-items:center;justify-content:center;color:var(--text-dim);font-size:11.5px;text-align:center;">Пока нет сохранённых замеров по этому тесту.<br>Нажми «+ В мои замеры» после расчёта.</div>`;
    histEl.innerHTML = "";
    return;
  }

  if (entries.length >= 2) {
    const first = entries[0].value;
    const last = entries[entries.length - 1].value;
    const diffPct = first > 0 ? Math.round(((last - first) / first) * 100) : 0;
    const sign = diffPct > 0 ? `+${diffPct}%` : `${diffPct}%`;
    cmpBanner.classList.remove("hidden");
    cmpBanner.textContent = `Прогресс: было ${first} → стало ${last} (${sign})`;
  } else {
    cmpBanner.classList.add("hidden");
  }

  const vals = entries.map((e) => e.value);
  const minV = Math.min(...vals);
  const maxV = Math.max(...vals);
  const span = Math.max(1, maxV - minV);
  const w = 380, h = 120, padX = 28, padY = 22;

  const pts = entries.map((e, idx) => {
    const x = entries.length === 1 ? w / 2 : Math.round(padX + (idx / (entries.length - 1)) * (w - padX * 2));
    const y = Math.round(h - padY - ((e.value - minV) / span) * (h - padY * 2));
    return { x, y, val: e.value, d: new Date(e.date).toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" }) };
  });

  const pal = getThemePalette();
  const poly = pts.map((p) => `${p.x},${p.y}`).join(" ");
  const circles = pts
    .map(
      (p) => `
      <circle cx="${p.x}" cy="${p.y}" r="3.8" fill="${pal.accent}" />
      <text x="${p.x}" y="${p.y - 7}" fill="#F4F6F9" font-family="JetBrains Mono" font-size="9.5" text-anchor="middle">${p.val}</text>
      <text x="${p.x}" y="${h - 2}" fill="#8A7E86" font-family="JetBrains Mono" font-size="8.5" text-anchor="middle">${p.d}</text>
    `
    )
    .join("");

  chartBox.innerHTML = `
    <svg viewBox="0 0 ${w} ${h}" width="100%" height="100%">
      ${pts.length > 1 ? `<polyline fill="none" stroke="${pal.accent}" stroke-width="2.2" points="${poly}" />` : ""}
      ${circles}
    </svg>
  `;

  histEl.innerHTML = [...entries]
    .reverse()
    .slice(0, 8)
    .map((e) => {
      const d = new Date(e.date).toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" });
      return `<div class="log-item-row"><span class="mono" style="color:var(--text-secondary)">${d}</span><strong class="mono">${e.value}</strong></div>`;
    })
    .join("");
}

/**
 * МОДУЛЬ 5: ЭКРАН ИСТОЧНИКОВ
 */
function renderScientificSources() {
  const container = document.getElementById("scientificSourcesList");
  container.innerHTML = "";

  Formulas.REFERENCES.forEach((ref) => {
    const card = document.createElement("div");
    card.className = "source-card";
    card.innerHTML = `
      <div class="sc-short">${ref.short} ↗</div>
      <div class="sc-title">${ref.title}</div>
      <div class="sc-used">${ref.usedFor}</div>
    `;
    card.addEventListener("click", () => {
      if (tg && tg.openLink) {
        tg.openLink(ref.url);
      } else {
        window.open(ref.url, "_blank");
      }
    });
    container.appendChild(card);
  });
}

/**
 * ПРИВАТНОСТЬ И КАРТОЧКА РЕЗУЛЬТАТА ДЛЯ ШАРИНГА (С ИНЖЕНЕРНОЙ СЕТКОЙ)
 */
function initPrivacyAndShareModals() {
  const privModal = document.getElementById("privacyModal");
  document.getElementById("openPrivacyBtn").addEventListener("click", () => {
    privModal.classList.remove("hidden");
  });
  document.getElementById("closePrivacyModalBtn").addEventListener("click", () => {
    localStorage.setItem("ir_privacy_seen", "1");
    privModal.classList.add("hidden");
  });

  const shareModal = document.getElementById("shareCardModal");
  document.getElementById("shareBwCardBtn").addEventListener("click", () => {
    generateShareCanvasCard();
    shareModal.classList.remove("hidden");
  });
  document.getElementById("closeShareModalBtn").addEventListener("click", () => {
    shareModal.classList.add("hidden");
  });

  document.getElementById("downloadShareImgBtn").addEventListener("click", () => {
    const canvas = document.getElementById("shareCanvas");
    const link = document.createElement("a");
    link.download = `inzhener-reliefa-${state.bwExercise}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  });

  document.getElementById("shareToStoryBtn").addEventListener("click", () => {
    const canvas = document.getElementById("shareCanvas");
    const dataUrl = canvas.toDataURL("image/png");
    const meta = BW_EXERCISE_META[state.bwExercise];
    const evalRes = state.lastBwEval;
    const shareText = `${meta.title}: ${state.bwValue} ${meta.unit} · уровень ${evalRes.levelName}${
      evalRes.nextTierName ? ` · до ${evalRes.nextTierName} +${evalRes.deltaToNext}` : ""
    } — проверено в «Инженер Рельефа»`;

    if (tg && tg.shareToStory) {
      try {
        tg.shareToStory(dataUrl, { text: shareText });
        return;
      } catch (e) {}
    }
    if (navigator.share) {
      canvas.toBlob((blob) => {
        const file = new File([blob], "result.png", { type: "image/png" });
        navigator.share({ title: CONFIG.channelBrand, text: shareText, files: [file] }).catch(() => {});
      });
    } else if (tg && tg.openTelegramLink) {
      tg.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(window.location.href)}&text=${encodeURIComponent(shareText)}`);
    }
  });
}

function generateShareCanvasCard() {
  const canvas = document.getElementById("shareCanvas");
  const ctx = canvas.getContext("2d");
  const meta = BW_EXERCISE_META[state.bwExercise];
  const res = state.lastBwEval;
  const pal = getThemePalette();

  ctx.fillStyle = pal.bgHeader;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = pal.accent;
  ctx.lineWidth = 4;
  ctx.strokeRect(48, 48, canvas.width - 96, canvas.height - 96);

  ctx.fillStyle = pal.bright;
  ctx.font = "700 30px 'Unbounded', sans-serif";
  ctx.fillText("КАЛИСТЕНИКА И БИОМЕТРИЯ ТЕЛА", 96, 145);

  ctx.fillStyle = "#F7F5F6";
  ctx.font = "700 60px 'Unbounded', sans-serif";
  ctx.fillText(meta.title, 96, 255);

  ctx.fillStyle = pal.accent;
  ctx.font = "800 175px 'Unbounded', sans-serif";
  ctx.fillText(`${state.bwValue} ${meta.unit}`, 96, 485);

  const summaryLine = `Уровень: ${res.levelName}${
    res.nextTierName ? `  ·  до ${res.nextTierName}: +${res.deltaToNext} ${meta.unit}` : ""
  }`;
  ctx.fillStyle = "#F7F5F6";
  ctx.font = "600 40px 'Manrope', sans-serif";
  ctx.fillText(summaryLine, 96, 605);

  if (res.equivalentKgText) {
    ctx.fillStyle = "#A89FA5";
    ctx.font = "500 30px 'Manrope', sans-serif";
    ctx.fillText(res.equivalentKgText.slice(0, 62), 96, 685);
  }

  ctx.fillStyle = pal.track;
  ctx.fillRect(96, 790, canvas.width - 192, 24);
  ctx.fillStyle = pal.accent;
  ctx.fillRect(96, 790, ((canvas.width - 192) * res.progressPct) / 100, 24);

  ctx.fillStyle = pal.track;
  ctx.fillRect(96, 880, canvas.width - 192, 160);

  ctx.fillStyle = "#D4C8D0";
  ctx.font = "600 24px 'JetBrains Mono', monospace";
  ctx.fillText(`ВЕС ТЕЛА: ${state.weight} КГ   ·   СУХАЯ МАССА: ${(state.weight * (1 - state.bf / 100)).toFixed(1)} КГ`, 130, 972);

  ctx.fillStyle = pal.accent;
  ctx.font = "700 44px 'Unbounded', sans-serif";
  ctx.fillText("ИНЖЕНЕР РЕЛЬЕФА", 96, 1170);

  ctx.fillStyle = "#A89FA5";
  ctx.font = "500 28px 'Manrope', sans-serif";
  ctx.fillText("Доказательная калистеника и цифровая раскладка тела в Telegram", 96, 1225);
}

/**
 * ПРОВЕРКА ЗАЯВКИ В ЗАКРЫТЫЙ КАНАЛ
 */
function triggerJoinChannel() {
  state.joinClickedAt = Date.now();
  const err = document.getElementById("gateError1");
  if (err) err.classList.add("hidden");

  const targetUrl = state.customChannelUrl || CONFIG.channelInviteUrl;
  if (tg && tg.openTelegramLink && targetUrl.startsWith("https://t.me/")) {
    tg.openTelegramLink(targetUrl);
  } else {
    window.open(targetUrl, "_blank", "noopener,noreferrer");
  }
}

function triggerVerifyAccess() {
  syncAdminConfigFromBot(() => {
    const elapsedSec = state.joinClickedAt > 0 ? (Date.now() - state.joinClickedAt) / 1000 : 0;
    // Пускаем в расчёты сразу, как только человек подал заявку (даже пока заявка просто висит непринятой!)
    if (checkIsUserVerifiedInChannel() || elapsedSec >= CONFIG.minSecondsAway) {
      unlockAll();
    } else {
      document.querySelectorAll(".gate-error, .gate-toast").forEach((err) => {
        err.textContent = "Сначала нажми кнопку «1. Подать заявку в закрытый канал» и отправь заявку в Telegram.";
        err.classList.remove("hidden");
      });
      if (tg && tg.HapticFeedback) tg.HapticFeedback.notificationOccurred("error");
    }
  });
}

function unlockAll() {
  state.unlocked = true;
  localStorage.setItem("ir_join_request_sent", "1");
  syncGateUI();
  if (tg && tg.HapticFeedback) tg.HapticFeedback.notificationOccurred("success");
}

function syncGateUI() {
  const dot = document.getElementById("statusDot");
  const userBadge = document.getElementById("userAccessBadge");

  const bodies = [
    document.getElementById("bodyMetabolic"),
    document.getElementById("bodyStrengthBw"),
    document.getElementById("bodyStrengthBarbell"),
    document.getElementById("bodyNutrition")
  ];
  const modals = [
    document.getElementById("overlayMetabolic"),
    document.getElementById("overlayStrengthBw"),
    document.getElementById("overlayStrengthBarbell"),
    document.getElementById("overlayNutrition")
  ];

  if (state.unlocked) {
    if (dot) dot.classList.add("unlocked");
    if (userBadge) {
      userBadge.classList.add("unlocked");
      if (state.isAdmin) {
        userBadge.style.cursor = "pointer";
        userBadge.title = "Нажми, чтобы посмотреть глазами обычного пользователя (с замками)";
        userBadge.textContent = "АДМИН · ОТКРЫТО ⇄";
      } else {
        userBadge.textContent = "ДОСТУП ОТКРЫТ";
      }
    }
    bodies.forEach((b) => b && b.classList.remove("locked"));
    modals.forEach((m) => m && m.classList.add("hidden"));
  } else {
    if (dot) dot.classList.remove("unlocked");
    if (userBadge) {
      userBadge.classList.remove("unlocked");
      if (state.isAdmin) {
        userBadge.style.cursor = "pointer";
        userBadge.title = "Нажми, чтобы вернуться в режим Админа (без замков)";
        userBadge.textContent = "ТЕСТ ЮЗЕРА · ЗАКРЫТО ⇄";
      } else {
        userBadge.textContent = "ДОСТУП ЗАКРЫТ";
      }
    }
    bodies.forEach((b) => b && b.classList.add("locked"));
    modals.forEach((m) => m && m.classList.remove("hidden"));
  }
}
