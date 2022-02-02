function createGame(gameForm) {
  const ss = SpreadsheetApp.getActive();

  console.log(gameForm);

  ss.addDeveloperMetadata('Author', 'Jeff Prouty');
  ss.addDeveloperMetadata('Author Contact', 'jeff.prouty@gmail.com');
  ss.addDeveloperMetadata('License', 'Personal Use Only');
  ss.addDeveloperMetadata('Version', '1.0');

  if (ss.getSheetByName('Full Results') || ss.getSheetByName('Leaderboard')) {
    throw new Error('Game already created; try resetting.');
  }

  // Features / Options:
  const gameOptions = getGameOptions(gameForm);
  console.info(
    `Welcome to Wordle Competition Maker! Setting up a new game with the following options:

      number of players: ${gameOptions.players.length}
      number of games / days: ${gameOptions.gameDates.length}

      score for trying: ${gameOptions.scoreForTrying}
      score for skipping: ${gameOptions.scoreForSkipping}
      discard N worst scores: ${gameOptions.discardNWorstScores}

      protected by email: ${gameOptions.isProtectedByEmail}
      name change protected: ${gameOptions.isNameProtected}
      away feature: ${gameOptions.isAwayEnabled}
      away protected: ${gameOptions.isAwayProtected}`);

  // Unshare the sheet to ensure the protected ranges are setup correctly.
  ss.getEditors().forEach(e => ss.removeEditor(e));

  const resultsSheet = createFullResultsSheet(ss, gameOptions);
  createLeaderboardSheet(ss, resultsSheet, gameOptions);

  // Share with all of the players.
  ss.addEditors(gameOptions.players.map(p => p.email));

  SpreadsheetApp.flush();
}

function getGameOptions(gameForm) {
  return {
    players: gameForm.playerEmails.map((email, i) => {
      return new Player(gameForm.playerNames[i], email);
    }).filter(p => p.email),
    gameDates: getGameDates(
      new Date(gameForm.startDate),
      new Date(gameForm.endDate),
      new Set(gameForm.daysOfWeek.map(v => parseInt(v))),
      new Set(gameForm.excludedDates.filter(v => v).map(v => new Date(v).getTime()))),

    isAwayProtected: gameForm.isAwayProtected === 'on',
    isAwayEnabled: gameForm.isAwayEnabled === 'on',
    isNameProtected: gameForm.isNameProtected === 'on',
    isProtectedByEmail: gameForm.isProtectedByEmail === 'on',

    scoreForTrying: parseInt(gameForm.scoreForTrying),
    scoreForSkipping: gameForm.scoreForSkipping,
    discardNWorstScores: gameForm.discardNWorstScores,
  };
}

function addPlayer() {
  const ss = SpreadsheetApp.getActive();
  const ui = SpreadsheetApp.getUi();

  const response = ui.prompt(
     'Enter Player Name to Add',
     'You are about to add a player. Please enter the name of the player.',
      ui.ButtonSet.OK_CANCEL);
  if (response == ui.Button.CANCEL) {
    return;
  }

  const playerName = response.getResponseText().trim();
  if (!playerName) {
    throw new Error('Must specify a player name to add.');
  }

  const response2 = ui.prompt(
     'Enter Player Email to Add',
     'You are about to add a player. Please enter the name of the player.',
      ui.ButtonSet.OK_CANCEL);
  if (response2 == ui.Button.CANCEL) {
    return;
  }

  const playerEmail = response2.getResponseText().trim();
  if (!playerEmail) {
    throw new Error('Must specify a player email to add.');
  }

  const player = new Player(playerName, playerEmail);

  const leaderboardSheet = ss.getSheetByName('Leaderboard');
  const resultsSheet = ss.getSheetByName('Full Results');
  const gameOptions = {}; // getGameOptions(ss.getSheetByName('Setup'));

  const colsPerPlayer = gameOptions.isAwayEnabled ? 4 : 3;
  const lastResultCol = resultsSheet.getMaxColumns();
  resultsSheet.insertColumnsAfter(lastResultCol, colsPerPlayer);
  const colOffsetResults = lastResultCol + 1;
  // Clear the range, as it will likely try to pull over checkboxes from the column immediately to the left.
  resultsSheet.getRange(1, colOffsetResults, resultsSheet.getMaxRows(), colsPerPlayer).removeCheckboxes().clear();

  populateResultsPlayer(resultsSheet, gameOptions, player, colOffsetResults, colsPerPlayer);
  resultsSheet.autoResizeColumns(colOffsetResults, colsPerPlayer);

  const lastLeaderboardRow = leaderboardSheet.getMaxRows();
  leaderboardSheet.insertRowAfter(lastLeaderboardRow);
  populateLeaderboardPlayer(leaderboardSheet, resultsSheet, gameOptions, player, lastLeaderboardRow + 1, colOffsetResults);

  // Make sure the new player has access to the spreadsheet.
  ss.addEditor(player.email);
}

