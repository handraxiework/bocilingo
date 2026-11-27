/* English Kids - Frontend. Ganti API_URL dengan URL Web App Apps Script Anda. */
const API_URL = 'https://script.google.com/macros/s/AKfycbz8cuN1Dents0tnDyJTrb56kCn2HocL3GgftcQ5QHK5qoNxpd5qWB1u1oGqaIWya7YbCw/exec';
const MAX_HEARTS = 5;
const SPEAK_TYPES = ['PILIH_ARTI', 'DENGAR_PILIH', 'ISI_TITIK', 'PILIH_GAMBAR'];
const CHOICE_TYPES = ['PILIH_GAMBAR', 'PILIH_ARTI', 'DENGAR_PILIH', 'ISI_TITIK'];

const $app = document.getElementById('app');
const S = { token: localStorage.getItem('tk'), user: null };
let L = null; // state pelajaran aktif

/* ---------- Util ---------- */
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[a[i], a[j]] = [a[j], a[i]]; } return a; };
const view = html => { $app.innerHTML = html; window.scrollTo(0, 0); };
const err = m => `<div class="error">${esc(m)}</div>`;
// Loader acak: a = minuman, b = es krim, c = semangka. small=true untuk area kecil (bar bawah)
const loader = (text = 'Tunggu sebentar...', small = false) =>
    `<div class="load-wrap${small ? ' sm' : ''}"><div class="loader-${['a', 'b', 'c'][Math.floor(Math.random() * 3)]}"></div><p class="muted">${esc(text)}</p></div>`;

async function api(action, data = {}) {
    // text/plain menghindari preflight CORS pada Apps Script
    const r = await fetch(API_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action, token: S.token, ...data }) });
    const j = await r.json();
    if (!j.ok) throw new Error(j.error);
    return j;
}
function say(t) {
    if (!t || !window.speechSynthesis) return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(t); u.lang = 'en-US'; u.rate = 0.85;
    speechSynthesis.speak(u);
}
window.say = say;

/* ---------- Efek suara (dibuat dengan Web Audio, tanpa file audio) ---------- */
let AC = null;
const muted = () => { try { return localStorage.getItem('mute') === '1'; } catch (e) { return false; } };
function ac() {
    if (!AC) AC = new (window.AudioContext || window.webkitAudioContext)();
    if (AC.state === 'suspended' && AC.resume) AC.resume().catch(() => { });
    return AC;
}
document.addEventListener('pointerdown', () => { try { ac(); } catch (e) { } }, { once: true }); // browser mengizinkan suara setelah sentuhan pertama
function tone(f, t0, dur, vol = 0.16, type = 'triangle') {
    const a = ac(), o = a.createOscillator(), g = a.createGain();
    o.type = type; o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(a.destination);
    o.start(t0); o.stop(t0 + dur + 0.05);
}
const SFX = {
    // selesai 1 sesi: tiga denting riang naik
    session() { const t = ac().currentTime + 0.03;[784, 988, 1319].forEach((f, i) => tone(f, t + i * 0.11, 0.5)); },
    // selesai 1 level: tangga nada pentatonik naik, akor terang, lalu kilau di ujung
    level() {
        const t = ac().currentTime + 0.03;
        [523, 659, 784, 880, 1047].forEach((f, i) => tone(f, t + i * 0.1, 0.45));
        [1047, 1319, 1568].forEach(f => tone(f, t + 0.62, 1.1, 0.1));
        tone(262, t + 0.62, 1.2, 0.12, 'sine');
        [2093, 2637, 3136].forEach((f, i) => tone(f, t + 0.95 + i * 0.09, 0.35, 0.04, 'sine'));
    }
};
function sfx(name) { if (muted()) return; try { SFX[name](); } catch (e) { } }
window.sfx = sfx;

