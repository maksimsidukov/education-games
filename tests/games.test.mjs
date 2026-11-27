import assert from 'node:assert/strict';
import test from 'node:test';
import { createGame, play, nextRound } from '../games.mjs';

test('choosing a wrong color allows a retry and success counts just once', () => {
  const game = createGame('colors');
  const { target, choices } = game.round;
  assert.equal(new Set(choices.map(({ id }) => id)).size, 3);
  assert.equal(choices.filter(({ id }) => id === target.id).length, 1);
  assert.equal(nextRound(game), false);
  assert.equal(play(game, choices.find(({ id }) => id !== target.id).id), 'retry');
  assert.equal(play(game, target.id), 'correct');
  assert.equal(play(game, target.id), 'ignored');
  assert.equal(nextRound(game), true);
  assert.equal(game.position, 1);
});

test('shapes and sounds offer a unique, playable answer for five rounds', () => {
  for (const id of ['shapes', 'animals']) {
    const game = createGame(id);
    for (let index = 0; index < 5; index++) {
      assert.equal(game.round.choices.filter(choice => choice.id === game.round.target.id).length, 1);
      assert.ok(game.round.clip);
      assert.equal(play(game, game.round.target.id), 'correct');
      assert.equal(nextRound(game), true);
    }
    assert.equal(game.finished, true);
    assert.equal(nextRound(game), false);
  }
});

test('each carrot counts once and the round succeeds at the requested amount', () => {
  const game = createGame('count');
  assert.equal(game.round.target, 1);
  assert.equal(play(game, 'carrot-1'), 'correct');
  assert.equal(nextRound(game), true);
  assert.equal(game.round.target, 2);
  assert.equal(play(game, 'carrot-1'), 'progress');
  assert.equal(play(game, 'carrot-1'), 'ignored');
  assert.equal(game.round.chosen.length, 1);
  assert.equal(play(game, 'carrot-2'), 'correct');
});

test('matching checks two distinct cards and requires both pairs', () => {
  const game = createGame('pairs');
  const [first] = game.round.choices;
  const other = game.round.choices.find(card => card.picture !== first.picture);
  const match = game.round.choices.find(card => card.picture === first.picture && card.id !== first.id);
  const otherMatch = game.round.choices.find(card => card.picture === other.picture && card.id !== other.id);
  assert.equal(play(game, first.id), 'progress');
  assert.equal(play(game, first.id), 'ignored');
  assert.equal(play(game, other.id), 'retry');
  assert.equal(play(game, first.id), 'progress');
  assert.equal(play(game, match.id), 'matched');
  assert.equal(play(game, first.id), 'ignored');
  assert.equal(play(game, other.id), 'progress');
  assert.equal(play(game, otherMatch.id), 'correct');
});

test('choice games start with three options and add a fourth in the last rounds', () => {
  for (const id of ['colors', 'shapes', 'animals']) {
    const game = createGame(id);
    for (const optionCount of [3, 3, 3, 4, 4]) {
      assert.equal(game.round.choices.length, optionCount);
      assert.equal(new Set(game.round.choices.map(choice => choice.id)).size, optionCount);
      assert.equal(play(game, game.round.target.id), 'correct');
      nextRound(game);
    }
    if (id === 'shapes') {
      assert.ok(game.rounds.slice(3).some(round => round.target.id === 'rectangle'));
      assert.ok(game.rounds.slice(0, 3).every(round =>
        round.choices.every(choice => choice.id !== 'rectangle')));
    }
  }
});

test('the last counting board needs four carrots and leaves a spare', () => {
  const game = createGame('count');
  while (game.position < 4) {
    for (const carrot of game.round.choices.slice(0, game.round.target)) play(game, carrot.id);
    nextRound(game);
  }
  assert.equal(game.round.choices.length, 5);
  for (const id of ['carrot-1', 'carrot-2', 'carrot-3']) {
    assert.equal(play(game, id), 'progress');
  }
  assert.equal(play(game, 'carrot-4'), 'correct');
  assert.equal(play(game, 'carrot-5'), 'ignored');
});

test('advanced matching requires all three pairs', () => {
  const game = createGame('pairs');
  for (const pairCount of [2, 2, 2, 3, 3]) {
    const pictures = [...new Set(game.round.choices.map(card => card.picture))];
    assert.equal(pictures.length, pairCount);
    pictures.forEach((picture, index) => {
      const [first, second] = game.round.choices.filter(card => card.picture === picture);
      assert.equal(play(game, first.id), 'progress');
      assert.equal(play(game, second.id), index === pairCount - 1 ? 'correct' : 'matched');
    });
    nextRound(game);
  }
  assert.equal(game.finished, true);
});
