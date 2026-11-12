(() => {
  const session = JSON.parse(sessionStorage.getItem('gwcatat_session') || 'null');
  if (!session || !session.email) return;

  const accountKey = session.email.toLowerCase().replace(/[^a-z0-9]/g, '_');
  const storageKey = `studyrpg_${accountKey}_progress`;
  const plannerStorageKey = `studymate_${accountKey}_planner`;
  const levels = [
    { title: 'Rookie', xp: 0, zone: 'Focus Field' },
    { title: 'Scholar', xp: 300, zone: 'Wisdom Woods' },
    { title: 'Strategist', xp: 700, zone: 'Idea Island' },
    { title: 'Mastermind', xp: 1200, zone: 'Crystal Library' },
    { title: 'Legend', xp: 1800, zone: 'Sky Citadel' },
    { title: 'Grandmaster', xp: 2600, zone: 'Final Boss' }
  ];
  const quests = [
    { id: 'focus', title: 'Complete Math', description: 'Focus on one math topic for 25 minutes.', detail: 'Chapters 1–3 · 25 min focus session', icon: '📐', reward: 100, duration: 25, mode: 'focus', action: 'Start focus' },
    { id: 'quiz', title: 'Practice 5 questions', description: 'Try a quick knowledge check. Get 4 out of 5 right.', detail: 'Quick knowledge check · 5 questions', icon: '✳', reward: 80, mode: 'quiz', action: 'Start practice' },
    { id: 'review', title: 'Revise Biology Notes', description: 'Review your notes for 15 minutes.', detail: 'Cell structure · 15 min review session', icon: '🌿', reward: 60, duration: 15, mode: 'review', action: 'Start review' },
    { id: 'history', title: 'Read History Chapter', description: 'Read one history chapter with focus.', detail: 'The First World War · 20 min reading', icon: '🏛️', reward: 50, duration: 20, mode: 'review', action: 'Start reading' },
    { id: 'physics', title: 'Try Physics Numericals', description: 'Work through a few practice problems.', detail: 'Motion in a straight line · 25 min', icon: '⚛️', reward: 80, duration: 25, mode: 'focus', action: 'Start practice' },
    { id: 'english', title: 'Work on English Assignment', description: 'Make a start on your literature assignment.', detail: 'Literature essay · 20 min focus session', icon: '✎', reward: 50, duration: 20, mode: 'focus', action: 'Start assignment' }
  ];
  const questions = [
    { question: 'What is 3/4 + 1/8?', choices: ['4/12', '7/8', '5/8', '1'], answer: 1 },
    { question: 'Which is the largest planet in our solar system?', choices: ['Earth', 'Mars', 'Jupiter', 'Venus'], answer: 2 },
    { question: 'What does “curious” mean?', choices: ['Eager to learn', 'Very tired', 'Feeling brave', 'Feeling calm'], answer: 0 },
    { question: 'If x + 7 = 15, what is x?', choices: ['6', '7', '8', '9'], answer: 2 },
    { question: 'What process do plants use to turn sunlight into energy?', choices: ['Evaporation', 'Photosynthesis', 'Respiration', 'Adaptation'], answer: 1 }
  ];
  const levelIcons = ['♟', '♧', '✧', '⌘', '♜', '♛'];
  const emptyState = { awards: {}, sessions: [], activeSession: null, bestQuiz: 0 };
  let state = loadState();
  let plannerState = loadPlannerState();
  let plannerDate = new Date();
  let plannerPeriod = 'daily';
  let plannerSaveTimer;
  let toastTimer;
  let timerInterval;
  let nextFocusQuest = 'focus';

  function localDate(date = new Date()) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  function loadState() {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || 'null');
      if (!saved || typeof saved !== 'object') return { ...emptyState };
      return {
        awards: saved.awards && typeof saved.awards === 'object' ? saved.awards : {},
        sessions: Array.isArray(saved.sessions) ? saved.sessions.filter(item => item && typeof item.id === 'string' && typeof item.date === 'string' && Number.isFinite(item.minutes)) : [],
        activeSession: saved.activeSession && typeof saved.activeSession.id === 'string' && Number.isFinite(saved.activeSession.expiresAt) ? saved.activeSession : null,
        bestQuiz: Number.isFinite(saved.bestQuiz) ? Math.min(5, Math.max(0, saved.bestQuiz)) : 0
      };
    } catch (error) {
      console.error('StudyMate progress could not be read:', error);
      notify('Progres belajar tidak dapat dibaca. Penyimpanan browser mungkin bermasalah.');
      return { ...emptyState };
    }
  }

  function loadPlannerState() {
    try {
      const saved = JSON.parse(localStorage.getItem(plannerStorageKey) || 'null');
      if (!saved || typeof saved !== 'object' || !saved.days || typeof saved.days !== 'object') return { days: {} };
      const days = {};
      Object.entries(saved.days).forEach(([date, day]) => {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !day || typeof day !== 'object') return;
        const validItems = items => Array.isArray(items) ? items.filter(item => item && typeof item.id === 'string' && typeof item.text === 'string').map(item => ({ id: item.id, text: item.text.slice(0, 90), done: item.done === true })) : [];
        days[date] = {
          goals: validItems(day.goals),
          priorities: validItems(day.priorities),
          tasks: validItems(day.tasks),
          appointments: Array.isArray(day.appointments) ? day.appointments.filter(item => item && typeof item.id === 'string' && typeof item.text === 'string' && /^\d{2}:\d{2}$/.test(item.time)).map(item => ({ id: item.id, text: item.text.slice(0, 70), time: item.time })) : [],
          mood: ['happy', 'calm', 'tired', 'focused'].includes(day.mood) ? day.mood : '',
          note: typeof day.note === 'string' ? day.note.slice(0, 1200) : ''
        };
      });
      return { days };
    } catch (error) {
      console.error('StudyMate planner could not be read:', error);
      notify('Planner tidak dapat dibaca. Penyimpanan browser mungkin bermasalah.');
      return { days: {} };
    }
  }

  function plannerDateKey(date = plannerDate) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  function emptyPlannerDay() {
    return { goals: [], priorities: [], tasks: [], appointments: [], mood: '', note: '' };
  }

  function getPlannerDay(date = plannerDate) {
    return plannerState.days[plannerDateKey(date)] || emptyPlannerDay();
  }

  function updatePlannerDay(mutator, date = plannerDate) {
    const previous = JSON.parse(JSON.stringify(plannerState));
    const key = plannerDateKey(date);
    if (!plannerState.days[key]) plannerState.days[key] = emptyPlannerDay();
    mutator(plannerState.days[key]);
    try {
      localStorage.setItem(plannerStorageKey, JSON.stringify(plannerState));
      return true;
    } catch (error) {
      plannerState = previous;
      console.error('StudyMate planner could not be saved:', error);
      notify('Planner tidak dapat disimpan. Periksa penyimpanan browser dan coba lagi.');
      renderPlanner();
      return false;
    }
  }

  function plannerId() {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  }

  function saveState() {
    const previous = state;
    try {
      localStorage.setItem(storageKey, JSON.stringify(state));
      return true;
    } catch (error) {
      state = previous;
      console.error('StudyMate progress could not be saved:', error);
      notify('Progress could not be saved. Check your browser storage and try again.');
      return false;
    }
  }

  function mutateState(mutator) {
    const previous = JSON.parse(JSON.stringify(state));
    mutator();
    try {
      localStorage.setItem(storageKey, JSON.stringify(state));
      return true;
    } catch (error) {
      state = previous;
      console.error('StudyMate progress could not be saved:', error);
      notify('Progress could not be saved. Check your browser storage and try again.');
      return false;
    }
  }

  function notify(message) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('visible');
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => toast.classList.remove('visible'), 3400);
  }

  function todayAwards() {
    return state.awards[localDate()] || {};
  }

  function totalXp() {
    return Object.values(state.awards).reduce((sum, day) => {
      if (!day || typeof day !== 'object') return sum;
      return sum + Object.values(day).reduce((daySum, award) => daySum + (award && Number.isFinite(award.xp) ? award.xp : 0), 0);
    }, 0);
  }

  function completedDaySet() {
    return new Set(Object.keys(state.awards).filter(day => Object.keys(state.awards[day] || {}).length > 0));
  }

  function streakCount() {
    const activeDays = completedDaySet();
    const now = new Date();
    let cursor = activeDays.has(localDate(now)) ? now : new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
    if (!activeDays.has(localDate(cursor))) return 0;
    let streak = 0;
    while (activeDays.has(localDate(cursor))) {
      streak += 1;
      cursor = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() - 1);
    }
    return streak;
  }

  function currentLevel(xp = totalXp()) {
    let index = 0;
    for (let i = 1; i < levels.length; i += 1) {
      if (xp >= levels[i].xp) index = i;
      else break;
    }
    const current = levels[index];
    const next = levels[index + 1];
    const range = next ? next.xp - current.xp : 0;
    const progress = xp - current.xp;
    return { index, current, next, xp, progress, range, percent: next ? Math.min(100, Math.round(progress / range * 100)) : 100 };
  }

  function awardQuest(questId, details = {}) {
    const quest = quests.find(item => item.id === questId);
    if (!quest) return false;
    const day = localDate();
    if (state.awards[day] && state.awards[day][questId]) return false;
    const award = {
      xp: quest.reward,
      completedAt: new Date().toISOString(),
      score: Number.isFinite(details.score) ? details.score : null
    };
    return mutateState(() => {
      if (!state.awards[day]) state.awards[day] = {};
      if (!state.awards[day][questId]) state.awards[day][questId] = award;
      if (Number.isFinite(details.score)) state.bestQuiz = Math.max(state.bestQuiz, details.score);
    });
  }

  function todayCompleted(id) {
    return Boolean(state.awards[localDate()] && state.awards[localDate()][id]);
  }

  function getStats() {
    const xp = totalXp();
    const level = currentLevel(xp);
    const completed = quests.filter(quest => todayCompleted(quest.id)).length;
    const minutes = state.sessions.reduce((sum, item) => sum + item.minutes, 0);
    const days = completedDaySet();
    return { xp, level, completed, minutes, streak: streakCount(), sessions: state.sessions.length, days: days.size };
  }

  function setText(id, value) {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
  }

  function formatDate(date = new Date()) {
    return new Intl.DateTimeFormat('en-US', { weekday: 'long', day: 'numeric', month: 'long' }).format(date);
  }

  function renderHeader(stats) {
    const title = document.getElementById('pageTitle');
    const activePage = document.querySelector('.page.active');
    const names = { dashboard: 'My planner', missions: 'Misi belajar', planner: 'Planner harian', map: 'Achievements', arena: 'Quick practice', progress: 'Your progress' };
    if (title && activePage) title.textContent = names[activePage.id.replace('page-', '')] || 'StudyMate';
    const date = document.querySelector('.top-eyebrow');
    if (date) date.textContent = formatDate().toLocaleUpperCase('en-US');
    setText('headerStreak', String(stats.streak));
    const avatar = document.getElementById('profileAvatar');
    if (avatar) avatar.textContent = (session.name || session.email || 'S').trim().charAt(0).toUpperCase();
    setText('missionNavCount', `${stats.completed}/${quests.length}`);
  }

  function renderHero(stats) {
    const { level } = stats;
    setText('heroLevelName', `LEVEL ${String(level.index + 1).padStart(2, '0')} · ${level.current.title.toUpperCase()}`);
    setText('heroLevelNumber', String(level.index + 1).padStart(2, '0'));
    setText('heroXpTotal', `${stats.xp.toLocaleString('id-ID')} XP TOTAL`);
    setText('heroXpLabel', level.next ? `${level.progress} / ${level.range} XP` : `${stats.xp.toLocaleString('id-ID')} XP · MAX LEVEL`);
    setText('heroXpLeft', level.next ? `${level.next.xp - stats.xp} XP to your next level` : 'You reached the highest level!');
    const fill = document.getElementById('heroProgressFill');
    if (fill) fill.style.width = `${level.percent}%`;
    setText('statXp', stats.xp.toLocaleString('id-ID'));
    setText('statMinutes', `${stats.minutes} min`);
    setText('statStreak', `${stats.streak} days`);
    setText('statQuests', `${stats.completed} / ${quests.length}`);
    setText('skillLevelChip', `LV ${String(level.index + 1).padStart(2, '0')}`);
    setText('mapCurrentLevel', `LEVEL ${String(level.index + 1).padStart(2, '0')}`);
    setText('progressXp', stats.xp.toLocaleString('id-ID'));
    setText('progressHours', `${stats.minutes} min`);
    setText('progressStreak', `${stats.streak} days`);
    setText('progressSessions', String(stats.sessions));
  }

  function renderQuestRows(containerId, full = false) {
    const container = document.getElementById(containerId);
    if (!container) return;
    const rows = quests.map(quest => {
      const complete = todayCompleted(quest.id);
      if (!full) {
        return `<div class="quest-row ${complete ? 'complete' : ''}">
          <span class="quest-row-icon">${complete ? '✓' : quest.icon}</span>
          <span class="quest-row-copy"><strong>${quest.title}</strong><small>${complete ? 'Completed today' : quest.detail}</small></span>
          <span class="quest-xp">${complete ? '✓' : `+${quest.reward} XP`}</span>
        </div>`;
      }
      const disabled = complete || Boolean(state.activeSession);
      const buttonText = complete ? 'Done ✓' : state.activeSession ? 'Timer running' : quest.action;
      return `<article class="mission-card ${complete ? 'completed' : ''}">
        <span class="mission-icon">${complete ? '✓' : quest.icon}</span>
        <div class="mission-copy"><h3>${quest.title}</h3><p>${quest.description}</p><span class="mission-status">${complete ? 'Completed today' : state.activeSession ? 'Finish your current session first' : 'Ready when you are'}</span></div>
        <div class="mission-reward"><strong>+${quest.reward}</strong><small>XP</small></div>
        <button class="mission-action" type="button" data-quest="${quest.id}" ${disabled ? 'disabled' : ''}>${buttonText}</button>
      </article>`;
    });
    container.innerHTML = rows.join('');
  }

  function renderSkills(stats) {
    const container = document.getElementById('skillList');
    if (!container) return;
    const focusMinutes = state.sessions.filter(item => item.mode === 'focus').reduce((sum, item) => sum + item.minutes, 0);
    const reviewMinutes = state.sessions.filter(item => item.mode === 'review').reduce((sum, item) => sum + item.minutes, 0);
    const skills = [
      { name: 'Focus', score: Math.min(100, Math.round(focusMinutes / 5)) },
      { name: 'Understanding', score: Math.min(100, Math.round(stats.xp / 24)) },
      { name: 'Discipline', score: Math.min(100, stats.days * 12) },
      { name: 'Consistency', score: Math.min(100, Math.round((reviewMinutes + stats.streak * 10) / 3)) }
    ];
    container.innerHTML = skills.map(skill => `<div class="skill-row"><span>${skill.name.toUpperCase()}</span><strong>${skill.score}</strong><div class="skill-bar"><span style="width:${skill.score}%"></span></div></div>`).join('');
  }

  function renderWorldMap(stats) {
    const world = document.getElementById('worldMap');
    const guide = document.getElementById('levelGuide');
    const { level } = stats;
    if (world) {
      world.innerHTML = levels.map((item, index) => {
        const unlocked = stats.xp >= item.xp;
        const current = index === level.index;
        return `<div class="world-node ${unlocked ? 'unlocked' : ''} ${current ? 'current' : ''}">
          <span class="world-node-art">${unlocked ? levelIcons[index] : '♙'}</span>
          <strong>${item.zone}</strong><small>${item.xp.toLocaleString('id-ID')} XP${current ? ' · LOKASI SAAT INI' : ''}</small>
        </div>`;
      }).join('');
    }
    if (guide) {
      guide.innerHTML = levels.map((item, index) => {
        const reached = stats.xp >= item.xp;
        return `<div class="level-guide-item ${reached ? 'reached' : ''} ${index === level.index ? 'active' : ''}">
          <span class="level-guide-number">${String(index + 1).padStart(2, '0')}</span>
          <div><strong>${item.title}</strong><small>${item.xp.toLocaleString('id-ID')} XP · ${item.zone}</small></div>
        </div>`;
      }).join('');
    }
  }

  function renderAchievements(stats) {
    const container = document.getElementById('achievementList');
    if (!container) return;
    const quizPasses = Object.values(state.awards).filter(day => day && day.quiz).length;
    const achievements = [
      { icon: '✦', title: 'First Steps', detail: 'Complete your first task', unlocked: stats.xp > 0 },
      { icon: '◷', title: 'Focus Keeper', detail: 'Study for two hours', unlocked: stats.minutes >= 120 },
      { icon: '🔥', title: 'On a Roll', detail: 'Keep a three-day streak', unlocked: stats.streak >= 3 },
      { icon: '✳', title: 'Quiz Star', detail: 'Pass your first practice quiz', unlocked: quizPasses > 0 },
      { icon: '▤', title: 'Book Explorer', detail: 'Finish five review sessions', unlocked: state.sessions.filter(item => item.mode === 'review').length >= 5 },
      { icon: '♛', title: 'Level Up!', detail: 'Reach Scholar level', unlocked: stats.xp >= 300 }
    ];
    container.innerHTML = achievements.map(item => `<article class="achievement-card ${item.unlocked ? 'unlocked' : ''}"><span class="achievement-icon">${item.icon}</span><strong>${item.title}</strong><small>${item.unlocked ? 'Lencana terbuka!' : item.detail}</small></article>`).join('');
  }

  function renderHistory() {
    const container = document.getElementById('studyHistory');
    if (!container) return;
    const recent = [...state.sessions].sort((a, b) => b.finishedAt.localeCompare(a.finishedAt)).slice(0, 8);
    if (!recent.length) {
      container.innerHTML = '<div class="empty-history">No study sessions yet. Start a focus or review session and your progress will show up here.</div>';
      return;
    }
    container.innerHTML = recent.map(item => {
      const date = new Date(item.finishedAt);
      return `<div class="history-item"><span class="history-icon">${item.mode === 'review' ? '▤' : '◷'}</span><div><strong>${escapeHTML(item.topic || (item.mode === 'review' ? 'Review session' : 'Focus session'))}</strong><small>${formatDate(date)} · ${item.minutes} min</small></div><span class="history-xp">${item.xp > 0 ? `+${item.xp} XP` : 'Session'}</span></div>`;
    }).join('');
  }

  function renderPlannerList(containerId, items, kind, options = {}) {
    const container = document.getElementById(containerId);
    if (!container) return;
    if (!items.length) {
      container.innerHTML = `<div class="planner-empty">${options.empty || 'Belum ada item. Tambahkan yang pertama di bawah.'}</div>`;
      return;
    }
    container.innerHTML = items.map(item => {
      const done = item.done === true;
      const time = options.appointment
        ? `<time>${new Intl.DateTimeFormat('id-ID', { hour: 'numeric', minute: '2-digit' }).format(new Date(`2000-01-01T${item.time}:00`))}</time>`
        : '';
      return `<div class="planner-item ${done ? 'is-done' : ''} ${options.appointment ? 'appointment-item' : ''}">
        ${options.appointment ? time : `<button type="button" class="planner-check" data-planner-toggle="${escapeHTML(kind)}" data-item-id="${escapeHTML(item.id)}" aria-label="${done ? 'Tandai belum selesai' : 'Tandai selesai'}" aria-pressed="${done}">${done ? '✓' : ''}</button>`}
        <span>${escapeHTML(item.text)}</span>
        <button type="button" class="planner-remove" data-planner-remove="${escapeHTML(kind)}" data-item-id="${escapeHTML(item.id)}" aria-label="Hapus ${escapeHTML(item.text)}">×</button>
      </div>`;
    }).join('');
  }

  function renderPlannerSummary() {
    const container = document.getElementById('plannerSummary');
    if (!container) return;
    const start = new Date(plannerDate.getFullYear(), plannerDate.getMonth(), plannerDate.getDate());
    let dates;
    if (plannerPeriod === 'weekly') {
      const dayOffset = (start.getDay() + 6) % 7;
      const monday = new Date(start.getFullYear(), start.getMonth(), start.getDate() - dayOffset);
      dates = Array.from({ length: 7 }, (_, index) => new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + index));
    } else {
      const monthStart = new Date(start.getFullYear(), start.getMonth(), 1);
      const count = new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate();
      dates = Array.from({ length: count }, (_, index) => new Date(monthStart.getFullYear(), monthStart.getMonth(), index + 1));
    }
    const populated = dates.map(date => ({ date, day: getPlannerDay(date) })).filter(({ day }) =>
      day.goals.length || day.priorities.length || day.tasks.length || day.appointments.length || day.note.trim() || day.mood
    );
    if (!populated.length) {
      container.innerHTML = `<div class="planner-summary-empty"><span>✦</span><h3>Belum ada rencana ${plannerPeriod === 'weekly' ? 'minggu' : 'bulan'} ini.</h3><p>Pilih hari untuk mulai menambahkan tujuan, tugas, dan janji.</p><button type="button" class="primary-button" data-planner-open-date="${plannerDateKey(start)}">Buka planner harian <span>→</span></button></div>`;
      return;
    }
    container.innerHTML = `<div class="planner-summary-heading"><div><span class="section-kicker">${plannerPeriod === 'weekly' ? 'RINGKASAN MINGGUAN' : 'RINGKASAN BULANAN'}</span><h3>${populated.length} hari dengan rencana</h3></div></div>
      <div class="planner-summary-list">${populated.map(({ date, day }) => {
        const key = plannerDateKey(date);
        const completed = [...day.goals, ...day.priorities, ...day.tasks].filter(item => item.done).length;
        const total = day.goals.length + day.priorities.length + day.tasks.length;
        const label = new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'long' }).format(date);
        return `<button type="button" class="planner-summary-day" data-planner-open-date="${key}">
          <span class="planner-summary-date">${escapeHTML(label)}</span><span class="planner-summary-mood">${day.mood ? escapeHTML(moodLabel(day.mood)) : '—'}</span>
          <span class="planner-summary-count">${completed}/${total} selesai</span><span class="planner-summary-count">${day.appointments.length} janji</span><span class="planner-summary-arrow">→</span>
        </button>`;
      }).join('')}</div>`;
  }

  function moodLabel(mood) {
    return ({ happy: 'Senang', calm: 'Tenang', tired: 'Lelah', focused: 'Fokus' })[mood] || '';
  }

  function renderPlanner() {
    const label = document.getElementById('plannerDateLabel');
    if (!label) return;
    const date = plannerDate;
    if (plannerPeriod === 'weekly') {
      const offset = (date.getDay() + 6) % 7;
      const monday = new Date(date.getFullYear(), date.getMonth(), date.getDate() - offset);
      const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6);
      label.textContent = `${new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short' }).format(monday)} – ${new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }).format(sunday)}`;
    } else if (plannerPeriod === 'monthly') {
      label.textContent = new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' }).format(date);
    } else {
      label.textContent = new Intl.DateTimeFormat('id-ID', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }).format(date);
    }
    document.querySelectorAll('[data-period]').forEach(button => {
      const active = button.dataset.period === plannerPeriod;
      button.classList.toggle('active', active);
      button.setAttribute('aria-selected', String(active));
    });
    const dayView = document.getElementById('plannerDayView');
    const summary = document.getElementById('plannerSummary');
    const isSummary = plannerPeriod === 'weekly' || plannerPeriod === 'monthly';
    dayView.hidden = isSummary;
    dayView.classList.toggle('notes-only', plannerPeriod === 'notes');
    summary.hidden = !isSummary;
    if (isSummary) {
      renderPlannerSummary();
      return;
    }
    const day = getPlannerDay();
    renderPlannerList('plannerGoals', day.goals, 'goals', { empty: 'Tambahkan tujuan kecil untuk hari ini.' });
    renderPlannerList('plannerPriorities', day.priorities, 'priorities', { empty: 'Pilih hal terpenting untuk hari ini.' });
    renderPlannerList('plannerTasks', day.tasks, 'tasks', { empty: 'Tugas kecil juga membawa progres.' });
    renderPlannerList('plannerAppointments', day.appointments, 'appointments', { empty: 'Jadwalmu masih kosong.', appointment: true });
    document.querySelectorAll('[data-mood]').forEach(button => {
      const selected = day.mood === button.dataset.mood;
      button.classList.toggle('selected', selected);
      button.setAttribute('aria-pressed', String(selected));
    });
    const note = document.getElementById('plannerNote');
    if (note && note.value !== day.note) note.value = day.note;
    setText('plannerSaveStatus', 'Tersimpan otomatis');
  }

  function addPlannerItem(form, kind) {
    const text = form.elements.text.value.trim();
    if (!text) return;
    const item = { id: plannerId(), text };
    if (kind === 'appointments') {
      const time = form.elements.time.value;
      if (!time) return;
      item.time = time;
    } else {
      item.done = false;
    }
    if (updatePlannerDay(day => {
      day[kind].push(item);
      if (kind === 'appointments') day.appointments.sort((a, b) => a.time.localeCompare(b.time));
    })) {
      form.reset();
      renderPlanner();
    }
  }

  function movePlannerDate(direction) {
    if (plannerPeriod === 'weekly') {
      plannerDate.setDate(plannerDate.getDate() + direction * 7);
    } else if (plannerPeriod === 'monthly') {
      plannerDate.setDate(1);
      plannerDate.setMonth(plannerDate.getMonth() + direction);
    } else {
      plannerDate.setDate(plannerDate.getDate() + direction);
    }
    renderPlanner();
  }

  function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
  }

  function renderQuiz() {
    const container = document.getElementById('quizContent');
    if (!container) return;
    setText('quizBestScore', `${state.bestQuiz} / 5`);
    if (todayCompleted('quiz')) {
      container.innerHTML = '<div class="empty-history quiz-result success">You completed today’s practice and earned 80 study points. Come back tomorrow for a new daily reward.</div>';
      return;
    }
    container.innerHTML = `<form id="quizForm" class="quiz-form">
      ${questions.map((question, index) => `<fieldset class="quiz-question"><legend>${index + 1}. ${question.question}</legend><div class="quiz-options">
        ${question.choices.map((choice, choiceIndex) => `<label class="quiz-option"><input type="radio" name="q${index}" value="${choiceIndex}" /><span>${choice}</span></label>`).join('')}
      </div></fieldset>`).join('')}
      <div id="quizResult" class="quiz-result" aria-live="polite"></div>
      <button class="primary-button" type="submit">Periksa jawaban <span>→</span></button>
    </form>`;
    document.getElementById('quizForm').addEventListener('submit', submitQuiz);
  }

  function renderTimerStatus() {
    const button = document.getElementById('activeTimerButton');
    if (!button) return;
    button.hidden = !state.activeSession;
    if (state.activeSession) {
      const remaining = Math.max(0, state.activeSession.expiresAt - Date.now());
      setText('activeTimerLabel', formatClock(remaining));
    }
  }

  function renderAll() {
    const stats = getStats();
    renderHeader(stats);
    renderHero(stats);
    renderQuestRows('dashboardQuests');
    renderQuestRows('missionPageList', true);
    renderSkills(stats);
    renderWorldMap(stats);
    renderAchievements(stats);
    renderHistory();
    renderQuiz();
    renderTimerStatus();
    renderPlanner();
    setText('missionDate', formatDate());
    setText('missionBannerTitle', stats.completed === quests.length ? 'You did it! All tasks are complete.' : `${stats.completed} of ${quests.length} tasks complete`);
    setText('missionBannerCopy', stats.completed === quests.length ? 'Take a well-deserved break. New tasks are here tomorrow.' : 'Study points are added when you finish each task.');
  }

  function formatClock(milliseconds) {
    const totalSeconds = Math.ceil(Math.max(0, milliseconds) / 1000);
    return `${String(Math.floor(totalSeconds / 60)).padStart(2, '0')}:${String(totalSeconds % 60).padStart(2, '0')}`;
  }

  function showTimer() {
    const overlay = document.getElementById('timerOverlay');
    if (!overlay) return;
    overlay.classList.add('open');
    overlay.setAttribute('aria-hidden', 'false');
    updateTimerDialog();
  }

  function hideTimer() {
    const overlay = document.getElementById('timerOverlay');
    overlay?.classList.remove('open');
    overlay?.setAttribute('aria-hidden', 'true');
  }

  function openQuest(questId) {
    const quest = quests.find(item => item.id === questId);
    if (!quest) return;
    if (quest.mode === 'quiz') {
      switchPage('arena');
      return;
    }
    if (todayCompleted(quest.id)) {
      notify('This task is already complete. Study points can only be earned once per day.');
      return;
    }
    if (state.activeSession) {
      showTimer();
      return;
    }
    nextFocusQuest = questId;
    setText('timerTitle', quest.mode === 'review' ? 'Revise Biology Notes' : 'Focus Timer');
    setText('timerDescription', quest.mode === 'review'
      ? 'Take 15 minutes to revisit one topic. Your study session is recorded automatically when the timer ends.'
      : 'Put distractions aside. Your 25-minute focus session is recorded automatically when the timer ends.');
    document.getElementById('studyTopic').value = '';
    document.getElementById('studyTopic').disabled = false;
    document.getElementById('startTimerButton').hidden = false;
    document.getElementById('cancelTimerButton').hidden = false;
    showTimer();
  }

  function startSession() {
    if (state.activeSession) {
      showTimer();
      return;
    }
    if (todayCompleted(nextFocusQuest)) {
      notify('You already completed this task today.');
      hideTimer();
      return;
    }
    const quest = quests.find(item => item.id === nextFocusQuest);
    if (!quest || !quest.duration) return;
    const now = Date.now();
    const topic = document.getElementById('studyTopic').value.trim().slice(0, 60);
    const active = {
      id: `${now.toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      questId: quest.id,
      mode: quest.mode,
      topic,
      minutes: quest.duration,
      startedAt: now,
      expiresAt: now + quest.duration * 60 * 1000
    };
    if (!mutateState(() => { state.activeSession = active; })) return;
    setText('timerTitle', quest.mode === 'review' ? 'Review session in progress' : 'Focus session in progress');
    setText('timerDescription', topic ? `Focused on: ${topic}` : 'You can close the timer. Your session keeps running in the background.');
    document.getElementById('studyTopic').disabled = true;
    document.getElementById('startTimerButton').hidden = true;
    document.getElementById('cancelTimerButton').hidden = false;
    setText('timerRunningNote', 'Your timer continues while you move around. Study points are added when it ends.');
    startTicker();
    renderAll();
    tickTimer();
  }

  function cancelSession() {
    if (!state.activeSession) {
      hideTimer();
      return;
    }
    if (!window.confirm('Batalkan sesi ini? Waktu belajar dan XP tidak akan dicatat.')) return;
    if (!mutateState(() => { state.activeSession = null; })) return;
    window.clearInterval(timerInterval);
    hideTimer();
    renderAll();
    notify('Session canceled. You can try this task again today.');
  }

  function finishSession() {
    const active = state.activeSession;
    if (!active || active.expiresAt > Date.now()) return;
    const minutes = active.minutes;
    const existingAward = state.awards[localDate()] && state.awards[localDate()][active.questId];
    const xp = existingAward ? 0 : (quests.find(item => item.id === active.questId)?.reward || 0);
    const record = {
      id: active.id,
      date: localDate(),
      finishedAt: new Date().toISOString(),
      topic: active.topic || (active.mode === 'review' ? 'Review session' : 'Focus session'),
      mode: active.mode,
      minutes,
      xp
    };
    const previousLevel = currentLevel().index;
    if (!mutateState(() => {
      if (state.sessions.some(item => item.id === active.id)) return;
      state.sessions.push(record);
      if (!state.awards[record.date]) state.awards[record.date] = {};
      if (!state.awards[record.date][active.questId]) {
        state.awards[record.date][active.questId] = { xp, completedAt: record.finishedAt, score: null };
      }
      state.activeSession = null;
    })) return;
    window.clearInterval(timerInterval);
    hideTimer();
    renderAll();
    notify(xp ? `Study session complete! +${xp} study points. 🎉` : 'Session complete. Today’s task has already earned its points.');
    if (currentLevel().index > previousLevel) notify(`Level up! Welcome, ${currentLevel().current.title}! ✨`);
  }

  function updateTimerDialog() {
    const active = state.activeSession;
    if (!active) {
      setText('timerClock', `${String(quests.find(item => item.id === nextFocusQuest)?.duration || 25).padStart(2, '0')}:00`);
      setText('timerRunningNote', 'Your session will be saved automatically when the timer ends.');
      document.getElementById('startTimerButton').hidden = false;
      document.getElementById('cancelTimerButton').hidden = false;
      document.getElementById('studyTopic').disabled = false;
      return;
    }
    const quest = quests.find(item => item.id === active.questId);
    setText('timerTitle', active.mode === 'review' ? 'Review session in progress' : 'Focus session in progress');
    setText('timerDescription', active.topic ? `Focused on: ${active.topic}` : 'You can close the timer. Your session keeps running in the background.');
    setText('timerClock', formatClock(active.expiresAt - Date.now()));
    setText('timerRunningNote', 'Your timer continues while you move around. Study points are added when it ends.');
    document.getElementById('studyTopic').value = active.topic || '';
    document.getElementById('studyTopic').disabled = true;
    document.getElementById('startTimerButton').hidden = true;
    document.getElementById('cancelTimerButton').hidden = false;
    if (!quest) return;
  }

  function tickTimer() {
    if (!state.activeSession) {
      renderTimerStatus();
      return;
    }
    if (state.activeSession.expiresAt <= Date.now()) {
      finishSession();
      return;
    }
    setText('timerClock', formatClock(state.activeSession.expiresAt - Date.now()));
    renderTimerStatus();
  }

  function startTicker() {
    window.clearInterval(timerInterval);
    timerInterval = window.setInterval(tickTimer, 1000);
  }

  function submitQuiz(event) {
    event.preventDefault();
    if (todayCompleted('quiz')) {
      renderQuiz();
      return;
    }
    const form = event.currentTarget;
    let score = 0;
    for (let index = 0; index < questions.length; index += 1) {
      const answer = form.querySelector(`input[name="q${index}"]:checked`);
      if (!answer) {
        setQuizResult('Please choose an answer for every question first.', 'error');
        return;
      }
      if (Number(answer.value) === questions[index].answer) score += 1;
    }
    const previousLevel = currentLevel().index;
    if (score >= 4) {
      if (!awardQuest('quiz', { score })) return;
      renderAll();
      setQuizResult(`Great work! ${score}/5 correct — task complete, +80 study points.`, 'success');
      if (currentLevel().index > previousLevel) notify(`Level up! Selamat datang, ${currentLevel().current.title}! ✨`);
    } else {
      if (!mutateState(() => { state.bestQuiz = Math.max(state.bestQuiz, score); })) return;
      renderQuiz();
      setQuizResult(`${score}/5 correct. You need 4 correct answers to complete this task. Try again!`, 'error');
    }
  }

  function setQuizResult(message, tone) {
    const result = document.getElementById('quizResult');
    if (!result) return;
    result.textContent = message;
    result.className = `quiz-result ${tone}`;
  }

  function switchPage(name) {
    const page = document.getElementById(`page-${name}`);
    if (!page) return;
    document.querySelectorAll('.page').forEach(item => item.classList.toggle('active', item === page));
    document.querySelectorAll('[data-page]').forEach(button => button.classList.toggle('active', button.dataset.page === name));
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('mobileBackdrop').classList.remove('open');
    renderHeader(getStats());
    if (name === 'planner') renderPlanner();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  document.addEventListener('click', event => {
    const periodButton = event.target.closest('[data-period]');
    if (periodButton) {
      plannerPeriod = periodButton.dataset.period;
      renderPlanner();
      return;
    }
    if (event.target.closest('#plannerPrev')) {
      movePlannerDate(-1);
      return;
    }
    if (event.target.closest('#plannerNext')) {
      movePlannerDate(1);
      return;
    }
    if (event.target.closest('#plannerToday')) {
      plannerDate = new Date();
      renderPlanner();
      return;
    }
    const moodButton = event.target.closest('[data-mood]');
    if (moodButton) {
      const mood = moodButton.dataset.mood;
      updatePlannerDay(day => { day.mood = day.mood === mood ? '' : mood; });
      renderPlanner();
      return;
    }
    const toggleButton = event.target.closest('[data-planner-toggle]');
    if (toggleButton) {
      const { plannerToggle: kind, itemId } = toggleButton.dataset;
      updatePlannerDay(day => {
        const item = day[kind].find(entry => entry.id === itemId);
        if (item) item.done = !item.done;
      });
      renderPlanner();
      return;
    }
    const removeButton = event.target.closest('[data-planner-remove]');
    if (removeButton) {
      const { plannerRemove: kind, itemId } = removeButton.dataset;
      updatePlannerDay(day => { day[kind] = day[kind].filter(item => item.id !== itemId); });
      renderPlanner();
      return;
    }
    const openDate = event.target.closest('[data-planner-open-date]');
    if (openDate) {
      const [year, month, day] = openDate.dataset.plannerOpenDate.split('-').map(Number);
      plannerDate = new Date(year, month - 1, day);
      plannerPeriod = 'daily';
      renderPlanner();
      return;
    }
    const nav = event.target.closest('[data-page]');
    if (nav) {
      switchPage(nav.dataset.page);
      return;
    }
    const go = event.target.closest('[data-go]');
    if (go) {
      switchPage(go.dataset.go);
      return;
    }
    const questButton = event.target.closest('[data-quest]');
    if (questButton && !questButton.disabled) openQuest(questButton.dataset.quest);
  });

  document.getElementById('plannerGoalForm').addEventListener('submit', event => {
    event.preventDefault();
    addPlannerItem(event.currentTarget, 'goals');
  });
  document.getElementById('plannerPriorityForm').addEventListener('submit', event => {
    event.preventDefault();
    addPlannerItem(event.currentTarget, 'priorities');
  });
  document.getElementById('plannerTaskForm').addEventListener('submit', event => {
    event.preventDefault();
    addPlannerItem(event.currentTarget, 'tasks');
  });
  document.getElementById('plannerAppointmentForm').addEventListener('submit', event => {
    event.preventDefault();
    addPlannerItem(event.currentTarget, 'appointments');
  });
  document.getElementById('plannerNote').addEventListener('input', event => {
    const note = event.currentTarget.value;
    const date = new Date(plannerDate.getFullYear(), plannerDate.getMonth(), plannerDate.getDate());
    setText('plannerSaveStatus', 'Menyimpan...');
    window.clearTimeout(plannerSaveTimer);
    plannerSaveTimer = window.setTimeout(() => {
      plannerSaveTimer = null;
      if (updatePlannerDay(day => { day.note = note; }, date)) setText('plannerSaveStatus', 'Tersimpan otomatis');
    }, 350);
  });
  document.getElementById('plannerNote').addEventListener('blur', () => {
    if (!plannerSaveTimer) return;
    window.clearTimeout(plannerSaveTimer);
    plannerSaveTimer = null;
    const note = document.getElementById('plannerNote').value;
    const date = new Date(plannerDate.getFullYear(), plannerDate.getMonth(), plannerDate.getDate());
    if (updatePlannerDay(day => { day.note = note; }, date)) setText('plannerSaveStatus', 'Tersimpan otomatis');
  });

  document.getElementById('logoutBtn').addEventListener('click', () => {
    sessionStorage.removeItem('gwcatat_session');
    window.location.href = 'login.html';
  });
  document.getElementById('mobileFocusButton').addEventListener('click', () => {
    openQuest(todayCompleted('focus') ? 'review' : 'focus');
  });
  document.getElementById('mobileMenuButton').addEventListener('click', () => {
    document.getElementById('sidebar').classList.add('open');
    document.getElementById('mobileBackdrop').classList.add('open');
  });
  document.getElementById('mobileBackdrop').addEventListener('click', () => {
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('mobileBackdrop').classList.remove('open');
  });
  document.getElementById('activeTimerButton').addEventListener('click', () => {
    if (state.activeSession) {
      updateTimerDialog();
      showTimer();
    }
  });
  document.getElementById('closeTimerButton').addEventListener('click', hideTimer);
  document.getElementById('startTimerButton').addEventListener('click', startSession);
  document.getElementById('cancelTimerButton').addEventListener('click', cancelSession);
  document.getElementById('timerOverlay').addEventListener('click', event => {
    if (event.target === event.currentTarget) hideTimer();
  });
  window.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      hideTimer();
      document.getElementById('sidebar').classList.remove('open');
      document.getElementById('mobileBackdrop').classList.remove('open');
    }
  });
  window.addEventListener('storage', event => {
    if (event.key === plannerStorageKey) {
      plannerState = loadPlannerState();
      renderPlanner();
    }
    if (event.key !== storageKey) return;
    state = loadState();
    renderAll();
    if (state.activeSession) {
      updateTimerDialog();
      startTicker();
    } else {
      window.clearInterval(timerInterval);
      hideTimer();
    }
  });

  renderAll();
  if (state.activeSession) {
    nextFocusQuest = state.activeSession.questId;
    updateTimerDialog();
    startTicker();
  }
})();
