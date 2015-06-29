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

var IgoPoint = function(x, y) {
  this.x = x;
  this.y = y;

  function toChar(x) {
    if (0 <= x && x < 26)
      return String.fromCharCode("a".charCodeAt() + x);
    else if (26 <= x && x < 52)
      return String.fromCharCode("A".charCodeAt() + x - 26);
  }

  this.toString = function() {
    if (this.x >= 0 && this.y >= 0) {
      var strX = toChar(this.x);
      var strY = toChar(this.y);
      if (strX && strY)
        return strX + strY;
    }
    return ""
  }

  this.copy = function() {
    return new IgoPoint(this.x, this.y);
  }
}

var SgfPropParser = function() {
  function parseIgoPointX(c) {
    if (c.match(/^[a-z]$/))
      return c.charCodeAt() - "a".charCodeAt();

    if (c.match(/^[A-Z]$/))
      return c.charCodeAt() - "A".charCodeAt() + 26;
  }

  function parseIgoPoint(str) {
    if (str.match(/^$/))
      return new IgoPoint(-1, -1);

    if (str.match(/^[a-zA-Z][a-zA-Z]$/)) {
      var x = parseIgoPointX(str[0]);
      var y = parseIgoPointX(str[1]); 
      if (x >= 0 && y >= 0)
        return new IgoPoint(x, y);
    }
  }

  function parseNumber(str) {
    if (str.match(/^[+-]?\d+$/))
      return Number(str);
  }

  function parseReal(str) {
    if (str.match(/^[+-]?\d+(\.\d+)?$/))
      return Number(str);
  }

  function parseSimpleText(str) {
    // TODO
    return str;
  }

  function parseText(str) {
    // TODO
    return str;
  }

  function orParser(parse1, parse2) {
    return function(block) {
      var r1 = parse1(block);
      return r1 ? r1 : parse2(block);
    }
  }

  function genOneParser(parse) {
    return function(blocks) {
      if (blocks.length == 1)
        return parse(blocks[0]);
    };
  }

  function genManyParser(parse) {
    return function(blocks) {
      var result = [];
      for (var i = 0; i < blocks.length; i++) {
        var p = parse(blocks[i]);
        if (!p)
          return;
        result.push(p);
      }
      return result;
    }
  }

  return {
    B:  genOneParser(parseIgoPoint),
    KO: genOneParser(parseIgoPoint),
    MN: genOneParser(parseIgoPoint),
    W:  genOneParser(parseIgoPoint),

    AB: genManyParser(parseIgoPoint),
    AE: genManyParser(parseIgoPoint),
    AW: genManyParser(parseIgoPoint),

    C:  genOneParser(parseText),

    CA: genOneParser(parseSimpleText),
    FF: genOneParser(parseNumber),
    GM: genOneParser(parseNumber),
    ST: genOneParser(parseNumber),
    SZ: genOneParser(parseNumber),

    AN: genOneParser(parseSimpleText),
    BR: genOneParser(parseSimpleText),
    BT: genOneParser(parseSimpleText),
    CP: genOneParser(parseSimpleText),
    DT: genOneParser(parseSimpleText),
    EV: genOneParser(parseSimpleText),
    GN: genOneParser(parseSimpleText),
    GC: genOneParser(parseText),
    ON: genOneParser(parseSimpleText),
    OT: genOneParser(parseSimpleText),
    PB: genOneParser(parseSimpleText),
    PC: genOneParser(parseSimpleText),
    PW: genOneParser(parseSimpleText),
    PE: genOneParser(parseSimpleText),
    RO: genOneParser(parseSimpleText),
    RU: genOneParser(parseSimpleText),
    SO: genOneParser(parseSimpleText),
    TM: genOneParser(parseReal),
    US: genOneParser(parseSimpleText),
    WR: genOneParser(parseSimpleText),
    WT: genOneParser(parseSimpleText),

    BL: genOneParser(parseReal),
    OB: genOneParser(parseNumber),
    OW: genOneParser(parseNumber),
    WL: genOneParser(parseReal),
  };
}();