function removePlayer() {
  const ss = SpreadsheetApp.getActive();
  const ui = SpreadsheetApp.getUi();
  const response = ui.prompt(
     'Enter Player Name to Delete',
     'You are about to remove a player - there is no undo. Please enter the name of the player.',
      ui.ButtonSet.OK_CANCEL);
  if (response == ui.Button.CANCEL) {
    return;
  }

  const playerToRemove = response.getResponseText().trim();
  if (!playerToRemove) {
    throw new Error('Must specify a player name to remove.');
  }

  {
    const leaderboardSheet = ss.getSheetByName('Leaderboard');

    // Get all of the player name columns in the first row.
    const nameRange = leaderboardSheet.getRange(2, 1, leaderboardSheet.getMaxRows() - 1);

    const finder = nameRange.createTextFinder(playerToRemove);
    const firstMatch = finder.findNext();
    if (!firstMatch) {
      throw new Error('Cannot find player by that name.');
    }

    leaderboardSheet.deleteRow(firstMatch.getRow());
  }

  {
    const resultsSheet = ss.getSheetByName('Full Results');

    // Get all of the player name columns in the first row.
    const nameRange = resultsSheet.getRange(1, 3, 1, resultsSheet.getMaxColumns() - 2);

    const finder = nameRange.createTextFinder(playerToRemove);
    const firstMatch = finder.findNext();
    if (!firstMatch) {
      throw new Error('Cannot find player by that name.');
    }

    const rangeToDelete = firstMatch.getMergedRanges()[0];
    resultsSheet.deleteColumns(rangeToDelete.getColumn(), rangeToDelete.getNumColumns());
  }
}

function resetGame() {
  const ss = SpreadsheetApp.getActive();

  if (!ss.getSheetByName('Full Results') || !ss.getSheetByName('Leaderboard')) {
    throw new Error('Game not created yet; cannot reset.');
  }

  const ui = SpreadsheetApp.getUi();
  const result = ui.alert(
     'Please confirm',
     'Are you sure you want to reset the game?\nThis will destroy and recreate the Leaderboard and Results sheets.',
      ui.ButtonSet.YES_NO);
  if (result == ui.Button.NO) {
    return;
  }

  // Remove the sheets.
  ss.deleteSheet(ss.getSheetByName('Full Results'));
  ss.deleteSheet(ss.getSheetByName('Leaderboard'));

  // Unshare the sheet since the players are likely to change.
  ss.getEditors().forEach(e => ss.removeEditor(e));

  SpreadsheetApp.flush();
}

function sortLeaderboard() {
  console.log('Sorting the Leaderboard')

  const ss = SpreadsheetApp.getActive();
  const sheet = ss.getSheetByName('Leaderboard');

  sheet.getRange(2, 1, sheet.getMaxRows() - 1, sheet.getMaxColumns()).sort({ column: 3 });
}

