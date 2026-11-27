export const games = {
  colors: { title: 'Найди цвет', skill: 'Цвета и формы', art: 'color-pieces' },
  shapes: { title: 'Подбери фигурку', skill: 'Формы', art: 'blocks' },
  animals: { title: 'Кто так говорит?', skill: 'Звуки', art: 'friends' },
  count: { title: 'Угости зайчика', skill: 'Счёт', art: 'carrots' },
  pairs: { title: 'Найди пару', skill: 'Внимание', art: 'cards' },
  shadows: { title: 'Найди тень', skill: 'Силуэты', art: 'shadow-pictures' },
};

const colors = [
  { id: 'red', name: 'Красный', feminine: 'Красная', object: 'красную', color: '#ef515d', shade: '#b11948' },
  { id: 'yellow', name: 'Жёлтый', feminine: 'Жёлтая', object: 'жёлтую', color: '#ffd338', shade: '#dc8817' },
  { id: 'blue', name: 'Синий', feminine: 'Синяя', object: 'синюю', color: '#538af8', shade: '#2d4ebc' },
  { id: 'green', name: 'Зелёный', feminine: 'Зелёная', object: 'зелёную', color: '#72c534', shade: '#307c36' },
  { id: 'purple', name: 'Фиолетовый', feminine: 'Фиолетовая', object: 'фиолетовую', color: '#a776ee', shade: '#6d3eae' },
  { id: 'orange', name: 'Оранжевый', feminine: 'Оранжевая', object: 'оранжевую', color: '#ff8b42', shade: '#cf491c' },
  { id: 'pink', name: 'Розовый', feminine: 'Розовая', object: 'розовую', color: '#ff8bc7', shade: '#cb4b8d' },
  { id: 'turquoise', name: 'Бирюзовый', feminine: 'Бирюзовая', object: 'бирюзовую', color: '#37c9ba', shade: '#0b827a' },
];

const shapes = [
  { id: 'circle', name: 'Круг', color: '#ff7565', shade: '#d6443e' },
  { id: 'square', name: 'Квадрат', color: '#6495f1', shade: '#3257b5' },
  { id: 'triangle', name: 'Треугольник', color: '#f8bf41', shade: '#d28b18' },
  { id: 'rectangle', name: 'Прямоугольник', color: '#7eaf55', shade: '#467d3c' },
  { id: 'star', name: 'Звезда', object: 'звезду', color: '#a776ee', shade: '#6d3eae' },
];

export const colorFigures = shapes.flatMap(shape => colors.map(paint => {
  const adjective = shape.object ? paint.feminine : paint.name;
  const objectAdjective = shape.object ? paint.object : paint.name.toLowerCase();
  const figure = shape.name.toLowerCase();
  return {
    id: 'color-' + shape.id + '-' + paint.id, colorId: paint.id, shapeId: shape.id,
    color: paint.color, shade: paint.shade,
    name: adjective + ' ' + figure,
    prompt: 'Нажми на ' + objectAdjective + ' ' + (shape.object ?? figure),
  };
}));

const animals = [
  { id: 'cat', name: 'Кошка', picture: '🐱', clue: 'Мяу-мяу!' },
  { id: 'dog', name: 'Собака', picture: '🐶', clue: 'Гав-гав!' },
  { id: 'cow', name: 'Корова', picture: '🐮', clue: 'Му-у-у!' },
  { id: 'duck', name: 'Утка', picture: '🦆', clue: 'Кря-кря!' },
  { id: 'frog', name: 'Лягушка', picture: '🐸', clue: 'Ква-ква!' },
];

const shadowAnimals = [
  { id: 'shadow-cat', name: 'Кошка', picture: '🐈' },
  { id: 'shadow-rabbit', name: 'Кролик', picture: '🐇' },
  { id: 'shadow-duck', name: 'Утка', picture: '🦆' },
  { id: 'shadow-cow', name: 'Корова', picture: '🐄' },
  { id: 'shadow-turtle', name: 'Черепаха', picture: '🐢' },
];

const pictures = [
  { picture: '🍎', name: 'Яблоко' }, { picture: '🦋', name: 'Бабочка' },
  { picture: '🌻', name: 'Подсолнух' }, { picture: '🚗', name: 'Машинка' },
  { picture: '🍓', name: 'Клубника' }, { picture: '🐢', name: 'Черепашка' },
  { picture: '☀️', name: 'Солнышко' }, { picture: '🍐', name: 'Груша' },
  { picture: '🐞', name: 'Божья коровка' }, { picture: '🦊', name: 'Лиса' },
  { picture: '🍒', name: 'Вишня' }, { picture: '🎈', name: 'Шарик' },
];

