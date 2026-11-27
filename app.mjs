import { games, createGame, play, nextRound } from './games.mjs';

const $ = id => document.getElementById(id);
const home = $('home');
const board = $('game');
const library = $('game-list');
const activity = $('activity');
const feedback = $('feedback');
const check = $('check');
const next = $('next');
const again = $('again');
const finishHome = $('finish-home');
const replay = $('replay');
const clue = $('sound-clue');
const soundToggle = $('sound-toggle');
const install = $('install');
const audio = new Audio();
const successPauseMs = 1900;
let game;
let scene;
let installPrompt;
let advanceTimer;
let sound = true;

const coverArt = {
  'color-pieces': '<i></i><i></i><i></i><b>✦</b>',
  blocks: '<i></i><i></i><i></i><b>·</b>',
  friends: '<span>🐱</span><span>🐶</span><b>♪</b>',
  carrots: '<span>🥕</span><span>🥕</span><b>✦</b>',
  cards: '<span>🌻</span><span>🍎</span><b>✧</b>',
  'shadow-pictures': '<span>🐇</span><span>🐇</span><b>✦</b>',
};

for (const [id, { title, skill, art }] of Object.entries(games)) {
  const link = document.createElement('a');
  link.className = 'game-card theme-' + id;
  link.href = '#/' + id;
  link.dataset.route = id;
  link.innerHTML = `
    <div class="card-art ${art}" aria-hidden="true">${coverArt[art]}</div>
    <div class="card-info">
      <div><span class="card-skill">${skill}</span><h3>${title}</h3></div>
      <span class="card-play" aria-hidden="true"><i class="play-icon"></i></span>
    </div>`;
  library.append(link);
}

try {
  sound = localStorage.getItem('lapki-sound') !== 'off';
} catch {
  // The session still works when storage is disabled.
}

function updateSoundButton() {
  soundToggle.setAttribute('aria-pressed', String(sound));
}

function setSound(enabled) {
  sound = enabled;
  updateSoundButton();
  try {
    localStorage.setItem('lapki-sound', sound ? 'on' : 'off');
  } catch {
    // The setting stays in memory for this session.
  }
}

function updateClue() {
  const message = game?.id === 'animals' && !game.finished ? game.round.target.clue : '';
  clue.textContent = message;
  clue.hidden = !message || sound;
}

function speak(clip) {
  if (!sound) return;
  const url = new URL('./assets/voice/' + clip + '.wav', import.meta.url).href;
  if (audio.src !== url) audio.src = url;
  audio.currentTime = 0;
  const currentRound = game?.round;
  audio.play().catch(error => {
    if (error.name !== 'AbortError' && clip === currentRound?.clip && game?.round === currentRound && clue.textContent) {
      clue.hidden = false;
    }
  });
}

function roundProgress() {
  const rounds = $('rounds');
  rounds.setAttribute('aria-label', game.finished ? 'Все ' + game.rounds.length + ' заданий выполнены' :
    'Задание ' + (game.position + 1) + ' из ' + game.rounds.length);
  rounds.replaceChildren(...game.rounds.map((_, index) => {
    const dot = document.createElement('i');
    dot.className = index < game.position || game.finished || (index === game.position && game.solved)
      ? 'done' : index === game.position ? 'current' : '';
    return dot;
  }));
}

function makePiece(item) {
  const piece = document.createElement('span');
  piece.setAttribute('aria-hidden', 'true');
  if (item.picture) {
    piece.className = 'picture';
    piece.textContent = item.picture;
  } else {
    piece.className = 'piece ' + (item.shapeId ?? item.id);
    piece.style.setProperty('--piece', item.color);
    piece.style.setProperty('--shade', item.shade);
  }
  return piece;
}

function makeChoice(item) {
  const button = document.createElement('button');
  button.className = 'choice';
  button.type = 'button';
  button.dataset.choice = item.id;
  button.setAttribute('aria-label', game.id === 'shadows' ? 'Тень: ' + item.name : item.name);
  button.append(makePiece(item));
  if (game.id === 'pairs') button.setAttribute('aria-pressed', 'false');
  return button;
}

