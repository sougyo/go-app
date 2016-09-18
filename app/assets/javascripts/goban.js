var StoneType = {
  NONE: 0,
  BLACK: 1,
  WHITE: 2,
  reverse: function(stone) {
    if (stone == this.BLACK) return this.WHITE;
    if (stone == this.WHITE) return this.BLACK;
    return;
  },
  exists: function(stone) {
    return stone == this.BLACK || stone == this.WHITE;
  }
};

var isArray = function(obj) {
  return Object.prototype.toString.call(obj) === '[object Array]';
}

var Board = function(size) {
  this.size = size;
  this.board = new Array(size);
  for (var x = 0; x < this.size; x++)
    this.board[x] = new Array(size);

  this.set = function(x, y, stone) {
    if (this.isOutOfRange(x, y))
      return;
    this.board[x][y] = stone;
  }

  this.get = function(x, y) {
    if (this.isOutOfRange(x, y))
      return;
    return this.board[x][y];
  }

  this.copyFrom = function(other) {
    if (this.size != other.size)
      return;
    for (var x = 0; x < this.size; x++)
      for (var y = 0; y < this.size; y++)
        this.board[x][y] = other.get(x, y);
  }

  this.count = function(stone) {
    var c = 0;
    for (var x = 0; x < this.size; x++)
      for (var y = 0; y < this.size; y++)
        if (this.board[x][y] == stone) c++;
    return c;
  }

  this.clear = function() {
    for (var x = 0; x < this.size; x++)
      for (var y = 0; y < this.size; y++)
        this.board[x][y] = StoneType.NONE;
  }

  this.isOutOfRange = function(x, y) {
    return x < 0 || this.size <= x || y < 0 || this.size <= y;
  }

  this.clear();
}

var ScanTable = function(size) {
  this.size = size;
  this.table = new Array(this.size);
  this.enabled = true;

  for (var x = 0; x < this.size; x++) {
    this.table[x] = new Array(this.size);
  }

  this.mark = function(x, y) {
    this.table[x][y] = true;
  }

  this.isMarked = function(x, y) {
    return this.table[x][y];
  }

  this.disableScan = function() {
    this.enabled = false;
  }

  this.isEnabled = function() {
    return this.enabled;
  }

  this.merge = function(other) {
    if (!other.isEnabled())
      return;
    if (this.size != other.size)
      return;
    for (var x = 0; x < this.size; x++)
      for (var y = 0; y < this.size; y++)
        this.table[x][y] = this.table[x][y] || other.table[x][y];
  }

  this.count = function() {
    var c = 0;
    for (var x = 0; x < this.size; x++)
      for (var y = 0; y < this.size; y++)
        if (this.table[x][y]) c++;
    return c;
  }

  this.clear = function() {
    for (var x = 0; x < this.size; x++)
      for (var y = 0; y < this.size; y++)
        this.table[x][y] = false;
    this.enabled = true;
  }

  this.clear();
}

var Scanner = function(size) {
  var scanTable = new ScanTable(size);
  var board = null;
  var scanableStone = null;
  var abortStone = null;

  this.scan = function(x, y, _board, _scanableStone, _abortStone) {
    if (_board.size != size)
      return;
    
    board         = _board;
    scanableStone = _scanableStone;
    abortStone    = _abortStone;

    scanTable.clear();
    scanRecursively(x, y);
    return scanTable;
  }

  function scanRecursively(x, y) {
    if (board.isOutOfRange(x, y))
      return;
    if (scanTable.isMarked(x, y))
      return;
    if (board.get(x, y) == abortStone)
      scanTable.disableScan();
    if (board.get(x, y) != scanableStone)
      return;
    scanTable.mark(x, y);

    scanRecursively(x + 1, y);
    scanRecursively(x - 1, y);
    scanRecursively(x, y - 1);
    scanRecursively(x, y + 1);
  }
}