var SgfReader = function() {
  var Eof            = 0;
  var LeftParenthes  = 1;
  var RightParenthes = 2;
  var Semicolon      = 3;
  var UcWord         = 4;
  var BracketBlock   = 5;

  var rest;
  var pos;
  var cache;

  this.readSgf = function(str) {
    rest = str.replace(/\s+$/, "");
    pos  = 0;

    var tree = new SgfTree();
    readCollection(tree.root);
    tree.resetIndexes();
    return tree;
  }

  var Token = function(type, data) {
    this.type = type;
    this.data = data;
  }

  function readCollection(parentNode) {
    while (readGameTree(parentNode));
  }

  function readGameTree(parentNode) {
    if (!readTokenByType(LeftParenthes))
      return;

    var nodes = readNodeSequence(parentNode);
    if (nodes.length == 0)
      parseError();

    readCollection(nodes[nodes.length - 1]);

    consumeToken(RightParenthes);
    return true;
  }

  function readNodeSequence(parentNode) {
    var nodes = []
    var node = parentNode;
    while(node = readNode(node))
      nodes.push(node);
    return nodes;
  }

  function readNode(parentNode) {
    if (!readTokenByType(Semicolon))
      return;

    var node = new SgfNode(parentNode);

    var ident;
    while (ident_token = readTokenByType(UcWord)) {
      var ident = ident_token.data;
      var blocks = [];
      while(block_token = readTokenByType(BracketBlock))
        blocks.push(block_token.data);
      
      var parser = SgfPropParser[ident];
      if (parser) {
        var p = parser(blocks);
        if (p)
          node.setProperty(ident, p);
      } else
        node.setProperty(ident, blocks);
    }

    parentNode.addChild(node);
    return node;
  }

  function readTokenByType(type) {
    var token = nextToken();

    if (token.type == type)
      return token;

    if (token.type != Eof)
      cacheToken(token);
  }

  function consumeToken(type) {
    var token = nextToken();
    if (token.type != type)
      throw new Error("Parse Error: Expected:" + type + " Actual:" + token.type + " at:" + pos);
  }

  function cacheToken(token) {
    if (cache)
      throw new Error("Parse Error: unexpected cache");
    cache = token;
  }

  function nextToken() {
    if (cache) {
      var ret = cache;
      cache = null;
      return ret;
    }

    skipSpace();
    
    if (!rest[0])
      return new Token(Eof, true);

    switch (rest[0]) {
      case '(':
        nextPos(1);
        return new Token(LeftParenthes, true);
      case ')':
        nextPos(1);
        return new Token(RightParenthes, true);
      case ';':
        nextPos(1);
        return new Token(Semicolon, true);
      case '[':
        var p = 0;
        do {
          p = rest.indexOf("]", p + 1);
          if (p == -1)
            parseError();
        } while (rest[p - 1] == '\\');
        var block = nextPos(p + 1).slice(1, -1);
        return new Token(BracketBlock, block);
      default:
        var tmp = rest.match(/[^A-Z]/);
        if (!tmp || tmp.index == 0)
          parseError();

        var ident = nextPos(tmp.index);
        return new Token(UcWord, ident);
    }
  }

  function skipSpace() {
    result = rest.match(/[^\s]/);
    if (result)
      nextPos(result.index);
  }

  function nextPos(n) {
    if (!n)
      return ""

    var ret = rest.substr(0, n);
    rest = rest.substr(n);
    pos += n;
    return ret;
  }

  function parseError() {
    throw new Error("Parse Error at:" + pos + " rest: '" + rest.substr(0, 10) + "'");
  }
}

var SgfNode = function(parentNode) {
  this.properties = {};

  this.parentNode = parentNode;
  this.children = [];
  this.childIndex = 0;

  this.setProperty = function(propIdent, propValue) {
    this.properties[propIdent] = propValue;
  }

  this.setProperties = function(props, overwrite) {
    for (key in props) {
      if (overwrite || this.getProperty(key) === undefined) {
        var val = props[key];
        if (val !== undefined)
          this.setProperty(key, props[key]);
      }
    }
  }

  this.getProperty = function(propIdent) {
    return this.properties[propIdent];
  }

  this.hasProperty = function(propIdent) {
    return this.properties.hasOwnProperty(propIdent);
  }

  this.removeProperty = function(propIdent) {
    delete this.properties[propIdent];
  }

  this.copy = function(parentNode) {
    var result = new SgfNode(parentNode);
    for (var ident in this.properties) {
      var prop = this.properties[ident];
      result.properties[ident] = prop.hasOwnProperty("copy") ?
                                   prop.copy() :
                                   JSON.parse(JSON.stringify(prop));
    }
    for (var i = 0; i < this.children.length; i++)
      result.addChild(this.children[i].copy(result));
    result.setChildIndex(this.childIndex);
    return result;
  }

  this.addChild = function(child) {
    this.children.push(child);
    this.childIndex = this.children.length - 1;
  }

  this.removeChild = function() {
    this.children.splice(this.childIndex, 1);
    this.childIndex = 0;
  }

  this.hasChild = function() {
    return this.children.length > 0;
  }

  this.setChildIndex = function(i) {
    if (0 <= i && i < this.children.length) {
      this.childIndex = i;
      return true;
    }
  }

  this.getChild = function() {
    if (this.hasChild())
      return this.children[this.childIndex];
  }

  this.getChildAt = function(index) {
    return this.children[index];
  }

  this.setChild = function(child) {
    this.children[this.childIndex] = child;
  }

  function propValue2str(propValue) {
    if (!propValue)
      return "[]";

    if (!isArray(propValue))
      propValue = [propValue];

    var result = "";
    for (var i = 0; i < propValue.length; i++)
      result += "[" + propValue[i].toString() + "]";
    return result;
  }

  this.toString = function() {
    var result = ";";
    for (ident in this.properties) {
      result += ident;
      result += propValue2str(this.properties[ident]);
    }
    return result;
  }
}