/* ---------- Login / daftar ---------- */
function showLogin(msg = '', mode = 'masuk') {
    const daftar = mode === 'daftar';
    view(`<div class="card stack" style="margin-top:8vh">
    <h1 class="center">English Kids 🌱</h1>
    <p class="center muted">Belajar bahasa Inggris sambil bermain</p>
    ${msg ? err(msg) : ''}
    <div><label>Username</label><input id="u" autocapitalize="none" autocomplete="username"></div>
    <div><label>Password</label><input id="p" type="password" autocomplete="current-password"></div>
    ${daftar ? `<div><label>Nama panggilan</label><input id="n"></div>
      <div><label>Kelas</label><select id="g"><option value="2">Kelas 2 SD</option><option value="4">Kelas 4 SD</option></select></div>
      <div><label>Kode pendaftaran</label><input id="k"></div>` : ''}
    <button class="full" id="go">${daftar ? 'Daftar' : 'Masuk'}</button>
    <button class="ghost full" id="sw">${daftar ? 'Sudah punya akun? Masuk' : 'Buat akun baru'}</button>
  </div>`);
    document.getElementById('sw').onclick = () => showLogin('', daftar ? 'masuk' : 'daftar');
    document.getElementById('go').onclick = async e => {
        const v = id => (document.getElementById(id) || {}).value;
        const body = { username: v('u'), password: v('p'), nama: v('n'), grade: v('g'), kode: v('k'), role: 'anak' };
        view(loader(daftar ? 'Membuat akun...' : 'Sedang masuk...'));
        try {
            const r = await api(daftar ? 'register' : 'login', body);
            S.token = r.token; localStorage.setItem('tk', r.token); showHome();
        } catch (x) { showLogin(x.message, mode); }
    };
}

/* ---------- Beranda: jalur belajar ---------- */
async function showHome() {
    view(loader('Memuat pelajaran...'));
    try {
        const r = await api('home'); S.user = r.user;
        view(`<div class="top"><div><h2>Halo, ${esc(r.user.nama)}!</h2><span class="muted">Kelas ${esc(r.user.grade)} SD</span></div>
      <div class="chips"><span class="chip">⭐ ${esc(r.user.xp)}</span><span class="chip">🔥 ${esc(r.user.streak)}</span><button class="ghost" id="snd" style="padding:4px 10px" aria-label="Suara">${muted() ? '🔇' : '🔊'}</button></div></div>
      ${r.units.map(u => `<div class="unit"><div class="unit-head"><div class="unit-icon">${esc(u.ikon)}</div>
        <div><h3>${esc(u.judul)}</h3><span class="muted">${esc(u.deskripsi)}</span></div></div>
        <div class="lessons">${u.lessons.map(l => `<button class="lesson ${l.status}" ${l.status === 'TERKUNCI' ? 'disabled' : ''} data-id="${esc(l.lesson_id)}">
          <span>${esc(l.judul)}<br><small class="muted">${l.status === 'TERKUNCI' ? 'Terkunci' : l.status === 'SELESAI' ? 'Selesai, main lagi' : 'Sesi ' + (l.sesi_selesai + 1) + ' dari ' + l.jumlah_sesi}</small></span><span>${l.status === 'SELESAI' ? '⭐'.repeat(l.bintang) : l.status === 'TERKUNCI' ? '🔒' : '●'.repeat(l.sesi_selesai) + '○'.repeat(l.jumlah_sesi - l.sesi_selesai)}</span></button>`).join('')}</div></div>`).join('')}
      <button class="ghost full" id="out">Keluar</button>`);
        document.querySelectorAll('.lesson').forEach(b => b.onclick = () => startLesson(b.dataset.id));
        document.getElementById('out').onclick = () => { localStorage.removeItem('tk'); S.token = null; showLogin(); };
        document.getElementById('snd').onclick = e => { const m = !muted(); localStorage.setItem('mute', m ? '1' : '0'); e.target.textContent = m ? '🔇' : '🔊'; if (!m) sfx('session'); };
    } catch (x) { localStorage.removeItem('tk'); S.token = null; showLogin(x.message); }
}

/* ---------- Pelajaran ---------- */
async function startLesson(id) {
    view(loader('Menyiapkan soal...'));
    try {
        const r = await api('getLesson', { lesson_id: id });
        L = { id, judul: r.lesson.judul, sesi: r.sesi, qs: r.questions, i: 0, hearts: MAX_HEARTS, answers: [], ans: null, checked: false };
        if (!L.qs.length) throw new Error('Pelajaran ini belum punya soal');
        showQuestion();
    } catch (x) { alert(x.message); showHome(); }
}

