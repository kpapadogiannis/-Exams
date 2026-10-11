// Ψηφιακά Εργαλεία Χειριστή Ταχυπλόου & Utilities

document.addEventListener('DOMContentLoaded', () => {
  initLicenseChecker();
  initFuelCalculator();
  initAnchorCalculator();
  initChecklist();
});

/* -------------------------------------------------------------
 * 1. Διαδραστικός Έλεγχος: «Χρειάζομαι Άδεια Χειριστή;»
 * ------------------------------------------------------------- */
function initLicenseChecker() {
  const boatType = document.getElementById('calc-boat-type');
  const boatHp = document.getElementById('calc-boat-hp');
  const checkBtn = document.getElementById('btn-check-license');
  const resultBox = document.getElementById('license-check-result');

  if (!checkBtn) return;

  const evaluateLicense = () => {
    const type = boatType.value;
    const hp = parseFloat(boatHp.value) || 0;
    let required = false;
    let reason = "";

    if (type === 'jetski') {
      required = true;
      reason = "Τα θαλάσσια μοτοποδήλατα (Jet Ski / WaveRunner) και τα σκάφη με υδραυλική πρόωση (water jet) θεωρούνται ΕΞ ΟΡΙΣΜΟΥ ταχύπλοα και ΑΠΑΙΤΟΥΝ ΠΑΝΤΑ ΑΔΕΙΑ, ανεξαρτήτως ίππων (ακόμα και <15 HP).";
    } else if (type === 'rib') {
      if (hp > 15) {
        required = true;
        reason = `Για φουσκωτά σκάφη (RIB), το όριο απαλλαγής είναι οι 15 HP. Για κινητήρα ${hp} HP ΑΠΑΙΤΕΙΤΑΙ άδεια χειριστή ταχυπλόου.`;
      } else {
        required = false;
        reason = `Για φουσκωτά σκάφη με κινητήρα έως 15 HP ΔΕΝ απαιτείται άδεια (όριο απαλλαγής).`;
      }
    } else if (type === 'inboard') {
      if (hp > 40) {
        required = true;
        reason = `Για εσωλέμβιες ή έσω-έξω μηχανές (stern drive), το όριο ταχυπλόου είναι οι 40 HP. Με ${hp} HP ΑΠΑΙΤΕΙΤΑΙ άδεια χειριστή.`;
      } else {
        required = false;
        reason = `Για εσωλέμβιες μηχανές έως 40 HP ΔΕΝ απαιτείται άδεια ταχυπλόου.`;
      }
    } else { // conventional rigid
      if (hp > 30) {
        required = true;
        reason = `Για συμβατικά (πολυεστερικά/άκαμπτα) σκάφη με εξωλέμβια μηχανή, το όριο απαλλαγής είναι οι 30 HP. Με ${hp} HP ΑΠΑΙΤΕΙΤΑΙ άδεια χειριστή ταχυπλόου.`;
      } else {
        required = false;
        reason = `Για συμβατικά πολυεστερικά σκάφη με εξωλέμβια έως 30 HP ΔΕΝ απαιτείται άδεια χειριστή.`;
      }
    }

    resultBox.classList.remove('hidden');
    if (required) {
      resultBox.className = "p-4 rounded-xl border-2 border-rose-400 bg-rose-50 text-rose-900";
      resultBox.innerHTML = `
        <div class="flex items-center space-x-2 font-extrabold text-base mb-1">
          <span class="px-2 py-0.5 rounded text-xs font-black bg-rose-200 text-rose-900 uppercase">Προσοχή</span>
          <span>ΥΠΟΧΡΕΩΤΙΚΗ ΑΔΕΙΑ ΧΕΙΡΙΣΤΗ</span>
        </div>
        <p class="text-sm leading-relaxed">${reason}</p>
        <div class="mt-2 pt-2 border-t border-rose-200 text-xs text-rose-700">
          <strong>Όριο Άδειας Ταχυπλόου:</strong> Καλύπτει σκάφη αναψυχής έως 100 κόρους (Ι.Χ.), ενοικιαζόμενα έως 20m και απεριόριστη ιπποδύναμη.
        </div>
      `;
    } else {
      resultBox.className = "p-4 rounded-xl border-2 border-emerald-400 bg-emerald-50 text-emerald-900";
      resultBox.innerHTML = `
        <div class="flex items-center space-x-2 font-extrabold text-base mb-1">
          <span class="px-2 py-0.5 rounded text-xs font-black bg-emerald-200 text-emerald-900 uppercase">Έγκριση</span>
          <span>ΑΠΑΛΛΑΣΣΕΣΤΕ ΑΠΟ ΤΗΝ ΑΔΕΙΑ</span>
        </div>
        <p class="text-sm leading-relaxed">${reason}</p>
        <div class="mt-2 pt-2 border-t border-emerald-200 text-xs text-emerald-700">
          <strong>Σημείωση:</strong> Παρότι δεν απαιτείται άδεια, ισχύουν όλοι οι κανόνες ασφαλείας, σωστικών μέσων και ο Γενικός Κανονισμός Λιμένα.
        </div>
      `;
    }
  };

  checkBtn.addEventListener('click', evaluateLicense);
  boatType.addEventListener('change', () => {
    if (boatType.value === 'jetski') {
      boatHp.value = 100;
      boatHp.disabled = true;
    } else {
      boatHp.disabled = false;
    }
  });
}