var SgfTree = function() {
  this.root = new SgfNode(null);
  this.current = this.root;

  this.newChild = function() {
    this.current.addChild(new SgfNode(this.current));
    this.current = this.current.getChild();
  }

  this.insertNewNode = function() {
    var cur = this.current;

    if (cur.hasChild()) {
      var node = new SgfNode(cur);
      node.addChild(cur.getChild());
      cur.setChild(node);
      node.getChild().parentNode = node;
      this.current = this.current.getChild();
    } else {
      this.newChild();
    }
  }

  this.forward = function() {
    if (this.current.hasChild()) {
      this.current = this.current.getChild();
      return true;
    }
  }

  this.forwardTo = function(index) {
    if (this.current.setChildIndex(index)) {
      this.current = this.current.getChild();
      return true;
    }
  }

  this.back = function() {
    if (this.current != this.root) {
      this.current = this.current.parentNode;
      return true;
    }
  }

  this.cut = function() {
    if (this.current != this.root) {
      this.current = this.current.parentNode;
      this.current.removeChild();
      return true;
    }
  }

  this.toSequence = function() {
    var nodes = [];
    for (var cur = this.current; cur != this.root; cur = cur.parentNode)
      nodes.unshift(cur);
    return nodes;
  }

  this.copy = function() {
    var tree = new SgfTree();
    tree.root = this.root.copy(null);

    var cur1 = this.root;
    var cur2 = tree.root;
    while (cur1) {
      if (cur1 === this.current) {
        tree.current = cur2;
        break;
      }
      cur1 = cur1.getChild();
      cur2 = cur2.getChild();
    }
    return tree;
  }

  this.toString = function() {
    var result = "";
    var nodes = this.toSequence();
    for (var i = 0; i < nodes.length; i++)
      result += nodes[i].toString();
    return result;
  }

  this.resetIndexes = function() {
    this.current = this.root;
    resetIndexesHelper(this.root);
  }

  function resetIndexesHelper(node) {
    node.setChildIndex(0);
    var children = node.children;
    for (var i = 0; i < children.length; i++) {
      var child = children[i];
      if (child.parentNode != node)
        throw new Error("detect invalid link");
      resetIndexesHelper(child);
    }
  }

  this.toSgf = function() {
    result = "";
    var writeHelepr = function(node, force) {
      var children = node.children;
      var flag = force || (children.length == 1 ? false : true);

      for (var i = 0; i < children.length; i++) {
        if (flag) result += "(";
        var child = children[i];
        result += child;
        writeHelepr(child, false);
        if (flag) result += ")";
      }
    }
    writeHelepr(this.root, true);
    return result;
  }
}

var Move = function(x, y, stone) {
  this.x = x;
  this.y = y;
  this.stone = stone;

  this.isPass = function() {
    return x < 0 || y < 0;
  }
}

