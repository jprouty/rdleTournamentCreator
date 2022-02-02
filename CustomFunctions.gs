/**
 * Scores a Wordle share result.
 *
 * @param {number} expectedPuzzleNum The puzzle number.
 * @param {string} shareResult The Wordle share result
 * @return The score of the Wordle, or an error string.
 * @customfunction
 */
function SCORE_WORDLE(expectedPuzzleNum, shareResult) {
  if (!shareResult) {
    return 'X';
  }
  if (typeof(shareResult) !== 'string') {
    return 'VALUE NOT string';
  }
  // Individually check for errors from regex or visual checks.
  var regexScore = SCORE_WORDLE_BY_REGEX(expectedPuzzleNum, shareResult);
  if (!isValidScore(regexScore)) { return regexScore; }
  var visualScore = SCORE_WORDLE_BY_VISUAL(shareResult);
  if (!isValidScore(visualScore)) { return visualScore; }

  // See if anything fishy is going on:
  if (regexScore != visualScore) {
    return 'REGEX != VISUAL SCORE';
  }

  return regexScore;
}

/**
 * Computes a user's average score based on the game settings.
 *
 * @param {Range} gameDates The dates corresponding to the scores.
 * @param {Range} playerScores The scores for the player.
 * @param {number} throwOutXLowest The number of games to throw out based on the worst scores.
 * @return The player's running score.
 * @customfunction
 */
function PLAYER_WORDLE_SCORE(gameDates, playerScores, throwOutXLowest) {
  const datesWScores = gameDates.map((date, i) => { return [date[0], playerScores[i][0]]; });
  const now = new Date();
  // Remove future scores and any scores marked as 'Away'.
  let scores = datesWScores.filter(v => v[0] < now).map(v => v[1]).filter(v => v != 'Away');
  // Sort the scores, such that the worst scores are at the end.
  scores.sort();
  console.log(scores);
  if (!scores.length) {
    return 0;
  }
  // Don't start throwing out scores until there are at least as many scores as those being thrown out. Once's that's the case, only throw out min(scores.length - throwOutXLowest, throwOutXLowest) scores.
  if (scores.length > throwOutXLowest) {
    const numToThrowOut = Math.min(scores.length - throwOutXLowest, throwOutXLowest);
    scores = scores.slice(0, -numToThrowOut);
  }
  console.log(scores);
  return scores.reduce((a, b) => a + b) / scores.length;
}

function isValidScore(score) {
  return score == 'X' || (Number.isInteger(score) && score > 0 && score < 7);
}

function SCORE_WORDLE_BY_REGEX(expectedPuzzleNum, shareResult) {
  var re = new RegExp('Wordle (\\d+) (\\d|X)/6')
  var matches = shareResult.match(re);
  if (!matches) {
    return 'PARSE ERROR';
  }
  var puzzleNum = matches[1];
  var score = matches[2];
  if (puzzleNum != expectedPuzzleNum) {
    return 'WRONG PUZZLE NUMBER';
  }
  if (score == 'X') { return score; }
  score = parseInt(score);
  if (isValidScore(score)) { return score; }
  return 'INVALID SCORE';
}

function SCORE_WORDLE_BY_VISUAL(shareResult) {
  var guessNumber = 0;
  var numConsecutiveGreenies = 0;
  var lastChar;
  shareArray = Array.from(shareResult);
  for (var i = 0; i < shareArray.length; i++) {
    var currChar = shareArray[i];
    if (lastChar && lastChar == '\n') {
      numConsecutiveGreenies = 0;
      // Record the first unicode box.
      if (currChar == '🟩' || currChar == '🟨' || currChar == '⬜' || currChar == '⬛') {
        guessNumber++;
      }
    }
    if (currChar == '🟩') {
      numConsecutiveGreenies++;
    }
    if (numConsecutiveGreenies == 5) {
      return guessNumber;
    }
    lastChar = currChar;
  }
  if (guessNumber < 6) {
    return 'INCOMPLETE VISUAL';
  }
  return 'X';
}