/* -------------------------------------------------------------
 * 2. Υπολογιστής Καυσίμων & Αυτονομίας (Κανόνας +50%)
 * ------------------------------------------------------------- */
function initFuelCalculator() {
  const distInput = document.getElementById('fuel-dist');
  const speedInput = document.getElementById('fuel-speed');
  const burnInput = document.getElementById('fuel-burn');
  const calcBtn = document.getElementById('btn-calc-fuel');
  const resultBox = document.getElementById('fuel-calc-result');

  if (!calcBtn) return;

  calcBtn.addEventListener('click', () => {
    const dist = parseFloat(distInput.value) || 0;
    const speed = parseFloat(speedInput.value) || 0;
    const burnPerHour = parseFloat(burnInput.value) || 0;

    if (dist <= 0 || speed <= 0 || burnPerHour <= 0) {
      alert("Παρακαλώ συμπληρώστε όλα τα πεδία με θετικές τιμές.");
      return;
    }

    const travelTimeHours = dist / speed;
    const baseFuel = travelTimeHours * burnPerHour;
    const safetyReserve = baseFuel * 0.50; // +50% ασφάλεια
    const totalFuel = baseFuel + safetyReserve;

    const hours = Math.floor(travelTimeHours);
    const mins = Math.round((travelTimeHours - hours) * 60);

    resultBox.classList.remove('hidden');
    resultBox.innerHTML = `
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center mb-3">
        <div class="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
          <div class="text-xs text-slate-500 font-medium">Εκτιμώμενος Χρόνος</div>
          <div class="text-lg font-bold text-slate-800">${hours}ω ${mins}λ</div>
        </div>
        <div class="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
          <div class="text-xs text-slate-500 font-medium">Καθαρή Κατανάλωση</div>
          <div class="text-lg font-bold text-slate-800">${baseFuel.toFixed(1)} Lit</div>
        </div>
        <div class="bg-white p-3 rounded-lg border border-emerald-300 bg-emerald-50/50 shadow-sm">
          <div class="text-xs text-emerald-700 font-bold">Σύνολο με Ασφάλεια (+50%)</div>
          <div class="text-xl font-extrabold text-emerald-600">${totalFuel.toFixed(1)} Lit</div>
        </div>
      </div>
      <div class="text-xs text-slate-600 bg-amber-50 p-2.5 rounded-lg border border-amber-200">
        <strong>Κανόνας Ναυτικής Ασφάλειας:</strong> Υποχρεωτικό απόθεμα +50% για απρόβλεπτες καθυστερήσεις, ρεύματα, καιρό ή ανάγκη αλλαγής πορείας.
      </div>
    `;
  });
}

/* -------------------------------------------------------------
 * 3. Υπολογιστής Έκταματος Άγκυρας (Scope Calculator)
 * ------------------------------------------------------------- */
function initAnchorCalculator() {
  const depthInput = document.getElementById('anchor-depth');
  const typeSelect = document.getElementById('anchor-rode-type');
  const calcBtn = document.getElementById('btn-calc-anchor');
  const resultBox = document.getElementById('anchor-calc-result');

  if (!calcBtn) return;

  calcBtn.addEventListener('click', () => {
    const depth = parseFloat(depthInput.value) || 0;
    const rodeType = typeSelect.value;

    if (depth <= 0) {
      alert("Παρακαλώ εισάγετε έγκυρο βάθος σε μέτρα.");
      return;
    }

    let minRatio = 3;
    let recRatio = 5;
    let stormRatio = 7;
    let tip = "";

    if (rodeType === 'chain') {
      minRatio = 3;
      recRatio = 4;
      stormRatio = 6;
      tip = "Μόνο καδένα (αλυσίδα): Το ίδιο το βάρος της αλυσίδας προσφέρει απόσβεση και έλκει την άγκυρα παράλληλα με τον βυθό.";
    } else if (rodeType === 'rope') {
      minRatio = 5;
      recRatio = 7;
      stormRatio = 8;
      tip = "Σχοινί με λίγη καδένα: Το σχοινί είναι ελαφρύ και τείνει να σηκώνει τα νύχια της άγκυρας, γι' αυτό απαιτείται μεγαλύτερο έκταμα (5x - 7x).";
    }

    const minMeters = Math.round(depth * minRatio);
    const recMeters = Math.round(depth * recRatio);
    const stormMeters = Math.round(depth * stormRatio);

    resultBox.classList.remove('hidden');
    resultBox.innerHTML = `
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center mb-3">
        <div class="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
          <div class="text-xs text-slate-500 font-medium">Ήρεμος Καιρός (${minRatio}:1)</div>
          <div class="text-lg font-bold text-slate-800">${minMeters} μέτρα</div>
        </div>
        <div class="bg-white p-3 rounded-lg border border-sky-300 bg-sky-50 shadow-sm">
          <div class="text-xs text-sky-800 font-bold">Συνιστώμενο (${recRatio}:1)</div>
          <div class="text-xl font-extrabold text-sky-600">${recMeters} μέτρα</div>
        </div>
        <div class="bg-white p-3 rounded-lg border border-amber-300 bg-amber-50 shadow-sm">
          <div class="text-xs text-amber-800 font-bold">Ενισχυμένος Άνεμος (${stormRatio}:1)</div>
          <div class="text-lg font-bold text-amber-700">${stormMeters} μέτρα</div>
        </div>
      </div>
      <div class="text-xs text-slate-600 bg-slate-100 p-2.5 rounded-lg border border-slate-200">
        ${tip}
      </div>
    `;
  });
}

