(() => {
  const session = JSON.parse(sessionStorage.getItem('gwcatat_session') || 'null');
  const userKey = session && session.email
    ? `gwcatat_${session.email.replace(/[^a-zA-Z0-9]/g, '_')}_adventure`
    : 'gwcatat_adventure';

  const missions = [
    { id: 'income', title: 'Catat uang masuk', detail: 'Simpan satu transaksi pendapatan hari ini.', reward: 20, type: 'in', action: 'income', icon: '↗' },
    { id: 'expense', title: 'Catat pengeluaran', detail: 'Catat pengeluaran hari ini agar arus kas tetap jelas.', reward: 20, type: 'out', action: 'expense', icon: '↘' },
    { id: 'saving', title: 'Sisihkan untuk masa depan', detail: 'Buat alokasi tabungan atau dana darurat hari ini.', reward: 30, type: 'saving', action: 'saving', icon: '◉' }
  ];
  const levels = [
    { name: 'Pemula', xp: 0 },
    { name: 'Penjelajah', xp: 300 },
    { name: 'Perencana', xp: 700 },
    { name: 'Strategis', xp: 1200 },
    { name: 'Pelindung', xp: 1800 },
    { name: 'Master', xp: 2600 }
  ];

  function localDateKey(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function loadProgress() {
    try {
      const saved = JSON.parse(localStorage.getItem(userKey) || '{"completions":[]}');
      return {
        completions: Array.isArray(saved.completions)
          ? saved.completions.filter(item => item && typeof item.date === 'string' && typeof item.missionId === 'string' && Number.isFinite(item.xp))
          : []
      };
    } catch (error) {
      console.error('Unable to read adventure progress:', error);
      return { completions: [] };
    }
  }

  let progress = loadProgress();

  function saveProgress() {
    try {
      localStorage.setItem(userKey, JSON.stringify(progress));
      return true;
    } catch (error) {
      console.error('Unable to save adventure progress:', error);
      showNotice('Progres misi tidak dapat disimpan di perangkat ini.');
      return false;
    }
  }

  function showNotice(message) {
    let notice = document.getElementById('gameNotice');
    if (!notice) {
      notice = document.createElement('div');
      notice.id = 'gameNotice';
      notice.className = 'game-notice';
      notice.setAttribute('role', 'status');
      document.body.appendChild(notice);
    }
    notice.textContent = message;
    notice.classList.add('visible');
    window.clearTimeout(showNotice.timeout);
    showNotice.timeout = window.setTimeout(() => notice.classList.remove('visible'), 3200);
  }

  function completedToday(missionId, dateKey = localDateKey(new Date())) {
    return progress.completions.some(item => item.date === dateKey && item.missionId === missionId);
  }

  function isSavingTransaction(transaction) {
    return transaction.type === 'out' && ['tabungan', 'darurat'].includes(transaction.category);
  }

  function awardForTransaction(transaction) {
    if (!transaction || !transaction.createdAt) return;
    const createdAt = new Date(transaction.createdAt);
    if (Number.isNaN(createdAt.getTime())) return;
    const dateKey = localDateKey(createdAt);
    const matched = missions.filter(mission => {
      if (completedToday(mission.id, dateKey)) return false;
      if (mission.type === 'saving') return isSavingTransaction(transaction);
      return transaction.type === mission.type;
    });

    if (!matched.length) return;
    const additions = matched.map(mission => ({ date: dateKey, missionId: mission.id, xp: mission.reward }));
    progress.completions.push(...additions);
    if (!saveProgress()) {
      progress.completions.splice(-additions.length);
      return;
    }
    const earnedXp = matched.reduce((total, mission) => total + mission.reward, 0);
    const completedNames = matched.map(mission => mission.title).join(' · ');
    showNotice(`${completedNames} · +${earnedXp} XP`);
    render();
  }

  function getStats() {
    const totalXp = progress.completions.reduce((total, item) => total + item.xp, 0);
    const levelIndex = Math.max(0, levels.findIndex((level, index) => {
      const next = levels[index + 1];
      return totalXp >= level.xp && (!next || totalXp < next.xp);
    }));
    const currentLevel = levels[levelIndex];
    const nextLevel = levels[levelIndex + 1];
    const currentProgress = totalXp - currentLevel.xp;
    const levelRange = nextLevel ? nextLevel.xp - currentLevel.xp : 0;
    const percent = nextLevel ? Math.min(100, Math.round((currentProgress / levelRange) * 100)) : 100;
    const today = localDateKey(new Date());
    const todayCount = missions.filter(mission => completedToday(mission.id, today)).length;
    const activityDates = new Set(progress.completions.map(item => item.date));
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    let cursor = activityDates.has(today) ? new Date() : (activityDates.has(localDateKey(yesterday)) ? yesterday : null);
    let streak = 0;

    while (cursor && activityDates.has(localDateKey(cursor))) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    }

    return { totalXp, levelIndex, currentLevel, nextLevel, currentProgress, levelRange, percent, todayCount, streak };
  }

  function renderHome(stats) {
    const level = document.getElementById('homeGameLevel');
    if (level) level.textContent = `Level ${stats.levelIndex + 1} · ${stats.currentLevel.name}`;
    const xp = document.getElementById('homeGameXp');
    if (xp) xp.textContent = `${stats.totalXp} XP`;
    const fill = document.getElementById('homeGameProgressFill');
    if (fill) fill.style.width = `${stats.percent}%`;
    const text = document.getElementById('homeGameProgressText');
    if (text) text.textContent = stats.nextLevel
      ? `${stats.currentProgress} / ${stats.levelRange} XP menuju level berikutnya`
      : 'Level tertinggi tercapai';
    const streak = document.getElementById('homeGameStreak');
    if (streak) streak.textContent = stats.streak;
  }

  function renderMissions(stats) {
    const container = document.getElementById('gameDailyQuests');
    if (!container) return;
    const today = localDateKey(new Date());
    container.innerHTML = missions.map(mission => {
      const done = completedToday(mission.id, today);
      return `
        <article class="game-quest ${done ? 'is-complete' : ''}">
          <div class="game-quest-icon">${mission.icon}</div>
          <div class="game-quest-copy">
            <h3>${mission.title}</h3>
            <p>${mission.detail}</p>
            <span class="game-quest-status">${done ? 'Selesai hari ini' : 'Belum selesai'}</span>
          </div>
          <div class="game-quest-reward"><strong>+${mission.reward}</strong><small>XP</small></div>
          <button type="button" class="game-quest-action" data-game-action="${mission.action}" ${done ? 'disabled' : ''}>
            ${done ? 'Selesai' : 'Mulai'}
          </button>
        </article>
      `;
    }).join('');

    const count = document.getElementById('gameTodayCount');
    if (count) count.textContent = `${stats.todayCount} / ${missions.length}`;
    const date = document.getElementById('gameTodayLabel');
    if (date) date.textContent = new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date());
  }

  function renderLevels(stats) {
    const title = document.getElementById('gameLevelTitle');
    if (title) title.textContent = stats.currentLevel.name;
    const number = document.getElementById('gameLevelNumber');
    if (number) number.textContent = String(stats.levelIndex + 1).padStart(2, '0');
    const xpText = document.getElementById('gameXpProgressText');
    if (xpText) xpText.textContent = stats.nextLevel
      ? `${stats.currentProgress} / ${stats.levelRange} XP menuju level berikutnya`
      : 'Level tertinggi tercapai';
    const fill = document.getElementById('gameXpProgressFill');
    if (fill) fill.style.width = `${stats.percent}%`;

    const total = document.getElementById('gameTotalXp');
    if (total) total.textContent = `${stats.totalXp} XP`;
    const streak = document.getElementById('gameStreak');
    if (streak) streak.textContent = `${stats.streak} hari`;

    const map = document.getElementById('gameLevelMap');
    if (map) {
      map.innerHTML = levels.map((level, index) => {
        const reached = stats.totalXp >= level.xp;
        const current = stats.levelIndex === index;
        return `
          <div class="game-map-step ${reached ? 'is-reached' : ''} ${current ? 'is-current' : ''}">
            <span class="game-map-node">${reached ? '✓' : String(index + 1).padStart(2, '0')}</span>
            <strong>${level.name}</strong>
            <small>${level.xp.toLocaleString('id-ID')} XP</small>
          </div>
        `;
      }).join('');
    }
  }

  function renderAchievements(stats) {
    const container = document.getElementById('gameAchievements');
    if (!container) return;
    const savingsDays = new Set(progress.completions.filter(item => item.missionId === 'saving').map(item => item.date)).size;
    const achievements = [
      { title: 'Langkah pertama', detail: 'Selesaikan satu misi', icon: '✦', unlocked: progress.completions.length > 0 },
      { title: 'Mulai menabung', detail: 'Sisihkan uang pada 5 hari berbeda', icon: '◉', unlocked: savingsDays >= 5 },
      { title: 'Tiga hari beruntun', detail: 'Jaga streak selama 3 hari', icon: '🔥', unlocked: stats.streak >= 3 },
      { title: 'Penjelajah', detail: 'Raih 300 XP', icon: '⌁', unlocked: stats.totalXp >= 300 }
    ];
    container.innerHTML = achievements.map(item => `
      <article class="game-achievement ${item.unlocked ? 'is-unlocked' : ''}">
        <span>${item.icon}</span>
        <strong>${item.title}</strong>
        <small>${item.unlocked ? 'Terbuka' : item.detail}</small>
      </article>
    `).join('');
  }

  function render() {
    const stats = getStats();
    renderHome(stats);
    renderMissions(stats);
    renderLevels(stats);
    renderAchievements(stats);
  }

  document.addEventListener('click', event => {
    const actionButton = event.target.closest('[data-game-action]');
    if (actionButton && !actionButton.disabled) {
      window.dispatchEvent(new CustomEvent('gwcatat:open-transaction', {
        detail: { action: actionButton.dataset.gameAction }
      }));
      return;
    }
    const gameTab = event.target.closest('.game-link-button[data-tab="petualangan"]');
    if (gameTab) window.dispatchEvent(new CustomEvent('gwcatat:switch-tab', { detail: { tab: 'petualangan' } }));
  });

  window.addEventListener('gwcatat:transaction-saved', event => awardForTransaction(event.detail));
  window.gwcatatRenderGamification = render;
  render();
})();