var PropUtil = function(tree) {
  this.tree = tree;

  var movePropDict = {
    "B": StoneType.BLACK,
    "W": StoneType.WHITE
  };

  var setupPropDict = {
    "AB": StoneType.BLACK,
    "AW": StoneType.WHITE,
    "AE": StoneType.NONE 
  };

  function findKey(hash, val) {
    for (key in hash)
      if (hash[key] == val)
        return key;
  }

  function existsIn(dict, node) {
    for (ident in dict)
      if (node.hasProperty(ident))
        return true;
    return false;
  }

  function removeMatchedSetupPoint(node, x, y) {
    for (ident in setupPropDict) {
      var points = node.getProperty(ident);
      if (points) {
        for (var i = 0; i < points.length; i++) {
          var p = points[i];
          if (p.x == x && p.y == y) {
            points.splice(i, 1);
            break;
          }
        }
        if (points.length == 0)
          node.removeProperty(ident);
      }
    }
  }

  this.getMoveFrom = function(node) {
    for (ident in movePropDict) {
      var p = node.getProperty(ident);
      if (p)
        return new Move(p.x, p.y, movePropDict[ident]);
    }
  }

  this.addMoveProperty = function(x, y, stone) {
    var stoneIdent = findKey(movePropDict, stone);
    if (!stoneIdent)
      return;

    var node = this.tree.current;
    for (var i = 0; i < node.children.length; i++) {
      var p = node.getChildAt(i).getProperty(stoneIdent);
      if (p && p.x == x && p.y == y) {
        this.tree.forwardTo(i);
        return;
      }
    }
    this.tree.newChild();
    this.tree.current.setProperty(stoneIdent, new IgoPoint(x, y));
  }

  this.getSetupMovesFrom = function(node) {
    var result = [];
    for (ident in setupPropDict) {
      var points = node.getProperty(ident);
      if (points) {
        for (var i = 0; i < points.length; i++) {
          var p = points[i];
          result.push(new Move(p.x, p.y, setupPropDict[ident]));
        }
      }
    }
    return result;
  }

  this.addSetupProperty = function(x, y, stone) {
    if (this.tree.current.hasChild())
      return false;

    var stoneIdent = findKey(setupPropDict, stone);
    if (!stoneIdent)
      return false;

    if (!existsIn(setupPropDict, this.tree.current))
      this.tree.insertNewNode();

    var node = this.tree.current;
    removeMatchedSetupPoint(node, x, y);
    var points = node.getProperty(stoneIdent);
    if (points)
      points.push(new IgoPoint(x, y));
    else
      node.setProperty(stoneIdent, [new IgoPoint(x, y)]);

    return true;
  }

  this.isStoneProp = function() {
    var node = this.tree.current();
    return (this.getMoveFrom(node) || this.getSetupMovesFrom(node)) ? true : false;
  }

  this.isRootNode = function() {
    return this.tree.current == this.tree.root;
  }

  this.isRootPropNode = function() {
    return this.tree.current.parentNode == this.tree.root;
  }

  this.getRootPropNode = function() {
    return this.tree.root.getChild();
  }

  this.getGameInfoPropNode = function() {
    return this.getRootPropNode();
  }

  this.isLeafNode = function() {
    return !this.tree.current.hasChild();
  }

  this.backToHead = function() {
    while (true) {
      if (this.isRootNode() || this.isRootPropNode())
        break;
      this.tree.back();
    }
  }

  this.forwardToTail = function() {
    while (true) {
      if (this.isLeafNode())
        break;
      this.tree.forward();
    }
  }

  this.getGobanSize = function() {
    return this.getRootPropNode().getProperty("SZ");
  }

  this.initIgoTree = function(size) {
    tree.resetIndexes();

    if (tree.root.hasChild())
      tree.forward();
    else
      tree.newChild();

    this.getRootPropNode().setProperties({
      "FF": 4,
      "GM": 1,
      "SZ": size
    }, false);
  }
}

var IgoTreeFactory = new function() {
  var igoTree = function(size, tree) {
    var propUtil = new PropUtil(tree);
    propUtil.initIgoTree(size);
    return tree;
  }

  this.create = function(size) {
    var tree = new SgfTree();
    return igoTree(size, tree);
  }

  this.createBySgf = function(sgf) {
    var reader = new SgfReader();
    var tree = reader.readSgf(sgf);
    return igoTree(null, tree);
  }
}();

var IgoPlayer = function(igoTree) {
  this.sgfTree = igoTree;
  this.propUtil = new PropUtil(igoTree);

  this.size = this.propUtil.getGobanSize();
  if (!this.size)
    throw new Error("cannot get size");

  this.rule = new IgoRuleEngine(this.size);
  this.listeners = [];

  this.putStone = function(x, y) {
    var stone = this.rule.getNextStone();
    if (this.rule.putStone(x, y)) {
      this.propUtil.addMoveProperty(x, y, stone);
      this.notify();
    }
  }

  this.setStone = function(x, y, stone) {
    if (this.getStone(x, y) != stone && this.propUtil.addSetupProperty(x, y, stone)) {
      this.rule.setStone(x, y, stone)
      this.notify();
    }
  }

  this.getStone = function(x, y) {
    return this.rule.getStone(x, y);
  }

  this.changeStone = function() {
    this.rule.setNextStone(StoneType.reverse(this.rule.getNextStone()));
    this.notify();
  }

  this.updateGoban = function() {
    this.rule.clear();
    var nodes = this.sgfTree.toSequence();
    for (var i = 0; i < nodes.length; i++) {
      var node = nodes[i];
      var move = this.propUtil.getMoveFrom(node);
      if (move) {
        this.rule.setNextStone(move.stone);
        this.rule.putStone(move.x, move.y);
      }
      var moves = this.propUtil.getSetupMovesFrom(node);
      if (moves) {
        for (var j = 0; j < moves.length; j++) {
          var move = moves[j];
          this.rule.setStone(move.x, move.y, move.stone);
        }
      }
    }
    this.notify();
  }

  this.back = function() {
    this.backN(1);
  }

  this.backN = function(n) {
    for (var i = 0; i < n; i++) {
      if (this.propUtil.isRootPropNode())
        break;
      this.sgfTree.back();
    }
    this.updateGoban();
  }

  this.forward = function() {
    this.forwardN(1);
  }

  this.forwardN = function(n) {
    for (var i = 0; i < n; i++) {
      if (!this.sgfTree.current.hasChild())
        break;
      this.sgfTree.forward();
    }
    this.updateGoban();
  }

  this.backToHead = function() {
    this.propUtil.backToHead();
    this.updateGoban();
  }

  this.forwardToTail = function() {
    this.propUtil.forwardToTail();
    this.updateGoban();
  }

  this.cut = function() {
    if (this.propUtil.isRootPropNode())
      return;
    if (this.sgfTree.cut())
      this.updateGoban();
  }

  this.isLeaf = function() {
    return !this.moveTree.current.hasChild();
  }

  this.pass = function() {
    var stone = this.rule.getNextStone();
    this.rule.pass();
    this.propUtil.addMoveProperty(-1, -1, stone);
    this.notify();
  }

  this.addListener = function(listener) {
    this.listeners.push(listener);
  }

  this.notify = function() {
    for (var i = 0; i < this.listeners.length; i++)
      this.listeners[i]();
  }

  this.copy = function() {
    var player = new IgoPlayer(this.size, this.sgfTree.copy());
    player.updateGoban();
    return player;
  }

  function existsNode(root, node) {
    if (root === node)
      return true;

    for (var i = 0; i < root.children.length; i++) {
      var r = existsNode(root.children[i], node);
      if (r)
        return r;
    }
    return false;
  }

  this.setCurrent = function(node) {
    if (!existsNode(this.propUtil.getRootPropNode(), node))
      return;

    this.sgfTree.current = node;

    var p = node.parentNode;
    while (p !== this.sgfTree.root && p !== this.propUtil.getRootPropNode()) {
      var t = null;
      for (var i = 0; i < p.children.length; i++) {
        if (p.children[i] === node) {
          p.setChildIndex(i);
          node = p;
          p = p.parentNode;
          t = true;
          break;
        }
      }
      if (!t)
        throw new Error("internal error");
    }
    this.updateGoban();
  }
}