function createLeaderboardSheet(ss, resultsSheet, gameOptions) {
  console.log('Creating the Leaderboard sheet.');

  const numTotalRows = 1 + gameOptions.players.length;
  const numTotalCols = 19;

  const sheet = ss.insertSheet(0);
  sheet.activate();
  sheet.setName('Leaderboard');
  resizeSheet(sheet, numTotalRows, numTotalCols);

  sheet.getRange(1, 1, 1, numTotalCols).setValues(
    [['', '', 'RANK',	'SCORE', '', 'TRENDLINE', '', 1, 2, 3, 4, 5, 6, gameOptions.scoreForTrying, gameOptions.scoreForSkipping, '', 'STDDEV', 'MEDIAN', 'MODE']]);
  populateLeaderboardPlayers(sheet, resultsSheet, gameOptions);

  // Format the header rows:
  sheet.getRange(1, 1, 1, numTotalCols).setHorizontalAlignment('center').setFontWeight('bold');
  sheet.getDataRange().setFontSize(numTotalCols);
  sheet.getRange(1, 3, numTotalRows, numTotalCols - 2).setHorizontalAlignment('center');
  sheet.autoResizeColumns(1, numTotalCols);
  for (let col of [2, 5, 7, 16]) {
    sheet.setColumnWidth(col, 16);
    sheet.getRange(1, col, numTotalRows, 1).setBackground('#c9daf8');
  }

  sheet.setFrozenRows(1);

  if (gameOptions.isProtectedByEmail) {
    const protection = sheet.protect().setDescription('Protect leaderboard sheet (owner only access)');
    protection.removeEditors(protection.getEditors());
  }

  return sheet;
}

function populateLeaderboardPlayers(sheet, resultsSheet, gameOptions) {
  for (let i = 0; i < gameOptions.players.length; i++) {
    const player = gameOptions.players[i];
    const colsPerPlayer = gameOptions.isAwayEnabled ? 4 : 3;
    const colOffsetResults = 3 + colsPerPlayer * i;
    populateLeaderboardPlayer(sheet, resultsSheet, gameOptions, player, 2 + i, colOffsetResults);
  }
}

function populateLeaderboardPlayer(sheet, resultsSheet, gameOptions, player, playerRow, colOffsetResults) {
  const rankRange = sheet.getRange(playerRow, 3);
  const scoreRange = sheet.getRange(playerRow, 4);

  const nameA1 = resultsSheet.getRange(1, colOffsetResults).getA1Notation();
  const scoreA1 = resultsSheet.getRange(2, colOffsetResults).getA1Notation();
  const scoreResultsCol = colNumToA1(colOffsetResults + 2);

  // Have the name and score follow whatever it is on the results page.
  sheet.getRange(playerRow, 1).setFormula(`'Full Results'!${nameA1}`);
  scoreRange.setFormula(`'Full Results'!${scoreA1}`);
  scoreRange.setNumberFormat('0.000');
  // Rank
  rankRange.setFormula(`=RANK(${scoreRange.getA1Notation()}, D$2:D, true)`);
  // Trendline
  sheet.getRange(playerRow, 6).setFormula(
    `=IF('Full Results'!A5 > TODAY(), "Wait for day 2", SPARKLINE(QUERY('Full Results'!$A$4:$${scoreResultsCol}, "select ${scoreResultsCol} where A <= NOW()")))`);
  // Historgram counts
  const playerScoresRangeA1 = `'Full Results'!$${scoreResultsCol}$4:$${scoreResultsCol}`;
  sheet.getRange(playerRow, 8, 1, 8).setFormulas([
    Array.from(Array(8).keys()).map((col) => {
      return `=COUNTIFS(${playerScoresRangeA1}, ${colNumToA1(col + 8)}$1, 'Full Results'!$A$4:$A, "<="&TODAY())`;
    })]);
  // Add per-player stats:
  sheet.getRange(playerRow, 17, 1).setFormula(`=IF('Full Results'!A5 > TODAY(), "Not yet", STDEV(QUERY('Full Results'!$A$4:$${scoreResultsCol}, "select ${scoreResultsCol} where A <= NOW()")))`).setNumberFormat('0.000');
  sheet.getRange(playerRow, 18, 1).setFormula(`=IF('Full Results'!A5 > TODAY(), "Not yet", MODE(QUERY('Full Results'!$A$4:$${scoreResultsCol}, "select ${scoreResultsCol} where A <= NOW()")))`).setNumberFormat('0.000');
  sheet.getRange(playerRow, 19, 1).setFormula(`=IF('Full Results'!A5 > TODAY(), "Not yet", MEDIAN(QUERY('Full Results'!$A$4:$${scoreResultsCol}, "select ${scoreResultsCol} where A <= NOW()")))`).setNumberFormat('0.000');
}

