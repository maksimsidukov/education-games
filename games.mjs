export const games = {
  colors: { title: 'Найди цвет', skill: 'Цвета', art: 'balls' },
  shapes: { title: 'Подбери фигурку', skill: 'Формы', art: 'blocks' },
  animals: { title: 'Кто так говорит?', skill: 'Звуки', art: 'friends' },
  count: { title: 'Угости зайчика', skill: 'Счёт', art: 'carrots' },
  pairs: { title: 'Найди пару', skill: 'Внимание', art: 'cards' },
};

const colors = [
  { id: 'red', name: 'Красный', color: '#ef515d', shade: '#b11948' },
  { id: 'yellow', name: 'Жёлтый', color: '#ffd338', shade: '#dc8817' },
  { id: 'blue', name: 'Синий', color: '#538af8', shade: '#2d4ebc' },
  { id: 'green', name: 'Зелёный', color: '#72c534', shade: '#307c36' },
  { id: 'purple', name: 'Фиолетовый', color: '#a776ee', shade: '#6d3eae' },
  { id: 'orange', name: 'Оранжевый', color: '#ff8b42', shade: '#cf491c' },
];

const shapes = [
  { id: 'circle', name: 'Круг', color: '#ff7565', shade: '#d6443e' },
  { id: 'square', name: 'Квадрат', color: '#6495f1', shade: '#3257b5' },
  { id: 'triangle', name: 'Треугольник', color: '#f8bf41', shade: '#d28b18' },
];

const animals = [
  { id: 'cat', name: 'Кошка', picture: '🐱', clue: 'Мяу-мяу!' },
  { id: 'dog', name: 'Собака', picture: '🐶', clue: 'Гав-гав!' },
  { id: 'cow', name: 'Корова', picture: '🐮', clue: 'Му-у-у!' },
  { id: 'duck', name: 'Утка', picture: '🦆', clue: 'Кря-кря!' },
];

const pictures = [
  { picture: '🍎', name: 'Яблоко' }, { picture: '🦋', name: 'Бабочка' },
  { picture: '🌻', name: 'Подсолнух' }, { picture: '🚗', name: 'Машинка' },
  { picture: '🍓', name: 'Клубника' }, { picture: '🐢', name: 'Черепашка' },
  { picture: '☀️', name: 'Солнышко' }, { picture: '🍐', name: 'Груша' },
];

const carrots = Array.from({ length: 3 }, (_, index) => ({
  id: 'carrot-' + (index + 1), name: 'Морковка ' + (index + 1), picture: '🥕',
}));

const roundCount = 5;

function shuffle(items) {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index--) {
    const other = Math.floor(Math.random() * (index + 1));
    [result[index], result[other]] = [result[other], result[index]];
  }
  return result;
}

function makeRounds(id) {
  if (id === 'count') {
    const quantities = ['одну морковку', 'две морковки', 'три морковки'];
    return [1, 2, 3, 2, 3].map(target => ({
      target, choices: carrots, chosen: [],
      prompt: 'Дай зайчику ' + quantities[target - 1], clip: 'count-' + target,
    }));
  }

  if (id === 'pairs') {
    const deck = shuffle(pictures);
    return Array.from({ length: roundCount }, (_, index) => {
      const pair = [deck[index], deck[index + 3]];
      const cards = [...pair, ...pair].map((card, index) => ({ ...card, id: 'card-' + index }));
      return {
        choices: shuffle(cards), matched: [], selected: null,
        prompt: 'Найди две одинаковые картинки', clip: 'pairs',
      };
    });
  }

  const pool = { colors, shapes, animals }[id];
  const order = shuffle(pool);
  return Array.from({ length: roundCount }, (_, index) => {
    const target = order[index % order.length];
    const choices = shuffle([target, ...shuffle(pool.filter(item => item !== target)).slice(0, 2)]);
    const prompts = {
      colors: 'Где ' + target.name.toLowerCase() + ' шарик?',
      shapes: 'Подбери фигурку',
      animals: 'Кто так говорит?',
    };
    return { target, choices, prompt: prompts[id], clip: target.id };
  });
}

export function createGame(id) {
  if (!Object.hasOwn(games, id)) throw new RangeError('Unknown game: ' + id);
  const rounds = makeRounds(id);
  return {
    id, rounds, round: rounds[0], position: 0, solved: false, finished: false,
  };
}

export function play(game, choiceId) {
  const { round } = game;
  const choice = round.choices.find(item => item.id === choiceId);
  if (game.solved || game.finished || !choice) return 'ignored';

  if (game.id === 'count') {
    if (round.chosen.includes(choiceId)) return 'ignored';
    round.chosen.push(choiceId);
    game.solved = round.chosen.length === round.target;
    return game.solved ? 'correct' : 'progress';
  }

  if (game.id === 'pairs') {
    if (round.matched.includes(choiceId) || round.selected?.id === choiceId) return 'ignored';
    const previous = round.selected;
    if (!previous) {
      round.selected = choice;
      return 'progress';
    }
    round.selected = null;
    if (previous.picture !== choice.picture) return 'retry';
    round.matched.push(previous.id, choiceId);
    game.solved = round.matched.length === round.choices.length;
    return game.solved ? 'correct' : 'matched';
  }

  game.solved = choice.id === round.target.id;
  return game.solved ? 'correct' : 'retry';
}

export function nextRound(game) {
  if (!game.solved || game.finished) return false;
  if (game.position + 1 === game.rounds.length) {
    game.finished = true;
  } else {
    game.position++;
    game.round = game.rounds[game.position];
    game.solved = false;
  }
  return true;
}