var GoDrawerEnv = function(size, ctx) {
  this.size = size;
  this.ctx  = ctx;

  this.paddingTop    = 5;
  this.paddingBottom = 30;
  this.paddingLeft   = 10;
  this.paddingRight  = 10;

  this.resize = function(width, height) {
    this.canvasWidth  = width;
    this.canvasHeight = height;

    this.boardAreaWidth  = this.canvasWidth  - this.paddingLeft - this.paddingRight;
    this.boardAreaHeight = this.canvasHeight - this.paddingTop  - this.paddingBottom;
    this.hgrid = Math.floor(Math.min(this.boardAreaWidth, this.boardAreaHeight) / (2 * size));
    this.grid  = this.hgrid * 2;
    this.boardSize = this.grid * size;

    this.xOffset = (this.boardAreaWidth  - this.boardSize) / 2 + this.paddingLeft;
    this.yOffset = (this.boardAreaHeight - this.boardSize) / 2 + this.paddingTop;

    ctx.canvas.width  = this.canvasWidth;
    ctx.canvas.height = this.canvasHeight;
  }

  this.drawLine = function(x1, y1, x2, y2) {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }

  this.drawCircle = function(x, y, r, fill) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI*2, false);
    if (fill)
      ctx.fill();
    else
      ctx.stroke();
  }

  this.drawImage = function(image, x, y, width, height) {
    try {
      ctx.drawImage(image, x, y, width, height);
    } catch (e) {
      if (e.name != "NS_ERROR_NOT_AVAILABLE")
      throw e;
    }
  }

  this.toX = function(i) {
    return this.grid * i + this.hgrid + this.xOffset;
  }

  this.toY = function(j) {
    return this.grid * j + this.hgrid + this.yOffset;
  }

  this.toI = function(x) {
    return Math.floor((x - this.xOffset) / this.grid);
  }

  this.toJ = function(y) {
    return Math.floor((y - this.yOffset) / this.grid);
  }

  this.mouseEventToIJ= function(e) {
    var rect = e.target.getBoundingClientRect();
    var x = e.clientX - rect.left;
    var y = e.clientY - rect.top;
    return { i: this.toI(x), j: this.toJ(y) };
  }
}

var GoDrawer = function(size, ctx) {
  this.env = new GoDrawerEnv(size, ctx);
  this.handlers = [];

  this.addDrawHandler = function(handler) {
    this.handlers.push(handler);
  }

  this.resize = function(width, height) {
    this.env.resize(width, height);
    this.draw();
  }

  this.draw = function() {
    for (var i = 0; i < this.handlers.length; i++) {
      var handler = this.handlers[i];
      if (handler.draw) {
        ctx.save();
        handler.draw(this.env);
        ctx.restore();
      }
    }
  }
}