function colNumToA1(num) {
  num--;
  if (num < 26) {
    return String.fromCharCode(65 + num);
  }
  let div = Math.floor(num / 26);
  let mod = num % 26 + 1;
  return `${colNumToA1(div)}${colNumToA1(mod)}`;
}

function createFullResultsSheet(ss, gameOptions) {
  console.log('Creating the Full Results sheet.');

  const numTotalRows = 3 + gameOptions.gameDates.length;
  const colsPerPlayer = gameOptions.isAwayEnabled ? 4 : 3;
  const numTotalCols = 2 + gameOptions.players.length * colsPerPlayer;

  const sheet = ss.insertSheet(0);
  sheet.activate();
  sheet.setName('Full Results');
  resizeSheet(sheet, numTotalRows, numTotalCols);

  sheet.getRange(2, 1, 1, 2).merge().setValue('SCORE ==>');
  populateResultsDates(sheet, gameOptions.gameDates);
  const unprotectedUserRanges = populateResultsPlayers(sheet, gameOptions);

  // Format the header rows:
  sheet.getRange(1, 1, 3, numTotalCols).setHorizontalAlignment('center').setFontWeight('bold');
  sheet.autoResizeColumns(1, numTotalCols);

  sheet.setFrozenColumns(2);
  sheet.setFrozenRows(3);

  if (gameOptions.isProtectedByEmail) {
    const protection = sheet.protect().setDescription('Protect results sheet (owner only access)');
    protection.removeEditors(protection.getEditors());
    protection.setUnprotectedRanges(unprotectedUserRanges);
  }

  addConditionalRuleForHighlightingToday(sheet, sheet.getRange(4, 1, numTotalRows - 3, numTotalCols));

  return sheet;
}

function addConditionalRuleForHighlightingToday(sheet, range) {
  const rule = SpreadsheetApp.newConditionalFormatRule()
      .whenFormulaSatisfied('=EQ(TODAY(), $A4)')
      .setBackground('#D0E0E3')
      .setBold(true)
      .setRanges([range])
      .build();
  var rules = sheet.getConditionalFormatRules();
  rules.push(rule);
  sheet.setConditionalFormatRules(rules);
}

function populateResultsPlayers(sheet, gameOptions) {
  const unprotectedUserRanges = [];

  for (let i = 0; i < gameOptions.players.length; i++) {
    const player = gameOptions.players[i];
    const colsPerPlayer = gameOptions.isAwayEnabled ? 4 : 3;
    const colOffset = 3 + colsPerPlayer * i;
    unprotectedUserRanges.push(
      ...populateResultsPlayer(sheet, gameOptions, player, colOffset, colsPerPlayer));
  }

  return unprotectedUserRanges;
}

