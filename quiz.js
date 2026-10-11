// Μηχανή Εξεταστικού Κέντρου & Quiz με Αποθήκευση και Οπτική Σήμανση
class QuizEngine {
  constructor() {
    this.allQuestions = questionsData;
    this.currentList = [];
    this.currentIndex = 0;
    this.userAnswers = {}; // id -> selected option index
    this.score = 0;
    this.mode = 'exam'; // 'exam', 'study', 'category', 'saved'
    this.selectedCategory = 'all';
    this.timer = null;
    this.timeRemaining = 40 * 60; // 40 λεπτά
    this.examTimeLimit = 40 * 60;
    this.isExamSubmitted = false;
    this.MASTERY_STREAK = 2;      // σωστές στη σειρά για αυτόματη αφαίρεση από τις Αποθηκευμένες
    this.showAllStats = false;

    this.initElements();
    this.bindEvents();
    this.updateSavedCount();
  }

  initElements() {
    // Buttons & Selectors
    this.btnExamMode = document.getElementById('btn-exam-mode');
    this.btnStudyMode = document.getElementById('btn-study-mode');
    this.btnSavedMode = document.getElementById('btn-saved-mode');
    this.categorySelect = document.getElementById('category-filter');

    // UI containers
    this.quizIntro = document.getElementById('quiz-intro');
    this.quizActive = document.getElementById('quiz-active');
    this.quizResults = document.getElementById('quiz-results');
    this.quizCard = document.getElementById('quiz-question-card');
    
    // In-quiz elements
    this.badgeMode = document.getElementById('quiz-badge-mode');
    this.badgeCat = document.getElementById('quiz-badge-cat');
    this.timerDisplay = document.getElementById('quiz-timer');
    this.timerContainer = document.getElementById('timer-container');
    this.progressText = document.getElementById('quiz-progress-text');
    this.progressBar = document.getElementById('quiz-progress-bar');
    this.questionText = document.getElementById('quiz-question-text');
    this.optionsList = document.getElementById('quiz-options-list');
    this.feedbackBanner = document.getElementById('quiz-feedback-banner');
    this.btnBookmark = document.getElementById('btn-bookmark-question');

    // Controls
    this.btnPrev = document.getElementById('btn-prev');
    this.btnNext = document.getElementById('btn-next');
    this.btnSubmitExam = document.getElementById('btn-submit-exam');
    this.btnRestart = document.getElementById('btn-restart');
    this.btnReviewAll = document.getElementById('btn-review-all');

    // Results UI
    this.resultScore = document.getElementById('result-score');
    this.resultMax = document.getElementById('result-max');
    this.resultBadge = document.getElementById('result-badge');
    this.resultMessage = document.getElementById('result-message');
    this.resultDetails = document.getElementById('result-details');
    this.savedCountBadge = document.getElementById('saved-questions-count');
  }

  bindEvents() {
    if (this.btnExamMode) {
      this.btnExamMode.addEventListener('click', () => this.startQuiz('exam'));
    }
    if (this.btnStudyMode) {
      this.btnStudyMode.addEventListener('click', () => this.startQuiz('study'));
    }
    if (this.btnSavedMode) {
      this.btnSavedMode.addEventListener('click', () => this.startQuiz('saved'));
    }

    const quizBackBtn = document.getElementById('quiz-back-btn');
    if (quizBackBtn) {
      quizBackBtn.addEventListener('click', (e) => {
        if (this.quizActive && !this.quizActive.classList.contains('hidden')) {
          e.preventDefault();
          e.stopPropagation();
          this.resetToIntro();
        }
      });
    }
    if (this.categorySelect) {
      this.categorySelect.addEventListener('change', (e) => {
        this.selectedCategory = e.target.value;
        this.startQuiz('category');
      });
    }
    if (this.btnNext) {
      this.btnNext.addEventListener('click', () => this.nextQuestion());
    }
    if (this.btnPrev) {
      this.btnPrev.addEventListener('click', () => this.prevQuestion());
    }
    if (this.btnSubmitExam) {
      this.btnSubmitExam.addEventListener('click', () => {
        const qData = this.currentList[this.currentIndex];
        if (this.userAnswers[qData.id] === undefined) {
          alert('Η απάντηση είναι υποχρεωτική! Παρακαλούμε επιλέξτε μία απάντηση.');
          return;
        }
        const unanswered = this.currentList.filter(q => this.userAnswers[q.id] === undefined);
        if (unanswered.length > 0) {
          alert(`Υπάρχουν ${unanswered.length} αναπάντητες ερωτήσεις. Κάθε απάντηση είναι υποχρεωτική.`);
          return;
        }
        const confirmMsg = (this.mode === 'exam')
          ? 'Είστε βέβαιοι ότι θέλετε να ολοκληρώσετε και να υποβάλετε το γραπτό σας;'
          : 'Είστε βέβαιοι ότι θέλετε να ολοκληρώσετε την εξάσκηση;';
        if (confirm(confirmMsg)) {
          this.finishQuiz();
        }
      });
    }
    if (this.btnRestart) {
      this.btnRestart.addEventListener('click', () => this.resetToIntro());
    }
    if (this.btnReviewAll) {
      this.btnReviewAll.addEventListener('click', () => this.renderReviewMode());
    }
    if (this.btnBookmark) {
      this.btnBookmark.addEventListener('click', () => this.toggleBookmarkCurrent());
    }
  }