var DefaultGoDrawerFactory = function() {

  var BackgroundDrawer = function(option) {
    var bgColor  = option.shouldGet("bgColor", "white");
    var boardImg = option.shouldGet("boardImg");

    this.draw = function(env) {
      env.ctx.fillStyle = bgColor;
      env.ctx.fillRect(0, 0, env.canvasWidth, env.canvasHeight);
      env.ctx.drawImage(boardImg, env.xOffset, env.yOffset, env.boardSize, env.boardSize);
    }
  }

  var GridDrawer = function(option) {
    var lineWidth = option.shouldGet("lineWidth", 1);
    var lineColor = option.shouldGet("lineColor", "black");

    this.draw = function(env) {
      this.drawLine(env);
      this.drawPoint(env);
    }

    this.drawLine = function(env) {
      var size = env.size;
      env.ctx.lineWidth   = Number(lineWidth);
      env.ctx.strokeStyle = lineColor;
      for (var i = 0; i < size; i++) {
        env.drawLine(env.toX(0), env.toY(i), env.toX(size - 1), env.toY(i));
        env.drawLine(env.toX(i), env.toY(0), env.toX(i), env.toY(size - 1));
      }
    }

    this.drawPoint = function(env) {
      var size = env.size;
      var lpos = 3;
      var rpos = size - lpos - 1;
      var hpos = Math.floor(size / 2);

      var points = [];
      if (size > 10) {
        points.push([lpos, lpos]);
        points.push([rpos, lpos]);
        points.push([lpos, rpos]);
        points.push([rpos, rpos]);
      }
      if ((size % 2 == 1) && size >= 19) {
        points.push([hpos, hpos]);
        points.push([lpos, hpos]);
        points.push([hpos, lpos]);
        points.push([rpos, hpos]);
        points.push([hpos, rpos]);
      }

      var pointSize = env.hgrid / 4;
      env.ctx.fillStyle = 'black';
      for (var i = 0; i < points.length; i++) {
        var p = points[i];
        env.drawCircle(env.toX(p[0]), env.toY(p[1]), pointSize, true);
      }
    }
  }

  var StoneDrawer = function(option, player) {
    var blackStoneColor = option.shouldGet("blackStoneColor", "black");
    var whiteStoneColor = option.shouldGet("whiteStoneColor", "white");
    var blackStoneImg   = option.shouldGet("blackStoneImg");
    var whiteStoneImg   = option.shouldGet("whiteStoneImg");

    this.draw = function(env) {
      this.drawShadow(env);
      this.drawCircle(env);
      this.drawImage(env);
    }

    this.drawShadow = function(env) {
      var size = env.size;
      var offset = env.hgrid / 6;
      var shadowSize = env.hgrid * 0.9;
      var ctx = env.ctx;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
      for (var i = 0; i < size; i++)
        for (var j = 0; j < size; j++)
          if (StoneType.exists(player.getStone(i, j)))
            env.drawCircle(env.toX(i) - offset, env.toY(j) + offset, shadowSize, true);

    }

    this.drawCircle = function(env) {
      var size = env.size;
      var stoneSize = env.hgrid - 1;
      var ctx = env.ctx;
      ctx.globalAlpha = 1.0;

      for (var i = 0; i < size; i++) {
        for (var j = 0; j < size; j++) {
          var stone = player.getStone(i, j);
          if (StoneType.exists(stone)) {
            var color = stone == StoneType.BLACK ? blackStoneColor : whiteStoneColor;
            ctx.fillStyle = color;
            ctx.strokeStyle = 'rgb(0, 0, 0)';
            ctx.lineWidth = 1;
            env.drawCircle(env.toX(i), env.toY(j), stoneSize, true);
          }
        }
      }
    }

    this.drawImage = function(env) {
      var size = env.size;
      var imgSize = env.grid - 2;
      for (var i = 0; i < size; i++) {
        for (var j = 0; j < size; j++) {
          var stone = player.getStone(i, j);
          if (StoneType.exists(stone)) {
            var img = stone == StoneType.BLACK ? blackStoneImg : whiteStoneImg;
            env.drawImage(img, env.toX(i) - imgSize / 2, env.toY(j) - imgSize / 2, imgSize, imgSize);
          }
        }
      }
    }
  }

  var HamaDrawer = function(option, player) {
    this.draw = function(env) {
      if (env.paddingBottom < 20)
        return;
      var ctx = env.ctx;
      var y = env.paddingTop + env.boardAreaHeight + 25;
      var basex = env.xOffset + 5;
      ctx.fillStyle = "black";
      ctx.font = "14pt Arial";
      ctx.fillText("Cnt: "   + player.rule.getCount(), basex + 0, y);
      ctx.fillText("Black: " + player.rule.getBlackHama(), basex + 80, y);
      ctx.fillText("White: " + player.rule.getWhiteHama(), basex + 160, y);
      
      var move = player.propUtil.getMoveFrom(player.sgfTree.current);
      if (move && move.isPass())
        ctx.fillText((move.stone == StoneType.BLACK ? "Black" : "White") + " Pass", basex + 260, y);
    }
  }

  var ChildrenDrawer = function(option, player) {
    var branchPointColor = option.shouldGet("branchPointColor", "pink");
    this.draw = function(env) {
      var tree = player.sgfTree;
      var nodes = tree.current.children;
      if (nodes.length < 2)
        return;
      var pointSize = env.hgrid / 2;
      env.ctx.fillStyle = branchPointColor;
      var stone = player.rule.getNextStone();
      for (var i = 0; i < nodes.length; i++) {
        var node = nodes[i];
        var move = player.propUtil.getMoveFrom(node);
        if (move.stone == stone)
          env.drawCircle(env.toX(move.x), env.toY(move.y), pointSize, true);
      }
    }
  }


  var NumberDrawer = function(option, player) {
    var size = player.size;
    var numberTable = new Array(size);
    for (var i = 0; i < size; i++)
      numberTable[i] = new Array(size);

    this.draw = function(env) {
      if (!option.shouldGet("stoneNumber", false))
        return;
      var nodes = player.sgfTree.toSequence();
      var ctx = env.ctx;
      ctx.font = Math.floor(env.grid * 0.5) + "px Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      var cnt = 0;

      for (var i = 0; i < size; i++)
        for (var j = 0; j < size; j++)
          numberTable[i][j] = undefined;

      for (var i = 0; i < nodes.length; i++) {
        var node = nodes[i];
        var move = player.propUtil.getMoveFrom(node);
        if (move) {
          cnt += 1;
          if (StoneType.exists(player.getStone(move.x, move.y)))
            numberTable[move.x][move.y] = cnt;
        }
      }

      for (var i = 0; i < size; i++) {
        for (var j = 0; j < size; j++) {
          var cnt = numberTable[i][j];
          if (cnt !== undefined) {
            ctx.fillStyle = player.getStone(i, j) == StoneType.BLACK ? "white" : "black";
            ctx.fillText(cnt.toString(), env.toX(i), env.toY(j));
          }
        }
      }
    }
  }

  function createImage(drawer, path) {
    var img = new Image();
    img.src = path;
    img.onload = function() {
      drawer.draw();
    }
    return img;
  }

  this.create = function(player, ctx, option) {
    var drawer = new GoDrawer(player.size, ctx);

    option.blackStoneImg = createImage(drawer, option.blackStoneImagePath);
    option.whiteStoneImg = createImage(drawer, option.whiteStoneImagePath);
    option.boardImg      = createImage(drawer, option.boardImagePath);

    option.shouldGet = function(key, defaultVal) {
      var x = this[key];
      if (x !== undefined)
        return x;
      else if(defaultVal !== undefined)
        return defaultVal;

      throw new Error("shouldGet failed: " + key);
    }

    drawer.addDrawHandler(new BackgroundDrawer(option));
    drawer.addDrawHandler(new GridDrawer(option));
    drawer.addDrawHandler(new StoneDrawer(option, player));
    drawer.addDrawHandler(new HamaDrawer(option, player));
    drawer.addDrawHandler(new ChildrenDrawer(option, player));
    drawer.addDrawHandler(new NumberDrawer(option, player));

    return drawer;
  }
}

