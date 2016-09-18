var IgoPlayer = function(igoTree) {
  this.sgfTree = igoTree;
  this.propUtil = new PropUtil(igoTree);

  this.size = this.propUtil.getGobanSize(igoTree);
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
    for (var i = 0; i < n; i++)
      this.sgfTree.back();
    this.updateGoban();
  }

  this.forward = function() {
    this.forwardN(1);
  }

  this.forwardN = function(n) {
    for (var i = 0; i < n; i++)
      this.sgfTree.forward();
    this.updateGoban();
  }

  this.backToHead = function() {
    while (this.sgfTree.back());
    this.updateGoban();
  }

  this.forwardToTail = function() {
    while (this.sgfTree.forward());
    this.updateGoban();
  }

  this.cut = function() {
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
    if (!existsNode(this.sgfTree.getRoot(), node))
      return;

    this.sgfTree.current = node;

    var p = node.parentNode;
    while (p !== this.sgfTree.superRoot) {
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