function updateActivity(answer, result) {
  const { id, round, solved } = game;
  for (const button of activity.querySelectorAll('[data-choice]')) {
    const choiceId = button.dataset.choice;
    const matched = id === 'pairs' && round.matched.includes(choiceId);
    const selected = id === 'pairs' && round.selected?.id === choiceId;
    button.classList.toggle('selected', selected);
    button.classList.toggle('matched', matched || (solved && choiceId === round.target?.id));
    button.classList.toggle('try-again', result === 'retry' && choiceId === answer);
    button.disabled = solved || matched || (choiceId === 'take' && round.given === 0);
    if (id === 'pairs') button.setAttribute('aria-pressed', String(Boolean(selected || matched)));
  }
  if (id === 'shapes' && solved) {
    const outline = activity.querySelector('.outline');
    outline.classList.add('filled');
    outline.style.setProperty('--piece', round.target.color);
  }
  if (id === 'count') {
    const tray = activity.querySelector('.tray');
    const visibleCarrots = 24;
    tray.querySelector('.harvest').textContent =
      '🥕'.repeat(Math.min(round.given, visibleCarrots)) + (round.given > visibleCarrots ? '…' : '');
    tray.querySelector('.carrot-total').textContent = round.given;
    tray.setAttribute('aria-label', 'Морковок у зайчика: ' + round.given);
    check.disabled = solved;
  }
  roundProgress();
}

function renderRound(announce = false) {
  const { id, round, finished } = game;
  $('game-title').textContent = games[id].title;
  board.className = 'game-view theme-' + id;
  feedback.textContent = '';
  feedback.className = 'feedback';
  next.hidden = true;
  check.hidden = id !== 'count' || finished;
  check.disabled = false;
  again.hidden = finishHome.hidden = !finished;
  replay.hidden = finished;
  activity.replaceChildren();
  updateClue();

  if (finished) {
    $('prompt').textContent = 'Ура! Ты справился!';
    const celebration = document.createElement('div');
    celebration.className = 'celebration';
    celebration.setAttribute('aria-hidden', 'true');
    celebration.innerHTML = '<span>★</span><span>★</span><span>★</span>';
    activity.append(celebration);
    roundProgress();
    again.focus();
    speak('finish');
    return;
  }

  $('prompt').textContent = round.prompt;
  if (id === 'shapes') {
    const target = document.createElement('div');
    target.className = 'outline ' + round.target.id;
    target.role = 'img';
    target.setAttribute('aria-label', 'Контур: ' + round.target.name);
    activity.append(target);
  }
  if (id === 'count') {
    const basket = document.createElement('div');
    basket.className = 'basket';
    basket.innerHTML = `
      <img src="./assets/icon-192.png" width="86" height="86" alt="Зайчик">
      <div class="tray" role="img">
        <span class="harvest" aria-hidden="true"></span><b class="carrot-total" aria-hidden="true">0</b>
      </div>`;
    const controls = document.createElement('div');
    controls.className = 'count-controls';
    controls.innerHTML = `
      <button type="button" class="pill count-give" data-choice="give" aria-label="Дать морковку"><b aria-hidden="true">+</b> Морковка</button>
      <button type="button" class="pill" data-choice="take" aria-label="Убрать морковку"><b aria-hidden="true">−</b> Морковка</button>`;
    activity.append(basket, controls);
    updateActivity();
    if (announce) speak(round.clip);
    return;
  }
  if (id === 'animals') {
    const waves = document.createElement('div');
    waves.className = 'sound-waves';
    waves.setAttribute('aria-hidden', 'true');
    waves.innerHTML = '<i></i><i></i><i></i><i></i><i></i>';
    activity.append(waves);
  }
  if (id === 'shadows') {
    const source = document.createElement('div');
    source.className = 'shadow-target';
    source.role = 'img';
    source.setAttribute('aria-label', 'Картинка: ' + round.target.name);
    source.append(makePiece(round.target));
    activity.append(source);
  }
  const choices = document.createElement('div');
  choices.className = 'choices';
  const size = round.choices.length;
  choices.style.setProperty('--columns', size >= 6 ? size / 2 : size);
  if (round.choices.length === 5) choices.classList.add('choices-compact');
  choices.append(...round.choices.map(makeChoice));
  activity.append(choices);
  updateActivity();
  if (announce) speak(round.clip);
}