var TreeDrawer = function(player, treeCanvas, ctx) {
  var transX = 0;
  var transY = 0;
  var saveX  = null;
  var saveY  = null;
  this.matrix = null;
  this.currentX = null;
  this.currentY = null;
  this.r = 8;

  function drawLine(x1, y1, x2, y2) {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }

  function drawCircle(x, y, r, fill) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI*2, false);
    if (fill)
      ctx.fill();
    else
      ctx.stroke();
  }

  function makeMatrix() {
    var matrix = new Array();
    makeMatrixHelper(matrix, player.sgfTree.root, 0, 0);
    return matrix;
  }

  function makeMatrixHelper(matrix, node, x, y) {
    if (!matrix[x])
      matrix[x] = new Array();

    matrix[x][y] = node;

    var height = 0;
    for (var j = 0; j < node.children.length; j++)
      height += makeMatrixHelper(matrix, node.children[j], x + 1, y + height);

    return node.children.length == 0 ? 1 : height;
  }

  function toX(i) {
    return i * 20 + 50;
  }

  function toY(j) {
    return j * 20 + 50;
  }

  function toI(x) {
    return Math.round((x - transX - 50) / 20);
  }

  function toJ(y) {
    return Math.round((y - transY - 50) / 20);
  }

  this.resetPosition = function() {
    if (saveX == null && saveY == null && this.currentX && this.currentY) {
      transX = -this.currentX + 100;
      transY = -this.currentY + 100;
    }
  }

  this.draw = function(dontReset) {
    ctx.fillStyle = 'wheat';
    ctx.fillRect(0, 0, 600, 600);

    this.matrix = makeMatrix();
    var matrix = this.matrix;

    var lines = [];
    var circles = [];
    
    for (var i = 0; i < matrix.length; i++) {
      for (var j = 0; j < matrix[i].length; j++) {
        var node = matrix[i][j];
        if (node && matrix[i+1]) {
          for (var k = j; k < matrix[i+1].length && (matrix[i][k] === node || !matrix[i][k]); k++) {
            if (matrix[i+1][k]) {
              lines.push([toX(i), toY(k), toX(i + 1), toY(k)]);
              lines.push([toX(i), toY(j), toX(i), toY(k)]);
            }
          }
        }
      }
    }

    for (var i = 0; i < matrix.length; i++) {
      for (var j = 0; j < matrix[i].length; j++) {
        var node = matrix[i][j];
        if (node) {
          var move = player.propUtil.getMoveFrom(node);
          var color = 'green';
          if (move)
            color = (move.stone == StoneType.BLACK) ? 'black' : 'white';

          var x = toX(i);
          var y = toY(j);

          circles.push([color, x, y, this.r, true]);
          if (node === player.sgfTree.current) {
            circles.push(['red', x, y, this.r, false]);
            this.currentX = x;
            this.currentY = y;
          }
        }
      }
    }
    if (!dontReset)
      this.resetPosition();
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, transX, transY);
    ctx.strokeStyle = 'black';
    for (var i = 0; i < lines.length; i++) {
      var a = lines[i];
      drawLine(a[0], a[1], a[2], a[3]);
    }

    for  (var i = 0; i < circles.length; i++) {
      var a = circles[i];
      ctx.strokeStyle = a[0];
      ctx.fillStyle   = a[0];
      drawCircle(a[1], a[2], a[3], a[4]);
    }

    ctx.font = "10px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = 'black';
    for (var i = 1; i < this.matrix.length; i += 5) {
      ctx.fillText(i, toX(i), toY(-1));
    }
    ctx.restore();
  }

  treeCanvas.addEventListener("mousedown", function(e) {
    var rect = e.target.getBoundingClientRect();
    var x = e.clientX - rect.left;
    var y = e.clientY - rect.top;
    saveX = x;
    saveY = y;
  });

  var varThis = this;
  treeCanvas.addEventListener("mousemove", function(e) {
    var rect = e.target.getBoundingClientRect();
    var x = e.clientX - rect.left;
    var y = e.clientY - rect.top;
    if (saveX !== null && saveY !== null) {
      transX += x - saveX;
      transY += y - saveY;
      saveX = x;
      saveY = y;
    }
    varThis.draw(true);
  });

  treeCanvas.addEventListener("mouseup", function(e) {
    saveX = null;
    saveY = null;
    
    var rect = e.target.getBoundingClientRect();
    var x = e.clientX - rect.left;
    var y = e.clientY - rect.top;

    var i = toI(x);
    var j = toJ(y);
    var node = null;
    if (varThis.matrix[i])
      node = varThis.matrix[i][j];
    if (node) {
      player.setCurrent(node);
    }

    varThis.draw(true);
  });

  treeCanvas.addEventListener("mouseout", function(e) {
    saveX = null;
    saveY = null;
    varThis.draw(true);
  });

  this.draw();
  this.resetPosition();
}