/* -------------------------------------------------------------
 * 4. Διαδραστική Pre-Departure Checklist με Αποθήκευση
 * ------------------------------------------------------------- */
function initChecklist() {
  const container = document.getElementById('checklist-items');
  const resetBtn = document.getElementById('btn-reset-checklist');
  if (!container) return;

  const checklistItems = [
    { id: 'chk_weather', text: 'Ενημέρωση από δελτίο ΕΜΥ (άνεμος, μποφόρ, αναμενόμενη κακοκαιρία)' },
    { id: 'chk_contact', text: 'Ενημέρωση οικείων για προορισμό και εκτιμώμενη ώρα επιστροφής' },
    { id: 'chk_fuel', text: 'Έλεγχος καυσίμων & ποιότητας (επάρκεια +50% εφεδρεία)' },
    { id: 'chk_bilge', text: 'Έλεγχος στεγανών χώρων (τάπες, αντλία σεντίνας, εισροή υδάτων)' },
    { id: 'chk_safety', text: 'Σωσίβια για όλους τους επιβαίνοντες σε άμεση πρόσβαση' },
    { id: 'chk_pyro', text: 'Βεγγαλικά χεριού, καπνογόνα και φωτοβολίδες εντός ημερομηνίας λήξης' },
    { id: 'chk_fire', text: 'Πυροσβεστήρας ξηράς κόνεως ελεγμένος (ετήσιος έλεγχος, αναγόμωση 4ετίας)' },
    { id: 'chk_vhf', text: 'Δοκιμή VHF (Κανάλι 16 / 12) και πλήρως φορτισμένο κινητό (108 Λιμενικό)' },
    { id: 'chk_engine', text: 'Δοκιμή εκκίνησης κύριας & βοηθητικής μηχανής πριν τη λύση κάβων' },
    { id: 'chk_docs', text: 'Ναυτιλιακά έγγραφα στο σκάφος: Άδεια πλόων, Δίπλωμα χειριστή, Ασφαλιστήριο' },
    { id: 'chk_swim', text: 'Επιβεβαίωση ότι όλοι οι επιβαίνοντες γνωρίζουν κολύμβηση' }
  ];

  const getSaved = () => {
    try {
      return JSON.parse(localStorage.getItem('speedboat_checklist') || '{}');
    } catch (e) {
      return {};
    }
  };

  const render = () => {
    const saved = getSaved();
    container.innerHTML = '';
    checklistItems.forEach(item => {
      const isChecked = !!saved[item.id];
      const div = document.createElement('label');
      div.className = `flex items-start space-x-3 p-3 rounded-lg border transition-all cursor-pointer ${isChecked ? 'bg-emerald-50/80 border-emerald-300 text-emerald-950 font-medium' : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'}`;
      div.innerHTML = `
        <input type="checkbox" id="${item.id}" ${isChecked ? 'checked' : ''} class="mt-1 w-5 h-5 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500">
        <span class="text-sm select-none">${item.text}</span>
      `;
      div.querySelector('input').addEventListener('change', (e) => {
        const cur = getSaved();
        cur[item.id] = e.target.checked;
        localStorage.setItem('speedboat_checklist', JSON.stringify(cur));
        render();
      });
      container.appendChild(div);
    });
  };

  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      if (confirm('Θέλετε να επαναφέρετε τη λίστα ελέγχου για νέο απόπλου;')) {
        localStorage.removeItem('speedboat_checklist');
        render();
      }
    });
  }

  render();
}