function showQuestion() {
    const q = L.qs[L.i]; L.ans = null; L.checked = false; L.mistakes = 0;
    const pct = Math.round(L.i / L.qs.length * 100);
    view(`<div class="top"><button class="ghost" id="x">✕</button><div class="bar"><i style="width:${pct}%"></i></div><span class="chip">❤️ ${L.hearts}</span></div>
    <div class="card" id="qbox">
      ${q.gambar ? `<div class="q-img">${esc(q.gambar)}</div>` : ''}
      <div class="q-text">${esc(q.teks)} ${q.audio && SPEAK_TYPES.includes(q.tipe) ? `<button class="speak" onclick="say(${esc(JSON.stringify(q.audio))})">🔊</button>` : ''}</div>
      <div id="input"></div>
      <div id="fb" class="feedback"><button class="full" id="check" disabled>Periksa</button></div>
    </div>`);
    document.getElementById('x').onclick = () => { if (confirm('Keluar dari pelajaran?')) showHome(); };
    document.getElementById('check').onclick = checkNow;
    renderInput(q);
    if (q.tipe === 'DENGAR_PILIH') setTimeout(() => say(q.audio), 300);
}

function setAnswer(v) { L.ans = v; document.getElementById('check').disabled = !v; }

function renderInput(q) {
    const box = document.getElementById('input');
    if (CHOICE_TYPES.includes(q.tipe)) {
        const opts = shuffle(q.opsi);
        box.innerHTML = `<div class="opts">${opts.map(o => `<button class="opt" data-v="${esc(o)}">${esc(o)}</button>`).join('')}</div>`;
        box.querySelectorAll('.opt').forEach(b => b.onclick = () => {
            if (L.checked) return;
            box.querySelectorAll('.opt').forEach(x => x.classList.remove('sel')); b.classList.add('sel'); setAnswer(b.dataset.v);
            if (q.tipe !== 'PILIH_GAMBAR') say(b.dataset.v);
        });
    } else if (q.tipe === 'SUSUN_HURUF' || q.tipe === 'SUSUN_KALIMAT') {
        const sep = q.tipe === 'SUSUN_HURUF' ? '' : ' ', picked = [], bank = shuffle(q.opsi.map((t, i) => ({ t, i })));
        const draw = () => {
            box.innerHTML = `<div class="tray">${picked.map((p, k) => `<button class="tile" data-k="${k}">${esc(p.t)}</button>`).join('')}</div>
        <div class="bank">${bank.map(b => `<button class="tile ${picked.includes(b) ? 'used' : ''}" data-i="${b.i}" ${picked.includes(b) ? 'disabled' : ''}>${esc(b.t)}</button>`).join('')}</div>`;
            box.querySelectorAll('.tray .tile').forEach(b => b.onclick = () => { if (!L.checked) { picked.splice(+b.dataset.k, 1); draw(); } });
            box.querySelectorAll('.bank .tile').forEach(b => b.onclick = () => { if (!L.checked) { picked.push(bank.find(x => x.i === +b.dataset.i)); draw(); } });
            setAnswer(picked.length ? picked.map(p => p.t).join(sep) : null);
        };
        draw();
    } else if (q.tipe === 'KETIK') {
        box.innerHTML = '<input id="typed" autocapitalize="none" autocomplete="off" spellcheck="false" placeholder="Ketik di sini">';
        document.getElementById('typed').oninput = e => setAnswer(e.target.value.trim());
    } else if (q.tipe === 'COCOKKAN') {
        renderMatch(q, box);
    } else { box.innerHTML = err('Tipe soal belum didukung: ' + esc(q.tipe)); }
}