var ClickType = {
  MOVE: 1,
  BLACK: 2,
  WHITE: 3,
  ERASE: 4
}

var createDrawer = function(player, id1, id2, opt) {
  var gobanCanvas = document.getElementById(id1);
  if (!gobanCanvas || !gobanCanvas.getContext)
    return;
  var treeCanvas  = document.getElementById(id2);
  if (!treeCanvas || !treeCanvas.getContext)
    return;

  var factory = new DefaultGoDrawerFactory();
  var drawer = factory.create(player, gobanCanvas.getContext('2d'), opt);
  var treeDrawer = new TreeDrawer(player, treeCanvas, treeCanvas.getContext('2d'));
  
  var env = drawer.env;
  var downPos = {};

  gobanCanvas.addEventListener("click", function(e) {
    var p = env.mouseEventToIJ(e);
    var r = e.target.getBoundingClientRect();
    if (p.i    == downPos.p.i    &&
        p.j    == downPos.p.j    &&
        r.left == downPos.r.left &&
        r.top  == downPos.r.top) {
      switch (opt.clickType) {
      case ClickType.BLACK:
        player.setStone(p.i, p.j, StoneType.BLACK);
        break;
      case ClickType.WHITE:
        player.setStone(p.i, p.j, StoneType.WHITE);
        break;
      case ClickType.ERASE:
        player.setStone(p.i, p.j, StoneType.NONE);
        break;
      default:
        player.putStone(p.i, p.j);
      }
    }
  });

  player.addListener(function() {
    treeDrawer.resetPosition();
    treeDrawer.draw();
  });

  gobanCanvas.addEventListener("mousedown", function(e) {
    downPos.p = env.mouseEventToIJ(e);
    downPos.r = e.target.getBoundingClientRect();
  });

  player.addListener(function() {
    drawer.draw();
  });

  return drawer;
}

if (typeof(module) != "undefined") {
  module.exports = {
   Move:      Move,
   StoneType: StoneType,
   SgfNode:   SgfNode,
   SgfTree:   SgfTree,
   IgoPlayer: IgoPlayer,
   IgoPoint:  IgoPoint,
   SgfReader: SgfReader,
  }
}