function renderRoute({ focus = false, announce = false } = {}) {
  const route = location.hash.slice(2);
  const target = location.hash.startsWith('#/') && Object.hasOwn(games, route) ? route : 'home';
  if (scene === target) return;
  scene = target;
  clearTimeout(advanceTimer);
  audio.pause();
  home.hidden = target !== 'home';
  board.hidden = target === 'home';
  if (target === 'home') {
    game = undefined;
    if (focus) $('home-title').focus({ preventScroll: true });
  } else {
    game = createGame(target);
    renderRound(announce);
    if (focus) $('game-title').focus({ preventScroll: true });
  }
  window.scrollTo(0, 0);
}

document.addEventListener('click', event => {
  const link = event.target.closest('a[data-route]');
  if (!link || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
  event.preventDefault();
  if (location.hash !== link.hash) history.pushState(null, '', link.hash || location.pathname + location.search);
  renderRoute({ focus: true, announce: true });
});
window.addEventListener('hashchange', () => renderRoute({ focus: true }));
window.addEventListener('popstate', () => renderRoute({ focus: true }));

function submitChoice(answer, button) {
  const result = play(game, answer);
  if (result === 'ignored') return;
  updateActivity(answer, result);
  const messages = {
    retry: 'Попробуй ещё раз',
    matched: 'Есть пара!',
    correct: 'Здорово!',
  };
  feedback.textContent = messages[result] ?? '';
  feedback.className = 'feedback ' + result;
  if (game.solved) {
    next.textContent = game.position + 1 === game.rounds.length ? 'Готово' : 'Дальше';
    next.hidden = false;
    next.focus({ preventScroll: true });
    advanceTimer = setTimeout(advanceLevel, successPauseMs);
  } else if (button.disabled) {
    activity.querySelector('button[data-choice]:not(:disabled)')?.focus({ preventScroll: true });
  }
  if (result === 'correct' || result === 'retry') speak(result);
}

activity.addEventListener('click', event => {
  const button = event.target.closest('button[data-choice]');
  if (button && game) submitChoice(button.dataset.choice, button);
});

function advanceLevel() {
  clearTimeout(advanceTimer);
  if (!game || !nextRound(game)) return;
  const focusReplay = document.activeElement === next;
  renderRound(true);
  if (focusReplay && !game.finished) replay.focus({ preventScroll: true });
}

next.addEventListener('click', advanceLevel);

check.addEventListener('click', () => submitChoice('check', check));

again.addEventListener('click', () => {
  game = createGame(game.id);
  renderRound(true);
  $('game-title').focus({ preventScroll: true });
});

replay.addEventListener('click', () => {
  if (!sound) setSound(true);
  updateClue();
  speak(game.round.clip);
});

soundToggle.addEventListener('click', () => {
  setSound(!sound);
  updateClue();
  if (!sound) audio.pause();
  if (sound && game && !game.finished) speak(game.round.clip);
});

if (window.matchMedia('(display-mode: standalone)').matches || navigator.standalone) install.hidden = true;
window.addEventListener('beforeinstallprompt', event => {
  event.preventDefault();
  installPrompt = event;
});
window.addEventListener('appinstalled', () => {
  installPrompt = undefined;
  install.hidden = true;
});
install.addEventListener('click', async () => {
  if (installPrompt) {
    const prompt = installPrompt;
    installPrompt = undefined;
    try {
      await prompt.prompt();
      return;
    } catch {
      // The browser may withdraw its prompt. Show the manual steps.
    }
  }
  $('install-help').showModal();
});

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js')
    .then(() => navigator.serviceWorker.ready)
    .then(() => { $('offline-status').hidden = false; })
    .catch(error => console.error('Не удалось включить офлайн-режим', error));
}

updateSoundButton();
renderRoute();