  // --- Στατιστικά ανά ερώτηση & Ιστορικό Τεστ (LocalStorage) ---
  readJSON(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      return fallback;
    }
  }

  writeJSON(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {}
  }

  getStats() {
    return this.readJSON('speedboat_stats', {});
  }

  // Καταγράφει μια απάντηση. Επιστρέφει true αν η ερώτηση αφαιρέθηκε αυτόματα από τις Αποθηκευμένες.
  recordAnswer(qData, isCorrect) {
    const stats = this.getStats();
    const now = Date.now();
    const s = stats[qData.id] || { right: 0, wrong: 0, streak: 0, last: 0, lastWrong: 0, log: [] };

    if (isCorrect) {
      s.right++;
      s.streak++;
    } else {
      s.wrong++;
      s.streak = 0;
      s.lastWrong = now;
    }
    s.last = now;
    s.log = [...(s.log || []), [now, isCorrect ? 1 : 0]].slice(-10);
    stats[qData.id] = s;
    this.writeJSON('speedboat_stats', stats);

    if (isCorrect && s.streak >= this.MASTERY_STREAK && this.isQuestionSaved(qData.id)) {
      this.removeSavedQuestion(qData.id);
      return true;
    }
    return false;
  }

  saveHistoryEntry(total) {
    const history = this.readJSON('speedboat_history', []);
    const isExam = this.mode === 'exam';
    const labels = {
      exam: 'Προσομοίωση Εξέτασης',
      study: 'Ελεύθερη Μελέτη',
      category: `Θεματική: ${this.selectedCategory}`,
      saved: 'Τεστ Αποθηκευμένων'
    };
    history.unshift({
      ts: Date.now(),
      mode: this.mode,
      label: labels[this.mode] || this.mode,
      score: this.score,
      total: total,
      passed: isExam ? this.score >= 18 : null
    });
    this.writeJSON('speedboat_history', history.slice(0, 100));
  }

  formatDate(ts) {
    if (!ts) return '—';
    return new Date(ts).toLocaleString('el-GR', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  }

  toggleStatsAll() {
    this.showAllStats = !this.showAllStats;
    this.renderStats();
  }

  resetStats() {
    if (!confirm('Θέλετε να διαγράψετε όλα τα στατιστικά και το ιστορικό τεστ; Οι Αποθηκευμένες ερωτήσεις δεν θα επηρεαστούν.')) return;
    try {
      localStorage.removeItem('speedboat_stats');
      localStorage.removeItem('speedboat_history');
    } catch (e) {}
    this.renderStats();
  }

  renderStats() {
    const summaryEl = document.getElementById('stats-summary');
    const historyEl = document.getElementById('stats-history');
    const questionsEl = document.getElementById('stats-questions');
    if (!summaryEl || !historyEl || !questionsEl) return;

    const stats = this.getStats();
    const history = this.readJSON('speedboat_history', []);
    const entries = Object.entries(stats);

    // --- Σύνοψη ---
    const totalRight = entries.reduce((n, [, s]) => n + s.right, 0);
    const totalWrong = entries.reduce((n, [, s]) => n + s.wrong, 0);
    const totalAnswers = totalRight + totalWrong;
    const pct = totalAnswers ? Math.round((totalRight / totalAnswers) * 100) : 0;
    const mastered = entries.filter(([, s]) => s.streak >= this.MASTERY_STREAK).length;

    const card = (label, value, cls) => `
      <div class="bg-white p-3 rounded-xl border border-slate-200 shadow-sm text-center">
        <div class="text-xs text-slate-500 font-medium">${label}</div>
        <div class="text-xl font-extrabold ${cls}">${value}</div>
      </div>`;
    summaryEl.innerHTML =
      card('Συνολικές Απαντήσεις', totalAnswers, 'text-slate-800') +
      card('Ποσοστό Επιτυχίας', pct + '%', 'text-sky-600') +
      card('Ερωτήσεις που έχετε δει', `${entries.length}/${this.allQuestions.length}`, 'text-slate-800') +
      card('Εμπεδωμένες', mastered, 'text-emerald-600');

    // --- Ιστορικό τεστ (τελευταία 20) ---
    if (history.length === 0) {
      historyEl.innerHTML = `<p class="text-sm text-slate-500 italic">Δεν υπάρχει ιστορικό ακόμη. Ολοκληρώστε μια προσομοίωση εξέτασης για να εμφανιστεί εδώ.</p>`;
    } else {
      historyEl.innerHTML = history.slice(0, 20).map(h => {
        let badge;
        if (h.passed === null) {
          badge = `<span class="px-2.5 py-0.5 rounded-full text-xs font-bold bg-sky-100 text-sky-800 border border-sky-200">${Math.round((h.score / h.total) * 100)}%</span>`;
        } else if (h.passed) {
          badge = `<span class="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">ΕΠΙΤΥΧΙΑ</span>`;
        } else {
          badge = `<span class="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">ΑΠΟΤΥΧΙΑ</span>`;
        }
        return `
          <div class="flex items-center justify-between gap-3 p-3 rounded-lg border border-slate-200 bg-white text-sm">
            <div>
              <div class="font-semibold text-slate-800">${h.label}</div>
              <div class="text-xs text-slate-500">${this.formatDate(h.ts)}</div>
            </div>
            <div class="flex items-center gap-3">
              <span class="font-extrabold text-slate-800">${h.score}/${h.total}</span>
              ${badge}
            </div>
          </div>`;
      }).join('');
    }

    // --- Ερωτήσεις με λάθη (πιο προβληματικές πρώτες) ---
    const byId = new Map(this.allQuestions.map(item => [item.id, item]));
    const rows = entries
      .filter(([id, s]) => s.wrong > 0 && byId.has(Number(id)))
      .sort((a, b) => b[1].wrong - a[1].wrong || a[1].streak - b[1].streak);

    if (rows.length === 0) {
      questionsEl.innerHTML = `<p class="text-sm text-slate-500 italic">Δεν έχετε κάνει λάθος σε καμία ερώτηση ακόμη.</p>`;
      return;
    }

    const shown = this.showAllStats ? rows : rows.slice(0, 15);
    questionsEl.innerHTML = shown.map(([id, s]) => {
      const qd = byId.get(Number(id));
      const dots = (s.log || []).map(([t, ok]) =>
        `<span title="${this.formatDate(t)}" class="inline-block w-2.5 h-2.5 rounded-full ${ok ? 'bg-emerald-500' : 'bg-rose-500'}"></span>`
      ).join('');
      const savedBadge = this.isQuestionSaved(qd.id)
        ? `<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">Αποθηκευμένη</span>`
        : `<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">Εμπεδώθηκε</span>`;
      return `
        <div class="p-3 rounded-lg border border-slate-200 bg-white text-sm space-y-1.5">
          <div class="flex items-start justify-between gap-3">
            <p class="font-semibold text-slate-800">${qd.q}</p>
            ${savedBadge}
          </div>
          <div class="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
            <span class="text-emerald-700 font-bold">Σωστές: ${s.right}</span>
            <span class="text-rose-700 font-bold">Λάθος: ${s.wrong}</span>
            <span>Σερί: ${Math.min(s.streak, this.MASTERY_STREAK)}/${this.MASTERY_STREAK}</span>
            <span class="flex items-center gap-1">${dots}</span>
          </div>
          <div class="text-[11px] text-slate-500">
            Τελευταία απάντηση: ${this.formatDate(s.last)} · Τελευταίο λάθος: ${this.formatDate(s.lastWrong)}
          </div>
        </div>`;
    }).join('');

    if (rows.length > 15) {
      questionsEl.innerHTML += `
        <button onclick="quizApp.toggleStatsAll()" class="text-xs text-sky-600 hover:text-sky-800 font-semibold underline">
          ${this.showAllStats ? 'Εμφάνιση λιγότερων' : `Εμφάνιση όλων (${rows.length})`}
        </button>`;
    }
  }

  // --- Αποθήκευση Ερωτήσεων (LocalStorage) ---
  getSavedQuestionIds() {
    try {
      const stored = localStorage.getItem('speedboat_saved_questions');
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      return [];
    }
  }

  isQuestionSaved(id) {
    return this.getSavedQuestionIds().includes(id);
  }

  saveQuestion(id) {
    try {
      let saved = this.getSavedQuestionIds();
      if (!saved.includes(id)) {
        saved.push(id);
        localStorage.setItem('speedboat_saved_questions', JSON.stringify(saved));
      }
      this.updateSavedCount();
      this.updateBookmarkButtonState(id);
    } catch (e) {}
  }

  removeSavedQuestion(id) {
    try {
      let saved = this.getSavedQuestionIds();
      saved = saved.filter(item => item !== id);
      localStorage.setItem('speedboat_saved_questions', JSON.stringify(saved));
      this.updateSavedCount();
      this.updateBookmarkButtonState(id);
    } catch (e) {}
  }

  toggleBookmarkCurrent() {
    const qData = this.currentList[this.currentIndex];
    if (!qData) return;
    if (this.isQuestionSaved(qData.id)) {
      this.removeSavedQuestion(qData.id);
    } else {
      this.saveQuestion(qData.id);
    }
  }

  updateBookmarkButtonState(id) {
    if (!this.btnBookmark) return;
    const isSaved = this.isQuestionSaved(id);
    if (isSaved) {
      this.btnBookmark.innerHTML = `<span class="hidden sm:inline">Αποθηκευμένη</span>`;
      this.btnBookmark.className = "px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-500 text-white hover:bg-amber-600 transition-colors shadow-sm flex items-center space-x-1";
    } else {
      this.btnBookmark.innerHTML = `<span class="hidden sm:inline">Αποθήκευση</span>`;
      this.btnBookmark.className = "px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors border border-slate-300 flex items-center space-x-1";
    }
  }

  updateSavedCount() {
    const count = this.getSavedQuestionIds().length;
    if (this.savedCountBadge) {
      this.savedCountBadge.textContent = count;
    }
    const sidebarBadge = document.getElementById('sidebar-saved-badge');
    if (sidebarBadge) {
      sidebarBadge.textContent = count;
    }
    if (this.btnSavedMode) {
      this.btnSavedMode.disabled = (count === 0);
      if (count === 0) {
        this.btnSavedMode.classList.add('opacity-50', 'cursor-not-allowed');
      } else {
        this.btnSavedMode.classList.remove('opacity-50', 'cursor-not-allowed');
      }
    }
  }

  // --- Έναρξη Quiz ---
  startQuiz(mode) {
    this.mode = mode;
    this.currentIndex = 0;
    this.userAnswers = {};
    this.score = 0;
    this.isExamSubmitted = false;
    clearInterval(this.timer);

    if (mode === 'exam') {
      // 20 τυχαίες ερωτήσεις επίσημης εξέτασης
      this.currentList = [...this.allQuestions]
        .sort(() => Math.random() - 0.5)
        .slice(0, 20);
      this.timeRemaining = this.examTimeLimit;
      this.startTimer();
      this.timerContainer.classList.remove('hidden');
      this.badgeMode.textContent = "Επίσημη Προσομοίωση (20 Ερωτήσεις / 40')";
      this.badgeMode.className = "px-3 py-1 text-xs font-bold rounded-full bg-rose-100 text-rose-800 border border-rose-200";
    } else if (mode === 'saved') {
      const savedIds = this.getSavedQuestionIds();
      this.currentList = this.allQuestions.filter(q => savedIds.includes(q.id));
      if (this.currentList.length === 0) {
        alert("Δεν υπάρχουν αποθηκευμένες ερωτήσεις ακόμη! Όταν κάνετε λάθος σε ένα τεστ ή πατάτε 'Αποθήκευση', οι ερωτήσεις συγκεντρώνονται εδώ.");
        return;
      }
      this.timerContainer.classList.add('hidden');
      this.badgeMode.textContent = `Τεστ με Αποθηκευμένες (${this.currentList.length} Ερωτήσεις)`;
      this.badgeMode.className = "px-3 py-1 text-xs font-bold rounded-full bg-amber-100 text-amber-800 border border-amber-200";
    } else if (mode === 'category') {
      if (this.selectedCategory === 'all') {
        this.currentList = [...this.allQuestions];
      } else {
        this.currentList = this.allQuestions.filter(q => q.cat === this.selectedCategory);
      }
      this.timerContainer.classList.add('hidden');
      this.badgeMode.textContent = `Θεματική: ${this.selectedCategory}`;
      this.badgeMode.className = "px-3 py-1 text-xs font-bold rounded-full bg-sky-100 text-sky-800 border border-sky-200";
    } else {
      // Study mode (όλες οι 97 ερωτήσεις)
      this.currentList = [...this.allQuestions];
      this.timerContainer.classList.add('hidden');
      this.badgeMode.textContent = "Ελεύθερη Μελέτη (97 Ερωτήσεις)";
      this.badgeMode.className = "px-3 py-1 text-xs font-bold rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200";
    }

    this.quizIntro.classList.add('hidden');
    this.quizResults.classList.add('hidden');
    this.quizActive.classList.remove('hidden');

    const quizBackText = document.getElementById('quiz-back-btn-text');
    if (quizBackText) {
      quizBackText.textContent = "Έξοδος στο Μενού Quiz";
    }

    this.renderQuestion();
  }

  startTimer() {
    this.updateTimerDisplay();
    this.timer = setInterval(() => {
      this.timeRemaining--;
      this.updateTimerDisplay();
      if (this.timeRemaining <= 0) {
        clearInterval(this.timer);
        alert('Ο χρόνος εξέτασης (40 λεπτά) εξαντλήθηκε! Το γραπτό σας υποβάλλεται αυτόματα.');
        this.finishQuiz();
      }
    }, 1000);
  }

  updateTimerDisplay() {
    const minutes = Math.floor(this.timeRemaining / 60);
    const seconds = this.timeRemaining % 60;
    this.timerDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    if (this.timeRemaining <= 300) {
      this.timerDisplay.classList.add('text-rose-600', 'animate-pulse');
    } else {
      this.timerDisplay.classList.remove('text-rose-600', 'animate-pulse');
    }
  }

  // --- Εμφάνιση Ερώτησης με Οπτική Σήμανση ---
  renderQuestion() {
    const qData = this.currentList[this.currentIndex];
    const total = this.currentList.length;

    // Progress bar and labels
    this.progressText.textContent = `Ερώτηση ${this.currentIndex + 1} από ${total}`;
    const percent = ((this.currentIndex + 1) / total) * 100;
    this.progressBar.style.width = `${percent}%`;

    // Badges & Bookmark State
    this.badgeCat.textContent = qData.cat;
    this.updateBookmarkButtonState(qData.id);

    // Text
    this.questionText.textContent = qData.q;

    // Check answered status
    const selectedAnswer = this.userAnswers[qData.id];
    const isAnswered = selectedAnswer !== undefined;

    // --- ΟΠΤΙΚΟ ΠΛΑΙΣΙΟ ΚΑΙ ΜΗΝΥΜΑΤΑ ---
    this.updateCardBorderAndFeedback(qData, selectedAnswer, isAnswered);

    // Render Options
    this.optionsList.innerHTML = '';

    qData.a.forEach((optText, optIdx) => {
      const li = document.createElement('li');
      const letter = String.fromCharCode(913 + optIdx); // Α, Β, Γ

      let liClasses = "quiz-opt-btn p-4 border-2 rounded-xl transition-all duration-200 flex items-start space-x-3";
      let icon = "";

      if (!isAnswered) {
        // Κατάσταση πριν την απάντηση: ουδέτερο πλαίσιο με hover
        liClasses += " text-slate-800 bg-white border-slate-200 hover:border-sky-500 hover:bg-sky-50/40 cursor-pointer shadow-sm";
        icon = `<span class="w-7 h-7 flex-shrink-0 flex items-center justify-center rounded-lg bg-slate-100 text-slate-700 font-bold text-sm border border-slate-300">${letter}</span>`;
      } else {
        // Έχει ήδη απαντηθεί και υποβληθεί οριστικά: κλείδωμα επιλογής
        liClasses += " cursor-default pointer-events-none";
        if (selectedAnswer === optIdx) {
          // Το πλαίσιο που απαντήθηκε:
          if (optIdx === qData.c) {
            // Σωστή απάντηση: Πράσινο πλαίσιο
            liClasses += " text-emerald-950 font-semibold bg-emerald-50 border-emerald-500 shadow-md ring-2 ring-emerald-500/20";
            icon = `<span class="w-7 h-7 flex-shrink-0 flex items-center justify-center rounded-lg bg-emerald-500 text-white font-extrabold text-sm border border-emerald-600 shadow-sm">${letter}</span>`;
          } else {
            // Λάθος απάντηση: Κόκκινο πλαίσιο
            liClasses += " text-rose-950 font-semibold bg-rose-50 border-rose-500 shadow-md ring-2 ring-rose-500/20";
            icon = `<span class="w-7 h-7 flex-shrink-0 flex items-center justify-center rounded-lg bg-rose-500 text-white font-extrabold text-sm border border-rose-600 shadow-sm">${letter}</span>`;
          }
        } else if (optIdx === qData.c) {
          // Η ορθή απάντηση (όταν απαντήθηκε λάθος): Πράσινο πλαίσιο επισήμανσης
          liClasses += " text-emerald-950 font-medium bg-emerald-50/60 border-emerald-500 shadow-sm";
          icon = `<span class="w-7 h-7 flex-shrink-0 flex items-center justify-center rounded-lg bg-emerald-100 text-emerald-800 font-bold text-sm border border-emerald-300">${letter}</span>`;
        } else {
          // Λοιπές μη επιλεγμένες επιλογές
          liClasses += " text-slate-400 bg-slate-50/50 border-slate-200 opacity-60 shadow-none";
          icon = `<span class="w-7 h-7 flex-shrink-0 flex items-center justify-center rounded-lg bg-slate-100 text-slate-400 font-bold text-sm border border-slate-200">${letter}</span>`;
        }
      }

      li.className = liClasses;
      li.innerHTML = `
        ${icon}
        <span class="flex-1 pt-0.5 leading-relaxed">${optText}</span>
      `;

      if (!isAnswered && !this.isExamSubmitted) {
        li.addEventListener('click', () => this.handleOptionSelect(qData, optIdx));
      }
      this.optionsList.appendChild(li);
    });

    // Prev / Next button states & Mandatory Answer Check
    this.btnPrev.disabled = (this.currentIndex === 0);
    this.btnPrev.classList.toggle('opacity-40', this.currentIndex === 0);

    const currentAnswered = (this.userAnswers[qData.id] !== undefined);

    if (this.currentIndex === total - 1) {
      this.btnNext.classList.add('hidden');
      // On last question, show submission button for all modes
      this.btnSubmitExam.classList.remove('hidden');
      this.btnSubmitExam.textContent = (this.mode === 'exam') ? "Οριστική Υποβολή Εξέτασης" : "Ολοκλήρωση Εξάσκησης";
      this.btnSubmitExam.disabled = !currentAnswered;
      this.btnSubmitExam.classList.toggle('opacity-40', !currentAnswered);
      this.btnSubmitExam.classList.toggle('cursor-not-allowed', !currentAnswered);
      this.btnSubmitExam.title = currentAnswered ? "" : "Η απάντηση είναι υποχρεωτική για την υποβολή";
    } else {
      this.btnNext.classList.remove('hidden');
      this.btnSubmitExam.classList.add('hidden');
      // Next button disabled until current question is answered
      this.btnNext.disabled = !currentAnswered;
      this.btnNext.classList.toggle('opacity-40', !currentAnswered);
      this.btnNext.classList.toggle('cursor-not-allowed', !currentAnswered);
      this.btnNext.title = currentAnswered ? "Επόμενη ερώτηση" : "Η απάντηση είναι υποχρεωτική για να προχωρήσετε";
    }
  }

  // --- Ενημέρωση Πλαισίου & Μηνύματος ---
  updateCardBorderAndFeedback(qData, selectedAnswer, isAnswered) {
    if (!this.quizCard) return;

    if (!isAnswered && !(this.mode === 'exam' && this.isExamSubmitted)) {
      // Καθαρό αρχικό πλαίσιο
      this.quizCard.className = "bg-white border-2 border-slate-200 rounded-2xl p-6 sm:p-7 shadow-sm transition-all duration-300";
      if (this.feedbackBanner) this.feedbackBanner.classList.add('hidden');
      return;
    }

    const isCorrect = (selectedAnswer === qData.c);
    const correctLetter = String.fromCharCode(913 + qData.c);
    const correctText = qData.a[qData.c];

    // Πράσινο πλαίσιο για σωστή απάντηση, κόκκινο πλαίσιο για λάθος
    if (isCorrect) {
      this.quizCard.className = "bg-white border-2 border-emerald-500 rounded-2xl p-6 sm:p-7 shadow-sm transition-all duration-300";
    } else {
      this.quizCard.className = "bg-white border-2 border-rose-500 rounded-2xl p-6 sm:p-7 shadow-sm transition-all duration-300";
    }

    if (!this.feedbackBanner) return;

    if (this.mode === 'exam' && !this.isExamSubmitted) {
      this.feedbackBanner.classList.add('hidden');
      return;
    }

    if (isCorrect) {
      this.feedbackBanner.className = "p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-950 font-medium text-sm";
      this.feedbackBanner.innerHTML = `
        <div class="font-extrabold text-emerald-900 text-sm">Σωστή Απάντηση!</div>
        <div class="text-xs text-emerald-800 mt-1">${qData.expl}</div>
      `;
      this.feedbackBanner.classList.remove('hidden');
    } else {
      this.feedbackBanner.className = "p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-950 font-medium text-sm";
      this.feedbackBanner.innerHTML = `
        <div class="font-extrabold text-rose-900 text-sm">Λάθος Απάντηση!</div>
        <div class="text-xs text-rose-900 mt-1">
          <strong>Ορθή επιλογή (${correctLetter}):</strong> ${correctText}
        </div>
        <div class="text-xs text-slate-700 italic mt-1.5 pt-1.5 border-t border-rose-200">
          <strong>Κανόνας / Επεξήγηση:</strong> ${qData.expl}
        </div>
      `;
      this.feedbackBanner.classList.remove('hidden');
    }
  }

  handleOptionSelect(qData, optIdx) {
    if (this.isExamSubmitted) return;

    // Εάν η ερώτηση έχει ήδη απαντηθεί, η απάντηση έχει υποβληθεί και δεν επιτρέπεται αλλαγή
    if (this.userAnswers[qData.id] !== undefined) return;

    this.userAnswers[qData.id] = optIdx;

    const isCorrect = (optIdx === qData.c);
    // Καταγραφή στατιστικών (και αυτόματη αφαίρεση από τις Αποθηκευμένες μετά από σερί σωστών)
    const mastered = this.recordAnswer(qData, isCorrect);

    if (!isCorrect) {
      // Αυτόματη καταγραφή λάθους
      this.saveQuestion(qData.id);
    }

    this.renderQuestion();

    if (mastered && this.feedbackBanner && !this.feedbackBanner.classList.contains('hidden')) {
      this.feedbackBanner.insertAdjacentHTML('beforeend',
        `<div class="mt-2 pt-2 border-t border-emerald-200 text-xs font-bold text-emerald-800">Αφαιρέθηκε από τις Αποθηκευμένες (${this.MASTERY_STREAK} σωστές στη σειρά).</div>`);
    }
  }

  nextQuestion() {
    const qData = this.currentList[this.currentIndex];
    if (this.userAnswers[qData.id] === undefined) {
      alert("Η απάντηση είναι υποχρεωτική! Παρακαλούμε επιλέξτε μία απάντηση πριν προχωρήσετε.");
      return;
    }
    if (this.currentIndex < this.currentList.length - 1) {
      this.currentIndex++;
      this.renderQuestion();
    }
  }

  prevQuestion() {
    if (this.currentIndex > 0) {
      this.currentIndex--;
      this.renderQuestion();
    }
  }

  finishQuiz() {
    if (this.isExamSubmitted) return; // αποφυγή διπλής καταγραφής
    clearInterval(this.timer);
    this.isExamSubmitted = true;

    let correctCount = 0;
    this.currentList.forEach(q => {
      const ans = this.userAnswers[q.id];
      if (ans === q.c) {
        correctCount++;
      } else {
        // Κάθε λάθος αποθηκεύεται αυτόματα
        this.saveQuestion(q.id);
      }
    });

    this.score = correctCount;
    const total = this.currentList.length;
    this.saveHistoryEntry(total);

    this.quizActive.classList.add('hidden');
    this.quizResults.classList.remove('hidden');

    this.resultScore.textContent = this.score;
    this.resultMax.textContent = total;

    if (this.mode === 'exam') {
      const passed = this.score >= 18;
      if (passed) {
        this.resultBadge.textContent = "ΕΠΕΤΥΧΕ (ΕΠΙΤΥΧΙΑ)";
        this.resultBadge.className = "inline-block px-5 py-2 text-base font-extrabold rounded-full bg-emerald-600 text-white shadow-md";
        this.resultMessage.innerHTML = `Συγχαρητήρια! Πιάσατε το επίσημο όριο επιτυχίας <strong>(τουλάχιστον 18/20 - 90%)</strong> του Λιμεναρχείου. Είστε έτοιμοι για τη θεωρητική εξέταση!`;
      } else {
        this.resultBadge.textContent = "ΑΠΟΡΡΙΦΘΗΚΕ (ΑΠΟΤΥΧΙΑ)";
        this.resultBadge.className = "inline-block px-5 py-2 text-base font-extrabold rounded-full bg-rose-600 text-white shadow-md";
        this.resultMessage.innerHTML = `Χρειάζεστε τουλάχιστον <strong>18 σωστές απαντήσεις στις 20</strong> για να περάσετε. Τα λάθη σας αποθηκεύτηκαν αυτόματα για επανάληψη.`;
      }
    } else {
      const percentage = Math.round((this.score / total) * 100);
      this.resultBadge.textContent = `Σκορ: ${percentage}%`;
      this.resultBadge.className = "inline-block px-5 py-2 text-base font-extrabold rounded-full bg-sky-600 text-white shadow-md";
      this.resultMessage.textContent = `Ολοκληρώσατε την εξάσκηση με ${this.score} σωστές στις ${total} ερωτήσεις.`;
    }

    this.renderResultBreakdown();
  }

  renderResultBreakdown() {
    this.resultDetails.innerHTML = '';
    this.currentList.forEach((q, idx) => {
      const userAns = this.userAnswers[q.id];
      const isCorrect = userAns === q.c;

      const item = document.createElement('div');
      item.className = `p-4 rounded-xl border text-sm ${isCorrect ? 'bg-emerald-50/70 border-emerald-300' : 'bg-rose-50/70 border-rose-300'}`;

      const userText = userAns !== undefined ? q.a[userAns] : "Δεν απαντήθηκε";
      const correctText = q.a[q.c];
      const isSaved = this.isQuestionSaved(q.id);

      item.innerHTML = `
        <div class="flex items-center justify-between mb-1.5">
          <span class="font-bold ${isCorrect ? 'text-emerald-800' : 'text-rose-800'}">
            ${isCorrect ? 'Σωστό' : 'Λάθος'} (Ερώτηση ${idx + 1} - ${q.cat})
          </span>
          <button onclick="quizApp.toggleBookmarkById(${q.id})" class="text-xs px-2 py-0.5 rounded font-semibold ${isSaved ? 'bg-amber-200 text-amber-900' : 'bg-slate-200 text-slate-700'}">
            ${isSaved ? 'Αποθηκευμένη' : 'Αποθήκευση'}
          </button>
        </div>
        <p class="font-semibold text-slate-800 mb-2">${q.q}</p>
        <div class="space-y-1 text-xs">
          <p><span class="text-slate-500 font-medium">Η επιλογή σας:</span> <span class="${isCorrect ? 'text-emerald-700 font-bold' : 'text-rose-700 font-bold'}">${userText}</span></p>
          ${!isCorrect ? `<p><span class="text-emerald-700 font-bold">Ορθή απάντηση:</span> <span class="text-emerald-900 font-bold">${correctText}</span></p>` : ''}
          <p class="text-slate-600 italic mt-1 pt-1 border-t border-slate-200"><span class="font-semibold not-italic">Επεξήγηση:</span> ${q.expl}</p>
        </div>
      `;
      this.resultDetails.appendChild(item);
    });
  }

  toggleBookmarkById(id) {
    if (this.isQuestionSaved(id)) {
      this.removeSavedQuestion(id);
    } else {
      this.saveQuestion(id);
    }
    this.renderResultBreakdown();
  }

  renderReviewMode() {
    this.quizResults.classList.add('hidden');
    this.quizActive.classList.remove('hidden');
    this.currentIndex = 0;
    this.renderQuestion();
  }

  resetToIntro() {
    clearInterval(this.timer);
    this.quizActive.classList.add('hidden');
    this.quizResults.classList.add('hidden');
    this.quizIntro.classList.remove('hidden');
    if (this.quizCard) {
      this.quizCard.className = "bg-white border-2 border-slate-200 rounded-2xl p-6 sm:p-7 shadow-sm transition-all duration-300";
    }
    this.updateSavedCount();

    const quizBackText = document.getElementById('quiz-back-btn-text');
    if (quizBackText) {
      quizBackText.textContent = "Επιστροφή στην Αρχική";
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.quizApp = new QuizEngine();
});
