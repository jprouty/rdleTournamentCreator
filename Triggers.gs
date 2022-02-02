// function onEdit(event) {
//   const ss = event.source;
//   const range = event.range;
//   const sheet = event.range.getSheet();
//   const sheetName = sheet.getName();

//   console.log(`onEdit: ${range.getA1Notation()} sheet: ${sheetName}`);
//   switch (sheetName) {
//     case 'Full Results':
//     case 'Leaderboard':
//       sortLeaderboard(sheet);
//       break;
//     default:
//       break;
//   }
// }

// function onOpen(event) {
//   SpreadsheetApp.getUi()
//       .createMenu('Wordle Tournament')
//       .addItem('Create Game', 'createGame')
//       .addItem('Reset Game', 'resetGame')
//       .addSeparator()
//       .addItem('Add Player', 'addPlayer')
//       .addItem('Remove Player', 'removePlayer')
//       .addToUi();
// }

// function onChange(event) {
//   console.log(`type: ${event.changeType}`);
// }

// function resetPageLayout() {
//   var ss = SpreadsheetApp.getActiveSpreadsheet();
//   var sh = ss.getSheetByName('Sheet1');
//   ss.toast('Now processing your sheet','Wait a few seconds',5);
//   if(sh.getMaxRows()-sh.getLastRow()>0){sh.deleteRows(sh.getLastRow()+1, sh.getMaxRows()-sh.getLastRow())};
//   if(sh.getMaxColumns()-sh.getLastColumn()>0){sh.deleteColumns(sh.getLastColumn()+1, sh.getMaxColumns()-sh.getLastColumn())};
//   var sheets = ss.getSheets();
//   for(var n=0;n<sheets.length;n++){
//     if(sheets[n].getName()!='Sheet1'){
//       try{
//         ss.deleteSheet(sheets[n])}catch(err){
//           Browser.msgBox('Can\'t delete Sheet named "'+sheets[n].getName()+'" ('+err+')');
//         }
//     }
//   }
//      SpreadsheetApp.flush();
// }
