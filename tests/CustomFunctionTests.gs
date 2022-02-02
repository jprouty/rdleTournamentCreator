function expectEq(actual, expected) {
  if (actual !== expected) {
    throw RangeError(`Unexpected value.
      Actual: ${actual}
      Expected: ${expected}`);
  }
}

function testAll() {
  testValidPuzzles();
  testVisualIssues();
  testRegexIssues();
  testScoreMismatch();
}

function testValidPuzzles() {
  var scoreXDarkMode224 = `Wordle 224 X/6

🟨⬛⬛⬛⬛
⬛🟨⬛⬛🟨
⬛🟩🟩⬛🟩
⬛🟩🟩⬛🟩
⬛🟩🟩🟩🟩
⬛🟩🟩🟩🟩`;
  expectEq(SCORE_WORDLE_BY_REGEX(224, scoreXDarkMode224), 'X');
  expectEq(SCORE_WORDLE_BY_VISUAL(scoreXDarkMode224), 'X');
  expectEq(SCORE_WORDLE(224, scoreXDarkMode224), 'X');

  var score6DarkMode223 = `Wordle 223 6/6

🟨⬛⬛⬛⬛
⬛🟨⬛⬛🟨
⬛🟩🟩⬛🟩
⬛🟩🟩⬛🟩
⬛🟩🟩🟩🟩
🟩🟩🟩🟩🟩`;
  expectEq(SCORE_WORDLE_BY_REGEX(223, score6DarkMode223), 6);
  expectEq(SCORE_WORDLE_BY_VISUAL(score6DarkMode223), 6);
  expectEq(SCORE_WORDLE(223, score6DarkMode223), 6);

  var score6LightMode223 = `Wordle 223 6/6

⬜⬜⬜🟨⬜
🟨🟩⬜⬜⬜
⬜🟩⬜⬜⬜
⬜🟩🟩⬜🟩
⬜🟩🟩🟩🟩
🟩🟩🟩🟩🟩`;
  expectEq(SCORE_WORDLE_BY_REGEX(223, score6LightMode223), 6);
  expectEq(SCORE_WORDLE_BY_VISUAL(score6LightMode223), 6);
  expectEq(SCORE_WORDLE(223, score6LightMode223), 6);

  var score4DarkMode223 = `Wordle 223 4/6

⬛🟩⬛🟨⬛
🟨🟩⬛⬛⬛
🟩🟩🟩🟩⬛
🟩🟩🟩🟩🟩`;
  expectEq(SCORE_WORDLE_BY_REGEX(223, score4DarkMode223), 4);
  expectEq(SCORE_WORDLE_BY_VISUAL(score4DarkMode223), 4);
  expectEq(SCORE_WORDLE(223, score4DarkMode223), 4);

  var score3DarkMode222Hard = `Wordle 222 3/6*

⬛🟨🟨🟨⬛
⬛🟩🟩🟩⬛
🟩🟩🟩🟩🟩`;
  expectEq(SCORE_WORDLE_BY_REGEX(222, score3DarkMode222Hard), 3);
  expectEq(SCORE_WORDLE_BY_VISUAL(score3DarkMode222Hard), 3);
  expectEq(SCORE_WORDLE(222, score3DarkMode222Hard), 3);

  var score3LightMode220Hard = `Wordle 220 3/6*

🟩⬜🟨🟨⬜
🟩🟨⬜⬜🟩
🟩🟩🟩🟩🟩`;
  expectEq(SCORE_WORDLE_BY_REGEX(220, score3LightMode220Hard), 3);
  expectEq(SCORE_WORDLE_BY_VISUAL(score3LightMode220Hard), 3);
  expectEq(SCORE_WORDLE(220, score3LightMode220Hard), 3);
}

function testVisualIssues() {
  expectEq(SCORE_WORDLE_BY_VISUAL(`Wordle 223 6/6

🟨⬛⬛⬛⬛
⬛🟨⬛⬛🟨
⬛🟩🟩⬛🟩
⬛🟩🟩⬛🟩
⬛🟩🟩🟩🟩`), 'INCOMPLETE VISUAL');
}

function testRegexIssues() {
  expectEq(SCORE_WORDLE_BY_REGEX(222, `Wordle 223 6/6`), 'WRONG PUZZLE NUMBER');
  expectEq(SCORE_WORDLE_BY_REGEX(223, `Wordle 223 0/6`), 'INVALID SCORE');
  expectEq(SCORE_WORDLE_BY_REGEX(223, `Wordle 223 9/6`), 'INVALID SCORE');
  expectEq(SCORE_WORDLE_BY_REGEX(223, `Lewdle 223 4/6`), 'PARSE ERROR');
  expectEq(SCORE_WORDLE_BY_REGEX(223, `Wordle 223 10/2`), 'PARSE ERROR');
  expectEq(SCORE_WORDLE_BY_REGEX(223, `Wordle /6`), 'PARSE ERROR');
}

function testScoreMismatch() {
  var xAnd5 = `Wordle 224 X/6

🟨⬛⬛⬛⬛
⬛🟨⬛⬛🟨
⬛🟩🟩⬛🟩
⬛🟩🟩⬛🟩
🟩🟩🟩🟩🟩`;
  expectEq(SCORE_WORDLE_BY_REGEX(224, xAnd5), 'X');
  expectEq(SCORE_WORDLE_BY_VISUAL(xAnd5), 5);
  expectEq(SCORE_WORDLE(224, xAnd5), 'REGEX != VISUAL SCORE');

  var oneAnd5 = `Wordle 24 1/6

🟨⬛⬛⬛⬛
⬛🟨⬛⬛🟨
⬛🟩🟩⬛🟩
⬛🟩🟩⬛🟩
🟩🟩🟩🟩🟩`;
  expectEq(SCORE_WORDLE_BY_REGEX(24, oneAnd5), 1);
  expectEq(SCORE_WORDLE_BY_VISUAL(oneAnd5), 5);
  expectEq(SCORE_WORDLE(24, oneAnd5), 'REGEX != VISUAL SCORE');
}