const roundCount = 10;

function difficulty(index) {
  return index < 3 ? 0 : index < 6 ? 1 : 2;
}

function shuffle(items) {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index--) {
    const other = Math.floor(Math.random() * (index + 1));
    [result[index], result[other]] = [result[other], result[index]];
  }
  return result;
}

function makeColorRounds() {
  const starter = shuffle(shapes.slice(0, 3));
  const easyChoices = colorFigures.filter(item => starter.some(shape => shape.id === item.shapeId));
  const targetShapes = [
    ...starter,
    ...shuffle([...shapes.slice(3), starter[0]]),
    ...shuffle(shapes).slice(0, 4),
  ];
  const targetColors = shuffle(colors);
  const used = new Set();

  return targetShapes.map((shape, index) => {
    const level = difficulty(index);
    const pool = level === 0 ? easyChoices : colorFigures;
    const unused = shuffle(pool.filter(item => item.shapeId === shape.id && !used.has(item.id)));
    const preferredColor = targetColors[index % targetColors.length].id;
    const target = unused.find(item => item.colorId === preferredColor) ?? unused[0];
    used.add(target.id);

    const alternatives = shuffle(pool.filter(item => item.id !== target.id));
    const similar = level === 0 ? [] : [
      alternatives.find(item => item.colorId === target.colorId),
      alternatives.find(item => item.shapeId === target.shapeId),
    ];
    const different = alternatives.filter(item => item.colorId !== target.colorId && item.shapeId !== target.shapeId);
    const choices = shuffle([target, ...similar, ...different.slice(0, 3 + level - similar.length)]);
    return { target, choices, prompt: target.prompt, clip: target.id };
  });
}

function makeShadowRounds() {
  const shapeOrder = [...shuffle(shapes.slice(0, 3)), ...shuffle(shapes.slice(3))];
  const animalOrder = [...shuffle(shadowAnimals.slice(0, 3)), ...shuffle(shadowAnimals.slice(3))];
  return Array.from({ length: roundCount }, (_, index) => {
    const order = index % 2 ? animalOrder : shapeOrder;
    const target = order[Math.floor(index / 2)];
    const pool = order.slice(0, 3 + difficulty(index));
    const choices = shuffle(pool);
    return { target, choices, prompt: 'Найди тень картинки', clip: 'shadows' };
  });
}

function makeRounds(id) {
  if (id === 'colors') return makeColorRounds();
  if (id === 'shadows') return makeShadowRounds();

  if (id === 'count') {
    const quantities = ['одну морковку', 'две морковки', 'три морковки', 'четыре морковки', 'пять морковок'];
    return [1, 2, 3, 2, 3, 4, 3, 5, 4, 5].map(target => ({
      target, given: 0,
      prompt: 'Дай зайчику ' + quantities[target - 1], clip: 'count-' + target,
    }));
  }

  if (id === 'pairs') {
    const deck = shuffle(pictures);
    return Array.from({ length: roundCount }, (_, index) => {
      const pairCount = 2 + difficulty(index);
      const items = Array.from({ length: pairCount }, (_, offset) => deck[(index * 2 + offset) % deck.length]);
      const cards = [...items, ...items].map((card, index) => ({ ...card, id: 'card-' + index }));
      return {
        choices: shuffle(cards), matched: [], selected: null,
        prompt: 'Найди две одинаковые картинки', clip: 'pairs',
      };
    });
  }

  const pool = id === 'shapes' ? shapes : animals;
  const prompt = id === 'shapes' ? 'Подбери фигурку' : 'Кто так говорит?';
  const order = [
    ...shuffle(pool.slice(0, 3)), pool[3], ...shuffle(pool.slice(0, 3)).slice(0, 2),
    pool[4], ...shuffle(pool.slice(0, 4)).slice(0, 3),
  ];
  return order.map((target, index) => ({
    target, prompt, clip: target.id,
    choices: shuffle(pool.slice(0, 3 + difficulty(index))),
  }));
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
  if (game.solved || game.finished) return 'ignored';

  if (game.id === 'count') {
    if (choiceId === 'check') {
      game.solved = round.given === round.target;
      return game.solved ? 'correct' : 'retry';
    }
    if (choiceId === 'give') {
      round.given++;
      return 'progress';
    }
    if (choiceId === 'take' && round.given > 0) {
      round.given--;
      return 'progress';
    }
    return 'ignored';
  }

  const choice = round.choices.find(item => item.id === choiceId);
  if (!choice) return 'ignored';

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