var IgoRuleEngine = function(size) {
  var scanner = new Scanner(size);
  var removeTable = new ScanTable(size);
  var tmpBoard = new Board(size);

  var board = new Board(size);
  var nextStone;
  var koX;
  var koY;
  var cnt;
  var hama = {};

  this.clear = function() {
    board.clear();
    nextStone = StoneType.BLACK;
    resetKo();
    cnt = 0;
    hama[StoneType.BLACK] = 0;
    hama[StoneType.WHITE] = 0;
  }
  this.clear();

  function resetKo() {
    koX = null;
    koY = null;
  }

  function updateKo() {
    resetKo();
    if (removeTable.count() != 1)
      return;
    for (var x = 0; x < size; x++)
      for (var y = 0; y < size; y++)
        if (removeTable.isMarked(x, y)) {
          koX = x;
          koY = y;
          return;
        }
  }

  this.pass = function() {
    nextStone = StoneType.reverse(nextStone);
    cnt += 1;
    resetKo();
  }

  this.getNextStone = function() {
    return nextStone;
  }

  this.setNextStone = function(stone) {
    if (StoneType.exists(stone) && stone != nextStone) {
      resetKo();
      nextStone = stone;
    }
  }

  this.getStone = function(x, y) {
    if (board.isOutOfRange(x, y))
      return;
    return board.get(x, y);
  }

  this.setStone = function(x, y, stone) {
    if (board.isOutOfRange(x, y))
      return;
    board.set(x, y, stone);
    resetKo();
    return true;
  }

  this.putStone = function(x, y) {
    var stone = nextStone;
    var revStone = StoneType.reverse(stone);

    if (board.isOutOfRange(x, y))
      return;
    if (board.get(x, y) != StoneType.NONE)
      return;

    tmpBoard.copyFrom(board);
    tmpBoard.set(x, y, stone);

    removeTable.clear();
    mergeRemoveTable(x - 1, y, revStone);
    mergeRemoveTable(x + 1, y, revStone);
    mergeRemoveTable(x, y - 1, revStone);
    mergeRemoveTable(x, y + 1, revStone);

    if (x == koX && y == koY && removeTable.count() == 1)
      return;
    removeStones(removeTable);

    if (scanner.scan(x, y, tmpBoard, stone, StoneType.NONE).isEnabled())
      return;

    board.copyFrom(tmpBoard);
    updateKo();
    hama[stone] += removeTable.count();
    nextStone = revStone;
    cnt += 1;
    return true;
  }

  function removeStones(scannedTable) {
    var sum = 0;
    for (var x = 0; x < size; x++)
      for (var y = 0; y < size; y++)
        if (scannedTable.isMarked(x, y)) {
          if (tmpBoard.get(x, y) != StoneType.NONE)
            sum++;
          tmpBoard.set(x, y, StoneType.NONE);
        }
  }

  function mergeRemoveTable(x, y, stone) {
    removeTable.merge(scanner.scan(x, y, tmpBoard, stone, StoneType.NONE)); 
  }

  function getTerritory(stone) {
    var revStone = StoneType.reverse(stone);
    var result = new ScanTable(size);

    if (board.count(StoneType.BLACK) == 0 &&
        board.count(StoneType.WHITE) == 0)
      return result;

    for (var x = 0; x < size; x++) {
      for (var y = 0; y < size; y++) {
        if (result.isMarked(x, y))
          continue;
        var tmp = scanner.scan(x, y, board, StoneType.NONE, revStone);
        if (tmp.isEnabled())
          result.merge(tmp);
      }
    }
    return result;
  }

  this.getScore = function(stone) {
    return getTerritory(stone).count() + hama[stone];
  }

  this.getBlackHama = function() {
    return hama[StoneType.BLACK];
  }

  this.getWhiteHama = function() {
    return hama[StoneType.WHITE];
  }

  this.getCount = function() {
    return cnt;
  }
}