function renderMatch(q, box) {
    const pairs = q.opsi.map(p => p.split('=')), done = new Set();
    let left = null;
    const rights = shuffle(pairs.map(p => p[1]));
    box.innerHTML = `<div class="match"><div class="stack">${pairs.map(p => `<button class="opt" data-l="${esc(p[0])}">${esc(p[0])}</button>`).join('')}</div>
    <div class="stack">${rights.map(r => `<button class="opt" data-r="${esc(r)}">${esc(r)}</button>`).join('')}</div></div>`;
    box.querySelectorAll('[data-l]').forEach(b => b.onclick = () => {
        if (done.has(b.dataset.l)) return;
        box.querySelectorAll('[data-l]').forEach(x => x.classList.remove('sel')); b.classList.add('sel'); left = b; say(b.dataset.l);
    });
    box.querySelectorAll('[data-r]').forEach(b => b.onclick = () => {
        if (!left || b.classList.contains('ok')) return;
        const ok = pairs.some(p => p[0] === left.dataset.l && p[1] === b.dataset.r);
        if (ok) {
            left.classList.remove('sel'); left.classList.add('ok'); b.classList.add('ok'); done.add(left.dataset.l); left = null;
            if (done.size === pairs.length) { L.ans = L.mistakes ? '' : q.opsi.join('|'); L.checked = true; showFeedback(!L.mistakes, q.opsi.join(', '), ''); }
        } else { L.mistakes++; b.classList.add('bad'); setTimeout(() => b.classList.remove('bad'), 500); }
    });
    document.getElementById('check').style.display = 'none';
}

async function checkNow() {
    const q = L.qs[L.i], fb = document.getElementById('fb');
    fb.innerHTML = loader('Memeriksa...', true);
    try {
        const r = await api('checkAnswer', { lesson_id: L.id, question_id: q.id, answer: L.ans });
        L.checked = true;
        document.querySelectorAll('#input .opt').forEach(b => { if (b.dataset.v === r.jawaban) b.classList.add('ok'); else if (b.classList.contains('sel')) b.classList.add('bad'); });
        showFeedback(r.benar, r.jawaban, r.penjelasan);
    } catch (x) {
        fb.innerHTML = '<button class="full" id="check">Periksa</button>';
        document.getElementById('check').onclick = checkNow;
        alert(x.message);
    }
}

function showFeedback(benar, jawaban, penjelasan) {
    const q = L.qs[L.i];
    L.answers.push({ question_id: q.id, answer: L.ans });
    if (!benar) L.hearts--;
    const fb = document.getElementById('fb');
    fb.className = 'feedback ' + (benar ? 'ok' : 'bad');
    fb.innerHTML = `<h3>${benar ? 'Benar! 🎉' : 'Belum tepat'}</h3>
    ${benar ? '' : `<p>Jawaban yang benar: <b>${esc(jawaban)}</b></p>`}
    ${penjelasan ? `<p>${esc(penjelasan)}</p>` : ''}
    <button class="full" id="next">Lanjut</button>`;
    document.getElementById('next').onclick = () => {
        if (L.hearts <= 0) return finish(true);
        L.i++; L.i < L.qs.length ? showQuestion() : finish(false);
    };
}

async function finish(kehabisanNyawa) {
    view(loader('Menyimpan hasil...'));
    try {
        const r = await api('finishLesson', { lesson_id: L.id, sesi: L.sesi, answers: L.answers });
        if (kehabisanNyawa || !r.selesai) {
            view(`<div class="card center stack"><div class="q-img">💪</div><h2>Ayo coba lagi!</h2><p>Nyawa habis. Belajar sedikit lagi, pasti bisa.</p>
        <button class="full" onclick="startLesson('${esc(L.id)}')">Ulangi pelajaran</button><button class="ghost full" onclick="showHome()">Kembali</button></div>`);
        } else {
            sfx(r.level_selesai ? 'level' : 'session');
            view(`<div class="card center stack"><h1>Hebat! 🎉</h1><div class="stars">${'⭐'.repeat(r.stars)}</div>
        <p>${r.benar} dari ${r.total} soal benar</p>
        <p><b>${r.level_selesai ? '🏆 Level selesai! Level berikutnya terbuka.' : 'Sesi ' + r.sesi_selesai + ' dari ' + r.jumlah_sesi + ' selesai'}</b></p>
        <div class="chips" style="justify-content:center"><span class="chip">+${r.xp} XP</span><span class="chip">🔥 ${r.streak} hari</span></div>
        <button class="full" onclick="showHome()">Lanjut belajar</button></div>`);
        }
    } catch (x) { alert(x.message); showHome(); }
}

/* ---------- Mulai ---------- */
window.startLesson = startLesson; window.showHome = showHome;
S.token ? showHome() : showLogin();
