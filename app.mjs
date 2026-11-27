import { games, createGame, play, nextRound } from './games.mjs';

const $ = id => document.getElementById(id);
const home = $('home');
const board = $('game');
const library = $('game-list');
const activity = $('activity');
const feedback = $('feedback');
const next = $('next');
const again = $('again');
const finishHome = $('finish-home');
const replay = $('replay');
const clue = $('sound-clue');
const soundToggle = $('sound-toggle');
const install = $('install');
const audio = new Audio();
let game;
let scene;
let installPrompt;
let sound = true;

const coverArt = {
  balls: '<i></i><i></i><i></i><b>✦</b>',
  blocks: '<i></i><i></i><i></i><b>·</b>',
  friends: '<span>🐱</span><span>🐶</span><b>♪</b>',
  carrots: '<span>🥕</span><span>🥕</span><b>✦</b>',
  cards: '<span>🌻</span><span>🍎</span><b>✧</b>',
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
  rounds.setAttribute('aria-label', game.finished ? 'Все 5 заданий выполнены' :
    'Задание ' + (game.position + 1) + ' из ' + game.rounds.length);
  rounds.replaceChildren(...game.rounds.map((_, index) => {
    const dot = document.createElement('i');
    dot.className = index < game.position || game.finished || (index === game.position && game.solved)
      ? 'done' : index === game.position ? 'current' : '';
    return dot;
  }));
}

function makeChoice(item) {
  const button = document.createElement('button');
  button.className = 'choice';
  button.type = 'button';
  button.dataset.choice = item.id;
  button.setAttribute('aria-label', item.name);
  if (item.picture) {
    const picture = document.createElement('span');
    picture.className = 'picture';
    picture.setAttribute('aria-hidden', 'true');
    picture.textContent = item.picture;
    button.append(picture);
  } else {
    const shape = document.createElement('span');
    shape.className = 'piece ' + (game.id === 'colors' ? 'ball' : item.id);
    shape.style.setProperty('--piece', item.color);
    shape.style.setProperty('--shade', item.shade);
    shape.setAttribute('aria-hidden', 'true');
    button.append(shape);
  }
  if (game.id === 'pairs') button.setAttribute('aria-pressed', 'false');
  return button;
}

function updateActivity(answer, result) {
  const { id, round, solved } = game;
  for (const button of activity.querySelectorAll('[data-choice]')) {
    const choiceId = button.dataset.choice;
    const taken = id === 'count' && round.chosen.includes(choiceId);
    const matched = id === 'pairs' && round.matched.includes(choiceId);
    const selected = id === 'pairs' && round.selected?.id === choiceId;
    button.classList.toggle('selected', selected);
    button.classList.toggle('matched', matched || (solved && choiceId === round.target?.id));
    button.classList.toggle('try-again', result === 'retry' && choiceId === answer);
    button.classList.toggle('taken', taken);
    button.disabled = solved || taken || matched;
    if (id === 'pairs') button.setAttribute('aria-pressed', String(Boolean(selected || matched)));
  }
  if (id === 'shapes' && solved) {
    const outline = activity.querySelector('.outline');
    outline.classList.add('filled');
    outline.style.setProperty('--piece', round.target.color);
  }
  if (id === 'count') {
    const tray = activity.querySelector('.tray');
    for (const [index, slot] of Array.from(tray.children).entries()) {
      slot.textContent = index < round.chosen.length ? '🥕' : '';
    }
    tray.setAttribute('aria-label', round.chosen.length + ' из ' + round.target + ' морковок');
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
    basket.innerHTML = '<img src="./assets/icon-192.png" width="86" height="86" alt="Зайчик"><div class="tray" role="img"></div>';
    const tray = basket.querySelector('.tray');
    for (let index = 0; index < round.target; index++) {
      tray.append(document.createElement('span'));
    }
    activity.append(basket);
  }
  if (id === 'animals') {
    const waves = document.createElement('div');
    waves.className = 'sound-waves';
    waves.setAttribute('aria-hidden', 'true');
    waves.innerHTML = '<i></i><i></i><i></i><i></i><i></i>';
    activity.append(waves);
  }
  const choices = document.createElement('div');
  choices.className = 'choices';
  choices.style.setProperty('--columns', round.choices.length === 6 ? 3 : round.choices.length);
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

activity.addEventListener('click', event => {
  const button = event.target.closest('button[data-choice]');
  if (!button || !game) return;
  const answer = button.dataset.choice;
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
  } else if (button.disabled) {
    activity.querySelector('button:not(:disabled)')?.focus({ preventScroll: true });
  }
  if (result === 'correct' || result === 'retry') speak(result);
});

next.addEventListener('click', () => {
  if (!nextRound(game)) return;
  renderRound(true);
  if (!game.finished) replay.focus({ preventScroll: true });
});

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
