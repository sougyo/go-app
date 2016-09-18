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
    return str.replace(/\t|\v|\n|\r/g, " ");
  }

  function parseText(str) {
    return str.replace(/\t|\v/g, " ");
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
    RE: genOneParser(parseSimpleText),
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

    KM: genOneParser(parseReal),

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
    readCollection(tree.superRoot);
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
      var p = parser ? parser(blocks) : undefined;

      if (p !== undefined)
        node.setPropertyWithType(ident, p, SgfNodeType.PARSED);
      else
        node.setPropertyWithType(ident, blocks, SgfNodeType.PARSE_FAILED);
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
        var block = nextPos(p + 1).slice(1, -1).replace(/\\\]/g, "]");
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

var SgfNodeType = {
  NOT_PARSED:   1,
  PARSED:       2,
  PARSE_FAILED: 3,
}

var SgfNode = function(parentNode) {
  var Elem = function(type, data) {
    this.type = type;
    this.data = data;

    this.copy = function() {
      var data = this.data;
      var new_data = data.hasOwnProperty("copy") ?
                       data.copy() :
                       JSON.parse(JSON.stringify(data));
      return new Elem(this.type, new_data);
    }
  }

  this.properties = {};
  this.parentNode = parentNode;
  this.children = [];
  this.childIndex = 0;

  this.setProperty = function(propIdent, propValue) {
    this.setPropertyWithType(propIdent, propValue, SgfNodeType.NOT_PARSED);
  }

  this.setPropertyWithType = function(propIdent, propValue, type) {
    this.properties[propIdent] = new Elem(type, propValue);
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
    var elem = this.properties[propIdent];
    if (elem && (elem.type == SgfNodeType.NOT_PARSED || elem.type == SgfNodeType.PARSED))
      return elem.data;
  }

  this.hasProperty = function(propIdent) {
    return this.properties.hasOwnProperty(propIdent);
  }

  this.removeProperty = function(propIdent) {
    delete this.properties[propIdent];
  }

  this.copy = function(parentNode) {
    var result = new SgfNode(parentNode);
    for (var ident in this.properties)
      result.properties[ident] = this.properties[ident].copy();
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

  function escapeStr(str) {
    var result = str.replace(/\]/g, "\\]");
    if (result.slice(-1) == "\\")
      result += " ";
    return result;
  }

  function propValue2str(propValue) {
    if (!propValue)
      return "[]";

    if (!isArray(propValue))
      propValue = [propValue];

    var result = "";
    for (var i = 0; i < propValue.length; i++)
      result += "[" + escapeStr(propValue[i].toString()) + "]";
    return result;
  }

  this.toString = function() {
    var result = ";";
    for (ident in this.properties) {
      result += ident;
      result += propValue2str(this.properties[ident].data);
    }
    return result;
  }
}

var SgfTree = function() {
  this.superRoot = new SgfNode(null);
  this.current = this.superRoot;

  this.getRoot = function() {
    if (!this.superRoot.hasChild())
      throw new Error("SgfTree has no any tree");

    return this.superRoot.getChild();
  }

  this.getRootIndex = function() {
    return this.superRoot.childIndex;
  }

  this.setRootIndex = function(index) {
    this.superRoot.setChildIndex(index);
  }

  this.newChild = function() {
    this.current.addChild(new SgfNode(this.current));
    this.current = this.current.getChild();
  }

  this.insertNewNode = function() {
    if (this.current === this.superRoot)
      return;

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
    if (this.current === this.superRoot)
      return;

    if (this.current.hasChild()) {
      this.current = this.current.getChild();
      return true;
    }
  }

  this.forwardTo = function(index) {
    if (this.current === this.superRoot)
      return;

    if (this.current.setChildIndex(index)) {
      this.current = this.current.getChild();
      return true;
    }
  }

  this.back = function() {
    if (this.current === this.superRoot)
      return;

    if (this.current.parentNode != this.superRoot) {
      this.current = this.current.parentNode;
      return true;
    }
  }

  this.cut = function() {
    if (this.current === this.superRoot)
      return;

    if (this.current.parentNode != this.superRoot) {
      this.current = this.current.parentNode;
      this.current.removeChild();
      return true;
    }
  }

  this.toSequence = function() {
    if (this.current === this.superRoot)
      return;

    var nodes = [];
    for (var cur = this.current; cur != this.superRoot; cur = cur.parentNode)
      nodes.unshift(cur);
    return nodes;
  }

  this.copy = function() {
    var tree = new SgfTree();
    tree.superRoot = this.superRoot.copy(null);

    var cur1 = this.superRoot;
    var cur2 = tree.superRoot;
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
    resetIndexesHelper(this.superRoot);
    this.current = this.getRoot();
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
        result += child.toString();
        writeHelepr(child, false);
        if (flag) result += ")";
      }
    }
    writeHelepr(this.superRoot, true);
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
    var stoneIdent = findKey(setupPropDict, stone);
    if (!stoneIdent)
      return false;

    if (this.tree.current.hasChild() ||
         (this.tree.current != this.tree.getRoot() && !existsIn(setupPropDict, this.tree.current)))
      this.tree.newChild();

    var node = this.tree.current;
    removeMatchedSetupPoint(node, x, y);
    var points = node.getProperty(stoneIdent);
    if (points)
      points.push(new IgoPoint(x, y));
    else
      node.setProperty(stoneIdent, [new IgoPoint(x, y)]);

    return true;
  }

  this.getGobanSize = function(tree) {
    return tree.getRoot().getProperty("SZ");
  }

  this.initIgoTree = function(size) {
    if (!tree.superRoot.hasChild())
      tree.newChild();

    tree.resetIndexes();

    tree.getRoot().setProperties({
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

