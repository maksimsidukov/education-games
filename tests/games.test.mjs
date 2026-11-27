import assert from 'node:assert/strict';
import test from 'node:test';
import { createGame, play, nextRound } from '../games.mjs';

test('choosing a wrong figure allows a retry and success counts just once', () => {
  const game = createGame('colors');
  const { target, choices } = game.round;
  assert.equal(new Set(choices.map(({ id }) => id)).size, 4);
  assert.equal(choices.filter(({ id }) => id === target.id).length, 1);
  assert.equal(nextRound(game), false);
  assert.equal(play(game, choices.find(({ id }) => id !== target.id).id), 'retry');
  assert.equal(play(game, target.id), 'correct');
  assert.equal(play(game, target.id), 'ignored');
  assert.equal(nextRound(game), true);
  assert.equal(game.position, 1);
});

test('shapes and sounds offer a unique, playable answer for ten rounds', () => {
  for (const id of ['shapes', 'animals']) {
    const game = createGame(id);
    for (let index = 0; index < 10; index++) {
      assert.equal(game.round.choices.filter(choice => choice.id === game.round.target.id).length, 1);
      assert.ok(game.round.clip);
      assert.equal(play(game, game.round.target.id), 'correct');
      assert.equal(nextRound(game), true);
    }
    assert.equal(game.finished, true);
    assert.equal(nextRound(game), false);
  }
});

test('carrots can be freely added and removed before an explicit check', () => {
  const game = createGame('count');
  assert.equal(game.round.target, 1);
  assert.equal(play(game, 'take'), 'ignored');
  assert.equal(play(game, 'check'), 'retry');
  assert.equal(play(game, 'give'), 'progress');
  assert.equal(game.solved, false);
  assert.equal(nextRound(game), false);
  assert.equal(play(game, 'give'), 'progress');
  assert.equal(game.round.given, 2);
  assert.equal(play(game, 'check'), 'retry');
  assert.equal(play(game, 'take'), 'progress');
  assert.equal(play(game, 'check'), 'correct');
  assert.equal(nextRound(game), true);
  assert.equal(game.round.target, 2);
  assert.equal(game.round.given, 0);
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

test('shapes and animals progress from three to five options', () => {
  for (const id of ['shapes', 'animals']) {
    const game = createGame(id);
    for (const optionCount of [3, 3, 3, 4, 4, 4, 5, 5, 5, 5]) {
      assert.equal(game.round.choices.length, optionCount);
      assert.equal(new Set(game.round.choices.map(choice => choice.id)).size, optionCount);
      assert.equal(play(game, game.round.target.id), 'correct');
      nextRound(game);
    }
    if (id === 'shapes') {
      assert.ok(game.rounds.slice(3, 6).some(round => round.target.id === 'rectangle'));
      assert.ok(game.rounds.slice(6).some(round => round.target.id === 'star'));
      assert.ok(game.rounds.slice(0, 3).every(round =>
        round.choices.every(choice => choice.id !== 'rectangle')));
    }
  }
});

test('the last counting round accepts corrections after giving more than five', () => {
  const game = createGame('count');
  for (let index = 0; index < 9; index++) {
    for (let count = 0; count < game.round.target; count++) play(game, 'give');
    assert.equal(play(game, 'check'), 'correct');
    assert.equal(nextRound(game), true);
  }
  assert.equal(game.round.target, 5);
  for (let count = 0; count < 8; count++) assert.equal(play(game, 'give'), 'progress');
  assert.equal(game.round.given, 8);
  assert.equal(play(game, 'check'), 'retry');
  for (let count = 0; count < 3; count++) assert.equal(play(game, 'take'), 'progress');
  assert.equal(play(game, 'check'), 'correct');
  assert.equal(nextRound(game), true);
  assert.equal(game.finished, true);
});

test('matching progresses from two to four pairs', () => {
  const game = createGame('pairs');
  for (const pairCount of [2, 2, 2, 3, 3, 3, 4, 4, 4, 4]) {
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

test('color rounds mix figure and color with unique targets and more answer choices', () => {
  const game = createGame('colors');
  assert.equal(game.rounds.length, 10);
  assert.equal(new Set(game.rounds.map(round => round.target.id)).size, 10);
  assert.equal(new Set(game.rounds.map(round => round.target.shapeId)).size, 5);
  assert.equal(new Set(game.rounds.map(round => round.target.colorId)).size, 8);
  const expectedSizes = [4, 4, 4, 5, 5, 5, 6, 6, 6, 6];
  for (const [index, expectedSize] of expectedSizes.entries()) {
    const { target, choices, prompt, clip } = game.round;
    assert.match(prompt, /^Нажми на \S+ \S+$/u);
    assert.match(clip, /^color-/);
    assert.equal(choices.length, expectedSize);
    assert.equal(new Set(choices.map(({ id }) => id)).size, expectedSize);
    assert.equal(choices.filter(choice => choice.colorId === target.colorId && choice.shapeId === target.shapeId).length, 1);
    if (index >= 3) {
      const wrongShape = choices.find(choice => choice.colorId === target.colorId && choice.shapeId !== target.shapeId);
      const wrongColor = choices.find(choice => choice.shapeId === target.shapeId && choice.colorId !== target.colorId);
      assert.ok(wrongShape && wrongColor);
      assert.equal(play(game, wrongShape.id), 'retry');
      assert.equal(play(game, wrongColor.id), 'retry');
    }
    assert.equal(play(game, target.id), 'correct');
    assert.equal(nextRound(game), true);
  }
  assert.equal(game.finished, true);
});

test('shadow rounds ask for both shapes and animals with one matching silhouette', () => {
  const game = createGame('shadows');
  const expectedSizes = [3, 3, 3, 4, 4, 4, 5, 5, 5, 5];
  const targetIds = new Set();
  for (const [index, expectedSize] of expectedSizes.entries()) {
    const { target, choices } = game.round;
    assert.equal(Boolean(target.picture), index % 2 === 1);
    assert.equal(choices.length, expectedSize);
    assert.equal(choices.filter(choice => choice.id === target.id).length, 1);
    assert.ok(choices.every(choice => Boolean(choice.picture) === Boolean(target.picture)));
    targetIds.add(target.id);
    assert.equal(play(game, choices.find(choice => choice.id !== target.id).id), 'retry');
    assert.equal(play(game, target.id), 'correct');
    assert.equal(nextRound(game), true);
  }
  assert.equal(targetIds.size, 10);
  assert.equal(game.finished, true);
});
