/**
 * ============================================================================
 * НАУЧНЫЙ МОДУЛЬ РАСЧЕТОВ — «ИНЖЕНЕР РЕЛЬЕФА» (formulas.js)
 * Все формулы снабжены ссылками на рецензируемые публикации и руководства.
 * ============================================================================
 */

window.Formulas = (function () {
  /**
   * 1. СПИСОК НАУЧНЫХ ИСТОЧНИКОВ (для экрана «Источники»)
   */
  const REFERENCES = [
    {
      id: "mifflin1990",
      short: "Mifflin et al., 1990 (AJCN)",
      title: "A new predictive equation for resting energy expenditure in healthy individuals",
      journal: "American Journal of Clinical Nutrition, 51(2), 241–247",
      url: "https://doi.org/10.1093/ajcn/51.2.241",
      usedFor: "Расчёт базового обмена (BMR) по весу, росту, возрасту и полу"
    },
    {
      id: "cunningham1991",
      short: "Katch-McArdle / Cunningham, 1991",
      title: "Body composition as a determinant of energy expenditure: a synthetic review and a proposed general prediction equation",
      journal: "American Journal of Clinical Nutrition, 54(6), 963–969",
      url: "https://doi.org/10.1093/ajcn/54.6.963",
      usedFor: "Уточнение BMR с учётом сухой безжировой массы тела (LBM)"
    },
    {
      id: "helms2014",
      short: "Helms et al., 2014 (JISSN)",
      title: "Evidence-based recommendations for natural bodybuilding contest preparation: nutrition and supplementation",
      journal: "Journal of the International Society of Sports Nutrition, 11:20",
      url: "https://doi.org/10.1186/1550-2783-11-20",
      usedFor: "Безопасные рамки темпа снижения веса (0,5–1,0% массы тела в неделю) для сохранения мышц"
    },
    {
      id: "kerksick2018",
      short: "Kerksick et al., 2018 (ISSN Position Stand)",
      title: "ISSN exercise & sports nutrition review update: research & recommendations",
      journal: "Journal of the International Society of Sports Nutrition, 15:38",
      url: "https://doi.org/10.1186/s12970-018-0242-y",
      usedFor: "Распределение макронутриентов (БЖУ) и ориентир темпа набора массы (0,25–0,5% в неделю)"
    },
    {
      id: "ebben2011",
      short: "Ebben et al., 2011 (JSCR)",
      title: "Kinetic analysis of several variations of push-ups",
      journal: "Journal of Strength and Conditioning Research, 25(10), 2891–2894",
      url: "https://doi.org/10.1519/JSC.0b013e31820c8587",
      usedFor: "Эквивалент нагрузки в отжиманиях (≈64% массы тела в классических, ≈49% с колен)"
    },
    {
      id: "acsm_csep",
      short: "ACSM / CSEP Push-Up Norms",
      title: "ACSM's Guidelines for Exercise Testing and Prescription (11th Ed., Canadian Society for Exercise Physiology protocol)",
      journal: "American College of Sports Medicine",
      url: "https://www.acsm.org/education-resources/books/guidelines-exercise-testing-prescription",
      usedFor: "Возрастно-половые нормативы теста отжиманий от пола"
    },
    {
      id: "araujo2012",
      short: "Araújo et al., 2012 (EJPC)",
      title: "Ability to sit and rise from the floor as a predictor of all-cause mortality",
      journal: "European Journal of Preventive Cardiology, 21(7), 892–898",
      url: "https://doi.org/10.1177/2047487312471759",
      usedFor: "Тест «Сесть-встать с пола» (Sitting-Rising Test, 0–10 баллов)"
    },
    {
      id: "epley_brzycki",
      short: "Epley (1985) & Brzycki (1993) / LeSuer et al., 1997",
      title: "The Accuracy of Prediction Equations for Estimating 1-RM Performance in the Bench Press, Squat, and Deadlift",
      journal: "Journal of Strength and Conditioning Research, 11(4), 211–213",
      url: "https://doi.org/10.1519/1533-4287(1997)011<0211:TAOPEF>2.3.CO;2",
      usedFor: "Расчёт 1ПМ по формуле Эпли и Бжицки и ограничение точности свыше 10 повторений"
    },
    {
      id: "casey_butt",
      short: "Casey Butt, PhD (2009)",
      title: "Your Maximum Muscular Bodyweight and Measurements (Anthropometric model of natural athletes)",
      journal: "The WeighTrainer Anthropometric Database",
      url: "https://www.weightrainer.net/maximum_bodypred.html",
      usedFor: "Оценка антропометрического потенциала мышц по росту, запястью и лодыжке"
    },
    {
      id: "guest2021",
      short: "Guest et al., 2021 (ISSN Caffeine)",
      title: "International society of sports nutrition position stand: caffeine and exercise performance",
      journal: "Journal of the International Society of Sports Nutrition, 18:1",
      url: "https://doi.org/10.1186/s12970-020-00383-4",
      usedFor: "Эргогенная дозировка кофеина 3–6 мг/кг за 30–60 минут до нагрузки"
    },
    {
      id: "efsa2015",
      short: "EFSA NDA Panel, 2015",
      title: "Scientific Opinion on the safety of caffeine",
      journal: "EFSA Journal, 13(5):4102",
      url: "https://doi.org/10.2903/j.efsa.2015.4102",
      usedFor: "Безопасный верхний предел кофеина для здоровых взрослых (не более 400 мг/сут суммарно)"
    },
    {
      id: "kreider2017",
      short: "Kreider et al., 2017 (ISSN Creatine)",
      title: "International Society of Sports Nutrition position stand: safety and efficacy of creatine supplementation",
      journal: "Journal of the International Society of Sports Nutrition, 14:18",
      url: "https://doi.org/10.1186/s12970-017-0173-z",
      usedFor: "Поддерживающая дозировка креатина моногидрата 3–5 г/сут без обязательной фазы загрузки"
    },
    {
      id: "ashwell2012",
      short: "Ashwell et al., 2012 (Obesity Reviews)",
      title: "Waist-to-height ratio is a better screening tool than waist circumference and BMI for adult cardiometabolic risk factors",
      journal: "Obesity Reviews, 13(3), 275–286",
      url: "https://doi.org/10.1111/j.1467-789X.2011.00952.x",
      usedFor: "Индекс талия/рост (WHtR) — оценка висцерального жира и целевого обхвата талии"
    }
  ];

  /**
   * 2. ИНДЕКС МАССЫ ТЕЛА (ИМТ / BMI) И ПРОВЕРКА МИНИМАЛЬНОГО ЗДОРОВОГО ПОРОГА
   * Источник: WHO BMI classification (нижняя граница нормы для взрослых = 18.5 кг/м²)
   */
  function calcBMI(weightKg, heightCm) {
    const hM = heightCm / 100;
    return +(weightKg / (hM * hM)).toFixed(1);
  }

  /**
   * 3. СУХАЯ БЕЗЖИРОВАЯ МАССА ТЕЛА (LBM) И БАЗОВЫЙ ОБМЕН (BMR)
   * Источники:
   * - Mifflin et al., 1990 (https://doi.org/10.1093/ajcn/51.2.241)
   * - Katch-McArdle (1996) / Cunningham (1991): BMR = 370 + 21.6 * LBM
   */
  function calcBiometrics({ gender, weight, height, age, bf, activity }) {
    const lbm = +(weight * (1 - bf / 100)).toFixed(1);
    const bmrKatch = 370 + 21.6 * lbm;
    const bmrMifflin =
      gender === "male"
        ? 10 * weight + 6.25 * height - 5 * age + 5
        : 10 * weight + 6.25 * height - 5 * age - 161;

    const bmr = Math.round((bmrKatch + bmrMifflin) / 2);
    const tdee = Math.round(bmr * activity);

    return { lbm, bmr, tdee, bmrMifflin: Math.round(bmrMifflin), bmrKatch: Math.round(bmrKatch) };
  }

  /**
   * 4. ПРОГНОЗ СРОКОВ И КБЖУ С ПРЕДОХРАНИТЕЛЯМИ ЗДОРОВЬЯ
   * Источники:
   * - Helms et al., 2014 (https://doi.org/10.1186/1550-2783-11-20): снижение 0.5–1.0% веса/нед
   * - Kerksick et al., 2018 (https://doi.org/10.1186/s12970-018-0242-y): набор ~0.25–0.5% веса/нед, белок 1.6–2.2 г/кг
   * Предохранители:
   * - Целевой ИМТ < 18.5 -> блокировка плана, рекомендация обратиться к специалисту
   * - Калорийность никогда не опускается ниже BMR (при необходимости увеличивается срок)
   * - Возраст < 18 лет -> не допускается дефицит глубже умеренного (не более 10% от TDEE и не ниже BMR)
   */
  function calcMetabolicPlan(params) {
    const { gender, goal, weight, targetWeight, height, age, bf, activity, weeklyLogs } = params;
    const bio = calcBiometrics({ gender, weight, height, age, bf, activity });
    const targetBmi = calcBMI(targetWeight, height);
    const currentBmi = calcBMI(weight, height);
    const isUnder18 = age < 18;

    const warnings = [];
    let blockedByLowBMI = false;

    if (targetWeight < weight && targetBmi < 18.5) {
      blockedByLowBMI = true;
      warnings.push(
        `Желаемый вес (${targetWeight} кг, ИМТ ${targetBmi}) ниже здорового диапазона (<18.5). Такой план не строится — лучше обсудить цель со специалистом.`
      );
    }

    // Определение целевой калорийности с предохранителем BMR и возраста <18
    let rawTargetKcal = bio.tdee;
    let tagLabel = "ПОДДЕРЖКА";

    if (goal === "cut") {
      const maxDeficitShare = isUnder18 ? 0.90 : 0.80; // до 18 лет только мягкий дефицит -10%
      rawTargetKcal = Math.round(bio.tdee * maxDeficitShare);
      tagLabel = isUnder18 ? "-10% МЯГКИЙ" : "-20% ДЕФИЦИТ";
    } else if (goal === "recomp") {
      rawTargetKcal = Math.round(bio.tdee * 0.93);
      tagLabel = "-7% РЕКОМП";
    } else if (goal === "bulk") {
      rawTargetKcal = Math.round(bio.tdee * 1.10);
      tagLabel = "+10% ПРОФИЦИТ";
    }

    let clampedByBmr = false;
    let targetKcal = rawTargetKcal;
    if (targetKcal < bio.bmr) {
      targetKcal = bio.bmr;
      clampedByBmr = true;
      tagLabel = "МИН. BMR";
      warnings.push(
        `Калорийность плана ограничена твоим базовым обменом (${bio.bmr} ккал), чтобы не опускаться ниже безопасного порога. Срок достижения цели автоматически увеличен.`
      );
    }

    if (isUnder18) {
      warnings.push(
        "До 18 лет организм растёт: глубокий дефицит калорий отключён, расчёт носит ознакомительный характер."
      );
    }

    targetKcal = Math.round(targetKcal / 10) * 10;

    // Безопасный диапазон темпа (кг в неделю) по Helms et al. 2014 / Kerksick et al. 2018
    const weightDiff = targetWeight - weight;
    const absDiff = Math.abs(weightDiff);

    let rateRealisticKg = 0; // быстрый конец безопасного коридора
    let rateCautiousKg = 0;  // осторожный конец безопасного коридора
    let rateNote = "";

    if (weightDiff < -0.2) {
      // Снижение веса: 0.5% - 1.0% массы тела в неделю
      const maxSafeLossPerWeek = +(weight * 0.01).toFixed(2);
      const minSafeLossPerWeek = +(weight * 0.005).toFixed(2);
      // Также учитываем реальный дефицит (7700 ккал ≈ 1 кг)
      const energyWeeklyLoss = Math.max(0.2, ((bio.tdee - targetKcal) * 7) / 7700);
      rateRealisticKg = +Math.min(maxSafeLossPerWeek, Math.max(minSafeLossPerWeek, energyWeeklyLoss)).toFixed(2);
      rateCautiousKg = +minSafeLossPerWeek.toFixed(2);
      rateNote = `Безопасный коридор снижения: 0,5–1,0% массы тела в неделю (${minSafeLossPerWeek}–${maxSafeLossPerWeek} кг/нед, Helms et al., 2014).`;
    } else if (weightDiff > 0.2) {
      // Набор: 0.25% - 0.5% массы тела в неделю (ориентир)
      rateRealisticKg = +(weight * 0.005).toFixed(2);
      rateCautiousKg = +(weight * 0.0025).toFixed(2);
      rateNote = `Ориентир чистого набора: ~0,25–0,5% массы тела в неделю (${rateCautiousKg}–${rateRealisticKg} кг/нед).`;
    } else {
      // Рекомпозиция на текущем весе
      rateRealisticKg = +(weight * 0.005).toFixed(2);
      rateCautiousKg = +(weight * 0.003).toFixed(2);
      rateNote = "Рекомпозиция около текущего веса: ориентир базового цикла 8–12 недель.";
    }

    // Корректировка по фактическим еженедельным замерам (если есть минимум 2 записи)
    let actualWeeklyRate = null;
    if (Array.isArray(weeklyLogs) && weeklyLogs.length >= 2) {
      const sorted = [...weeklyLogs].sort((a, b) => new Date(a.date) - new Date(b.date));
      const first = sorted[0];
      const last = sorted[sorted.length - 1];
      const daysBetween = Math.max(3, (new Date(last.date) - new Date(first.date)) / (1000 * 3600 * 24));
      const weeksBetween = daysBetween / 7;
      const observedRate = Math.abs((last.weight - first.weight) / weeksBetween);
      if (observedRate >= 0.1 && observedRate <= weight * 0.015) {
        actualWeeklyRate = +observedRate.toFixed(2);
      }
    }

    let weeksMin = 8;
    let weeksMax = 12;
    if (absDiff > 0.2) {
      const effectiveFastRate = actualWeeklyRate
        ? Math.min(weight * 0.01, Math.max(rateCautiousKg, actualWeeklyRate))
        : rateRealisticKg;
      weeksMin = Math.max(2, Math.round(absDiff / Math.max(0.15, effectiveFastRate)));
      weeksMax = Math.max(weeksMin + 2, Math.round(absDiff / Math.max(0.12, rateCautiousKg)));
    }

    // Даты диапазона (реалистичный — осторожный сценарий)
    const now = new Date();
    const dateMin = new Date(now.getTime() + weeksMin * 7 * 24 * 3600 * 1000);
    const dateMax = new Date(now.getTime() + weeksMax * 7 * 24 * 3600 * 1000);

    // БЖУ (Kerksick et al., 2018; Helms et al., 2014)
    const proteinPerKg = goal === "cut" ? 2.0 : 1.8;
    const proteinG = Math.round(weight * proteinPerKg);
    const fatsG = Math.round(weight * 0.85);
    const carbsG = Math.max(60, Math.round((targetKcal - (proteinG * 4 + fatsG * 9)) / 4));

    const waterLiters = +(weight * 0.033).toFixed(1);

    return {
      ...bio,
      currentBmi,
      targetBmi,
      blockedByLowBMI,
      clampedByBmr,
      isUnder18,
      targetKcal,
      tagLabel,
      proteinG,
      fatsG,
      carbsG,
      waterLiters,
      rateRealisticKg,
      rateCautiousKg,
      actualWeeklyRate,
      rateNote,
      weeksMin,
      weeksMax,
      dateMin,
      dateMax,
      warnings
    };
  }

  /**
   * 5. СИЛА СО СВОИМ ВЕСОМ (КАЛИСТЕНИКА) — НОРМАТИВЫ И ЭКВИВАЛЕНТЫ
   * Источники:
   * - Отжимания (нагрузка): Ebben et al., 2011 (JSCR) — 64% массы тела в классических, 49% с колен
   * - Отжимания (нормы по полу и возрасту): ACSM's Guidelines / CSEP push-up protocol
   * - Тест «сесть-встать с пола» (SRT): Araújo et al., 2012 (EJPC, https://doi.org/10.1177/2047487312471759)
   * - Турник / Брусья / Приседания 60с / Вис / Стульчик / Планка: ориентир канала «Инженер Рельефа»
   */
  function getAgeBracketIndex(age) {
    if (age < 30) return 0; // 20-29 (и младше)
    if (age < 40) return 1; // 30-39
    if (age < 50) return 2; // 40-49
    if (age < 60) return 3; // 50-59
    return 4;               // 60+
  }

  // Пороги [Любитель (Good/Fair), Атлет (Very Good), Элита (Excellent)] по возрастным группам 20-29, 30-39, 40-49, 50-59, 60+
  // Источник для отжиманий: ACSM / CSEP Push-up test norms (мужчины — классические, женщины — модифицированные/классические с поправкой)
  const ACSM_PUSHUP_THRESHOLDS = {
    male: [
      [17, 29, 36], // 20-29
      [13, 22, 30], // 30-39
      [11, 17, 25], // 40-49
      [9, 13, 21],  // 50-59
      [7, 11, 18]   // 60+
    ],
    female: [
      [10, 21, 30], // 20-29
      [8, 15, 24],  // 30-39
      [6, 12, 20],  // 40-49
      [4, 9, 15],   // 50-59
      [3, 7, 12]    // 60+
    ]
  };

  // Ориентиры канала «Инженер Рельефа» для остальных упражнений со своим весом
  // Формат: [Любитель, Атлет, Элита] для мужчин и женщин (с возрастным коэффициентом)
  const CHANNEL_BW_NORMS = {
    pullups: {
      unit: "повт",
      sourceType: "channel",
      sourceText: "Ориентир канала «Инженер Рельефа» (официальных клинических норм ACSM нет)",
      male: [6, 14, 22],
      female: [1, 5, 10]
    },
    dips: {
      unit: "повт",
      sourceType: "channel",
      sourceText: "Ориентир канала «Инженер Рельефа» (официальных клинических норм нет)",
      male: [8, 18, 28],
      female: [2, 8, 15]
    },
    squats60: {
      unit: "повт за 60 с",
      sourceType: "channel",
      sourceText: "Ориентир канала (функциональный минутный тест выносливости ног)",
      male: [30, 45, 60],
      female: [25, 38, 52]
    },
    hang: {
      unit: "сек",
      sourceType: "channel",
      sourceText: "Ориентир канала «Инженер Рельефа» по пассивному вису на перекладине",
      male: [40, 75, 120],
      female: [25, 55, 90]
    },
    wallsit: {
      unit: "сек",
      sourceType: "channel",
      sourceText: "Ориентир канала «Инженер Рельефа» по изометрическому удержанию 90° у стены",
      male: [45, 90, 150],
      female: [40, 80, 135]
    },
    plank: {
      unit: "сек",
      sourceType: "channel",
      sourceText: "Ориентир канала «Инженер Рельефа» по удержанию прямой планки",
      male: [60, 120, 180],
      female: [50, 105, 165]
    }
  };

  function evaluateBodyweightExercise({ exercise, value, gender, age, weight, kneeVariant = false }) {
    // 1. Специальный клинический тест: Сесть-встать с пола (SRT, Araújo et al., 2012)
    if (exercise === "srt") {
      const score = Math.max(0, Math.min(10, +value));
      let levelName = "Новичок";
      let nextTierName = "Любитель";
      let deltaToNext = 0;

      if (score >= 8) {
        levelName = "Атлет / Высокий балл (8–10)";
        nextTierName = "Максимум (10)";
        deltaToNext = +(10 - score).toFixed(1);
      } else if (score >= 6) {
        levelName = "Любитель / Средний балл (6–7.5)";
        nextTierName = "Атлет (8.0)";
        deltaToNext = +(8 - score).toFixed(1);
      } else {
        levelName = "Ниже ориентира (<6 баллов)";
        nextTierName = "Любитель (6.0)";
        deltaToNext = +(6 - score).toFixed(1);
      }

      return {
        exercise,
        score,
        unit: "баллов (из 10)",
        levelName,
        nextTierName,
        deltaToNext,
        progressPct: Math.min(100, Math.round((score / 10) * 100)),
        sourceType: "scientific",
        sourceText: "Исследование: Araújo et al., 2012, European Journal of Preventive Cardiology (DOI: 10.1177/2047487312471759).",
        clinicalNote:
          "Пояснение: тест оценивает мышечно-скелетную функцию, баланс и гибкость (старт с 10 баллов: минус 1 балл за каждую опору рукой/коленом и минус 0,5 балла за потерю равновесия). В исследовании на людях 51–80 лет низкий балл был статистически связан с более высоким риском общей смертности, однако тест не ставит диагнозов.",
        equivalentKgText: null
      };
    }

    // 2. Классические отжимания по нормам ACSM / CSEP + кинетика Ebben et al., 2011
    const ageIdx = getAgeBracketIndex(age);
    let thresholds = [10, 20, 30];
    let unit = "повт";
    let sourceType = "scientific";
    let sourceText = "Нормы: ACSM's Guidelines for Exercise Testing and Prescription / протокол CSEP (с учётом пола и возраста).";
    let equivalentKgText = null;

    if (exercise === "pushups") {
      const table = ACSM_PUSHUP_THRESHOLDS[gender] || ACSM_PUSHUP_THRESHOLDS.male;
      thresholds = table[ageIdx];
      const coeff = kneeVariant ? 0.49 : 0.64;
      const liftedKg = +(weight * coeff).toFixed(1);
      equivalentKgText = `≈ ты поднимаешь ${liftedKg} кг за повтор (приблизительно ${Math.round(coeff * 100)}% массы тела в верхней точке, Ebben et al., 2011, JSCR)`;
    } else {
      const cfg = CHANNEL_BW_NORMS[exercise] || CHANNEL_BW_NORMS.pullups;
      unit = cfg.unit;
      sourceType = cfg.sourceType;
      sourceText = cfg.sourceText;
      const baseArr = cfg[gender] || cfg.male;
      // Мягкая возрастная поправка после 35 лет (по ~7% на десятилетие)
      const ageFactor = age <= 30 ? 1 : Math.max(0.65, 1 - ageIdx * 0.08);
      thresholds = baseArr.map((t) => Math.max(1, Math.round(t * ageFactor)));
    }

    const [tAmateur, tAthlete, tElite] = thresholds;
    let levelName = "Новичок";
    let nextTierName = "Любитель";
    let deltaToNext = Math.max(1, tAmateur - value);
    let progressPct = Math.round((value / Math.max(1, tAmateur)) * 35);

    if (value >= tElite) {
      levelName = "Элита";
      nextTierName = null;
      deltaToNext = 0;
      progressPct = 98;
    } else if (value >= tAthlete) {
      levelName = "Атлет";
      nextTierName = "Элита";
      deltaToNext = tElite - value;
      progressPct = 68 + Math.round(((value - tAthlete) / Math.max(1, tElite - tAthlete)) * 28);
    } else if (value >= tAmateur) {
      levelName = "Любитель";
      nextTierName = "Атлет";
      deltaToNext = tAthlete - value;
      progressPct = 36 + Math.round(((value - tAmateur) / Math.max(1, tAthlete - tAmateur)) * 30);
    }

    const deltaAthlete = value < tAthlete ? tAthlete - value : 0;

    return {
      exercise,
      value,
      unit,
      thresholds,
      levelName,
      nextTierName,
      deltaToNext,
      deltaAthlete,
      progressPct: Math.min(98, Math.max(8, progressPct)),
      sourceType,
      sourceText,
      equivalentKgText,
      clinicalNote: null
    };
  }

  /**
   * 6. РАСЧЕТ 1ПМ (ШТАНГА И СТРИТЛИФТИНГ: ПОДТЯГИВАНИЯ / БРУСЬЯ С ВЕСОМ)
   * Источники:
   * - Epley (1985): 1RM = W * (1 + R / 30)
   * - Brzycki (1993): 1RM = W * 36 / (37 - R)
   * - Для подтягиваний и брусьев с отягощением 1ПМ считается от суммарной системы (масса тела + доп. вес),
   *   а затем вычитается собственный вес для получения «чистого» 1ПМ на поясе.
   */
  function calcOneRepMax({ lift, liftKg, liftReps, bodyWeight, gender }) {
    const isWeightedCalisthenics = lift === "pullup" || lift === "dips_w";
    const systemLoadKg = isWeightedCalisthenics ? bodyWeight + liftKg : liftKg;

    const repsClamped = Math.max(1, Math.min(30, liftReps));
    const epley1RM = repsClamped === 1 ? systemLoadKg : systemLoadKg * (1 + repsClamped / 30);
    const brzycki1RM = repsClamped === 1 ? systemLoadKg : systemLoadKg * (36 / (37 - repsClamped));
    const meanSystem1RM = (epley1RM + brzycki1RM) / 2;

    const external1RM = isWeightedCalisthenics
      ? Math.max(0, meanSystem1RM - bodyWeight)
      : meanSystem1RM;

    const highRepsWarning =
      liftReps > 10
        ? "Точность оценки снижается при вводе >10 повторений. Для расчёта 1ПМ лучше вводить подход на 3–8 повторений (LeSuer et al., 1997)."
        : null;

    // Отношение к собственному весу
    const ratio = isWeightedCalisthenics
      ? +(meanSystem1RM / bodyWeight).toFixed(2)
      : +(external1RM / bodyWeight).toFixed(2);

    const baseNormsMale = {
      bench:    [0.75, 1.05, 1.30, 1.60],
      squat:    [1.00, 1.35, 1.70, 2.10],
      deadlift: [1.20, 1.60, 2.00, 2.45],
      ohp:      [0.45, 0.65, 0.85, 1.08],
      pullup:   [1.10, 1.30, 1.55, 1.80], // суммарный вес / вес тела
      dips_w:   [1.15, 1.40, 1.70, 2.00]
    };

    const genderFactor = gender === "female" ? 0.65 : 1.0;
    const rawNorms = baseNormsMale[lift] || baseNormsMale.bench;
    const [n1, n2, n3, n4] = rawNorms.map((v) =>
      isWeightedCalisthenics ? +(1 + (v - 1) * genderFactor).toFixed(2) : +(v * genderFactor).toFixed(2)
    );

    let levelName = "Новичок";
    let percentileText = "Ориентир: ~Топ 65% любителей";
    let barW = 28;
    let nextRatio = n1;
    let nextLevelName = "Любитель";

    if (ratio >= n4) {
      levelName = "Элита";
      percentileText = "Ориентир: ~Топ 3% (среди зала)";
      barW = 96;
      nextRatio = null;
      nextLevelName = null;
    } else if (ratio >= n3) {
      levelName = "Атлет";
      percentileText = "Ориентир: ~Топ 15% (среди зала)";
      barW = 76;
      nextRatio = n4;
      nextLevelName = "Элита";
    } else if (ratio >= n2) {
      levelName = "Любитель";
      percentileText = "Ориентир: ~Топ 35% (среди зала)";
      barW = 54;
      nextRatio = n3;
      nextLevelName = "Атлет";
    } else if (ratio >= n1) {
      levelName = "Базовый";
      percentileText = "Ориентир: ~Топ 50% (среди зала)";
      barW = 38;
      nextRatio = n2;
      nextLevelName = "Любитель";
    }

    const kgToNextTier = nextRatio
      ? Math.max(1.25, +((nextRatio * bodyWeight) - (isWeightedCalisthenics ? meanSystem1RM : external1RM)).toFixed(1))
      : 0;

    return {
      isWeightedCalisthenics,
      systemLoadKg: +systemLoadKg.toFixed(1),
      epley1RM: +epley1RM.toFixed(1),
      brzycki1RM: +brzycki1RM.toFixed(1),
      meanSystem1RM: +meanSystem1RM.toFixed(1),
      external1RM: +external1RM.toFixed(1),
      ratio,
      levelName,
      nextLevelName,
      kgToNextTier,
      percentileText,
      barW,
      highRepsWarning,
      formulaCaption: "Среднее формул Эпли (1985) и Бжицки (1993)",
      percentileSourceNote:
        "Перцентиль и уровни построены на агрегированных самоотчётах посетителей тренажёрных залов (StrengthLevel / ExRx) — это любительский ориентир, а не популяционная выборка."
    };
  }

  /**
   * 7. ОЦЕНКА АНТРОПОМЕТРИЧЕСКОГО ПОТЕНЦИАЛА ПО КЕЙСИ БАТТУ
   * Источник: Casey Butt, PhD (2009), «Your Maximum Muscular Bodyweight and Measurements»
   */
  function calcCaseyButtPotential({ heightCm, wristCm, ankleCm, targetBf = 10 }) {
    const hIn = heightCm / 2.54;
    const wIn = wristCm / 2.54;
    const aIn = ankleCm / 2.54;

    const maxLbmLb =
      Math.pow(hIn, 1.5) *
      (Math.sqrt(wIn) / 22.667 + Math.sqrt(aIn) / 17.0104) *
      (1 + targetBf / 224);
    const maxWeightKg = +((maxLbmLb / (1 - targetBf / 100)) * 0.453592).toFixed(1);
    const maxChestCm = +((1.6817 * wIn + 1.3759 * aIn + 0.3314 * hIn) * 2.54).toFixed(1);
    const maxBicepCm = +((1.2033 * wIn + 0.1236 * hIn) * 2.54).toFixed(1);
    const maxThighCm = +((1.3868 * aIn + 0.1805 * hIn) * 2.54).toFixed(1);

    return { maxWeightKg, maxChestCm, maxBicepCm, maxThighCm };
  }

  /**
   * 8. ДОЗИРОВКИ ДОБАВОК (КОФЕИН И КРЕАТИН) С МЕДИЦИНСКИМИ ФИЛЬТРАМИ
   * Источники:
   * - Guest et al., 2021 (ISSN Position Stand: Caffeine, https://doi.org/10.1186/s12970-020-00383-4): 3–6 мг/кг
   * - EFSA NDA Panel, 2015 (https://doi.org/10.2903/j.efsa.2015.4102): не более 400 мг/сут суммарно
   * - Kreider et al., 2017 (ISSN Position Stand: Creatine, https://doi.org/10.1186/s12970-017-0173-z): 3–5 г/день
   */
  function calcSupplements({ weightKg, age, hasContraindications }) {
    if (age < 18) {
      return {
        under18: true,
        creatineText: "Добавки до 18 лет обсуждай с врачом.",
        caffeineText: "Добавки до 18 лет обсуждай с врачом.",
        caffeineCapped: false
      };
    }

    const creatineText =
      "3–5 г в день постоянно (фаза загрузки необязательна; Kreider et al., 2017). При болезнях почек — только после консультации с врачом.";

    if (hasContraindications) {
      return {
        under18: false,
        contraindicated: true,
        creatineText,
        caffeineText: "Отмечены противопоказания — приём кофеина обсуди с врачом.",
        caffeineCapped: false
      };
    }

    const lowMg = Math.round(weightKg * 3);
    const rawHighMg = Math.round(weightKg * 6);
    const cappedHighMg = Math.min(400, rawHighMg);
    const cappedLowMg = Math.min(400, lowMg);
    const isCapped = rawHighMg > 400;

    let caffeineText = `Начинай с нижней границы: ${cappedLowMg} мг (3 мг/кг) за 30–60 мин до тренировки. Диапазон: ${cappedLowMg}–${cappedHighMg} мг.`;
    if (isCapped) {
      caffeineText += ` Верхняя граница (6 мг/кг = ${rawHighMg} мг) обрезана до 400 мг — это безопасный суточный потолок для здорового взрослого со всех источников, включая кофе (EFSA, 2015).`;
    }

    return {
      under18: false,
      contraindicated: false,
      creatineText,
      caffeineText,
      caffeineCapped: isCapped,
      lowMg: cappedLowMg,
      highMg: cappedHighMg,
      rawHighMg
    };
  }

  /**
   * 9. ИНДЕКС ТАЛИЯ / РОСТ (WHtR — WAIST-TO-HEIGHT RATIO)
   * Источник: Ashwell et al., 2012 (Obesity Reviews, DOI: 10.1111/j.1467-789X.2011.00952.x)
   * Клиническая граница кардиометаболического здоровья: WHtR < 0.50.
   * Ориентир выраженного спортивного рельефа (V-силуэт): 0.43–0.46 от роста.
   */
  function calcWaistToHeight({ waistCm, heightCm }) {
    const ratio = +(waistCm / heightCm).toFixed(2);
    const athleticTargetCm = +(heightCm * 0.445).toFixed(1);
    const healthyMaxCm = +(heightCm * 0.495).toFixed(1);
    const diffToAthletic = +(waistCm - athleticTargetCm).toFixed(1);

    let statusText = "В пределах здоровой нормы (<0,50 от роста)";
    if (ratio <= 0.45) {
      statusText = "Сухая атлетическая пропорция (выраженный V-контур)";
    } else if (ratio >= 0.50) {
      statusText = "Выше клинического порога 0,50 (Ashwell et al., 2012) — избыток висцерального жира";
    }

    return {
      ratio,
      athleticTargetCm,
      healthyMaxCm,
      diffToAthletic,
      statusText
    };
  }

  /**
   * 10. ГЕНЕРАТОР 4-НЕДЕЛЬНОЙ ПРОГРЕССИИ ПОД ТЕКУЩИЙ МАКСИМУМ (RIR 2 / ОБЪЁМНАЯ СХЕМА)
   * Принцип: работа с запасом 1–2 повторения до отказа (RIR 2) даёт стимул без перегрузки ЦНС.
   */
  function buildProgressionPlan({ exercise, currentMax, unit }) {
    const val = Math.max(1, +currentMax);
    if (exercise === "srt") {
      return {
        title: "4-недельный блок мобильности (для теста SRT)",
        restSec: 60,
        weeks: [
          { wk: "Неделя 1", scheme: "Глубокий присед у опоры 3×40 сек + выпады с акцентом на голеностоп 3×8" },
          { wk: "Неделя 2", scheme: "Переходы из седа по-турецки на колени без рук 4×5 раз" },
          { wk: "Неделя 3", scheme: "Медленные опускания на пол за 5 секунд с контролем центра тяжести 4×4" },
          { wk: "Неделя 4", scheme: "Полные подъёмы со скрещенными ногами + контрольный тест SRT" }
        ]
      };
    }

    const isTime = unit === "сек";
    const w1 = Math.max(1, Math.round(val * 0.65));
    const w2 = Math.max(1, Math.round(val * 0.72));
    const w3 = Math.max(1, Math.round(val * 0.78));
    const w4 = Math.max(1, Math.round(val * 0.85));

    return {
      title: "Схема тренировок на 4 недели (2–3 раза в неделю)",
      restSec: isTime ? 90 : 120,
      weeks: [
        { wk: "Неделя 1 (Базовый объём)", scheme: `5 подходов по ${w1} ${unit} (запас ~2–3 до отказа)` },
        { wk: "Неделя 2 (Накопление)", scheme: `5 подходов по ${w2} ${unit} (ровный темп без рывков)` },
        { wk: "Неделя 3 (Интенсификация)", scheme: `4 подхода по ${w3} ${unit} + 1 финальный подход на максимум` },
        { wk: "Неделя 4 (Разгрузка и Рекорд)", scheme: `1 лёгкая тренировка (3×${w1} ${unit}), 2 дня отдыха и новый замер (${w4}+)` }
      ]
    };
  }

  return Object.freeze({
    REFERENCES: Object.freeze(REFERENCES),
    calcBMI,
    calcBiometrics,
    calcMetabolicPlan,
    evaluateBodyweightExercise,
    calcOneRepMax,
    calcCaseyButtPotential,
    calcSupplements,
    calcWaistToHeight,
    buildProgressionPlan
  });
})();