function populateResultsPlayer(sheet, gameOptions, player, colOffset, colsPerPlayer) {
  const unprotectedUserRanges = [];

  const shareCol = colOffset;
  const resultCol = colOffset + 1;
  const scoreCol = colOffset + 2;
  const awayCol = colOffset + 3;

  const numDays = gameOptions.gameDates.length;

  const playerNameRange = sheet.getRange(1, colOffset, 1, colsPerPlayer).merge().setValue(player.display);
  const scoreTotalRange = sheet.getRange(2, colOffset, 1, colsPerPlayer).merge().setNumberFormat('0.000').setFormula(
    `=PLAYER_WORDLE_SCORE('Full Results'!$A$4:$A, 'Full Results'!$${colNumToA1(scoreCol)}4:$${colNumToA1(scoreCol)}, ${gameOptions.discardNWorstScores})`);
  sheet.getRange(3, shareCol).setValue('Wordle Share');
  sheet.getRange(3, resultCol).setValue('Result');
  sheet.getRange(3, scoreCol).setValue('Score');

  const shareRange = sheet.getRange(4, shareCol, numDays);
  sheet.getRange(4, resultCol, numDays).setFormulaR1C1(
    `=IF(R[0]C[-1]="", "", SCORE_WORDLE(R[0]C[-${colOffset - 1}], R[0]C[-1]))`
  ).setHorizontalAlignment('center').setVerticalAlignment('middle').setWrap(true);

  const scoreRange = sheet.getRange(4, scoreCol, numDays);
  scoreRange.setHorizontalAlignment('center').setVerticalAlignment('middle');
  if (gameOptions.isAwayEnabled) {
    sheet.getRange(3, awayCol).setValue('Away');
    sheet.getRange(4, awayCol, numDays).insertCheckboxes();

    scoreRange.setFormulaR1C1(
    `=IF(R[0]C[1], "Away", IF(R[0]C[-1]="X", ${gameOptions.scoreForTrying}, IF(OR(R[0]C[-2]="", NOT(ISNUMBER(R[0]C[-1]))), ${gameOptions.scoreForSkipping}, R[0]C[-1])))`);
  } else {
    scoreRange.setFormulaR1C1(
    `=IF(R[0]C[-1]="X", ${gameOptions.scoreForTrying}, IF(OR(R[0]C[-2]="", NOT(ISNUMBER(VALUE(R[0]C[-1])))), ${gameOptions.scoreForSkipping}, R[0]C[-1]))`);
  }

  if (gameOptions.isProtectedByEmail) {
    // Add protection to allow player to edit their "share" cells.
    let protection = shareRange.protect().setDescription(`Allow ${player.display} to edit share column.`);
    // .removeEditors(protection.getEditors())
    protection.addEditor(player.email);
    unprotectedUserRanges.push(shareRange);
    if (gameOptions.isAwayEnabled && !gameOptions.isAwayProtected) {
      // Add protection to allow player to edit their away checkboxes.
      const awayCheckboxesRange = sheet.getRange(4, colOffset + 3, numDays)
      let protection = awayCheckboxesRange.protect().setDescription(`Allow ${player.display} to edit away status.`);
      // .removeEditors(protection.getEditors())
      protection.addEditor(player.email);
      unprotectedUserRanges.push(awayCheckboxesRange);
    }
    if (gameOptions.isNameProtected) {
      // Add protection to allow player to edit their display name.
      let protection = playerNameRange.protect().setDescription(`Allow ${player.display} to edit display name.`);
      // .removeEditors(protection.getEditors())
      protection.addEditor(player.email);
      unprotectedUserRanges.push(playerNameRange);
    }
  }
  return unprotectedUserRanges;
}

const wordleStartDate = new Date(2021, 05, 19);
const millisPerDay = 1000 * 60 * 60 * 24;
function getWordleNumberFromDate(d) {
  return Math.round((d - wordleStartDate) / millisPerDay);
}

function populateResultsDates(sheet, gameDates) {
  sheet.getRange(3, 1).setValue('Date');
  sheet.getRange(3, 2).setValue('Puzzle #');

  // Prefer using formulas to compute the puzzle number in case the user messes with the dates.
  sheet.getRange(4, 1, gameDates.length).setValues(gameDates.map(d => [d]));
  sheet.getRange(4, 2, gameDates.length).setFormulaR1C1('=DATEVALUE(R[0]C[-1]) - 44366');

  // const dateRange = sheet.getRange(4, 1, gameDates.length, 2);
  // dateRange.setValues(gameDates.map(d => [d, getWordleNumberFromDate(d)]));
}

function resizeSheet(sheet, rows, cols) {
  let currRows = sheet.getMaxRows();
  if (rows < currRows) {
    let numToDelete = currRows - rows;
    sheet.deleteRows(currRows - numToDelete + 1, numToDelete);
  } else if (rows > currRows) {
    let numToAdd = rows - currRows;
    sheet.insertRowsAfter(currRows, numToAdd);
  }

  let currCols = sheet.getMaxColumns();
  if (cols < currCols) {
    let numToDelete = currCols - cols;
    sheet.deleteColumns(currCols - numToDelete + 1, numToDelete);
  } else if (cols > currCols) {
    let numToAdd = cols - currCols;
    sheet.insertColumnsAfter(currCols, numToAdd);
  }
}

function getGameDates(startDate, endDate, daysOfWeek, excludedDates) {
  let dates = [];
  let date = new Date(startDate);
  do {
    if (daysOfWeek.has(date.getDay()) && !excludedDates.has(date.getTime())) {
      dates.push(new Date(date));
    }
    date.setDate(date.getDate() + 1);
  } while (date.getTime() <= endDate.getTime());
  return dates;
}

function printSet(s) {
  console.log(Array.from(s))
}
