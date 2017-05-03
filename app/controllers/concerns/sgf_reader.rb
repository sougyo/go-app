class SgfNode
  attr_reader :children

  def initialize(parent_node)
    @parent_node = parent_node
    @props = {}
    @children = []
  end

  def set(ident, val)
    @props[ident] = val
  end

  def add_child(node)
    @children << node
  end

  def show
    puts "[#{@props.to_s}]"
    @children.each do |node|
      node.show
    end
  end

  def get(ident)
    @props[ident]
  end

  def find(ident)
    return @props[ident] if @props.has_key?(ident)
    @children.each do |node|
      return v if v = node.find(ident)
    end
    nil
  end

  def select(ident)
    result = []
    result << @props[ident] if @props.has_key?(ident)
    @children.each do |node|
      result += node.select(ident)
    end
    result
  end

  def to_sgf
    result = ""

    p = Proc.new do |node, force|
      children = node.children
      flag = force || (children.length == 1 ? false : true)

      children.each do |c|
        result += "(" if flag
        result += c.to_s
        p.call(c, false)
        result += ")" if flag
      end
    end
    p.call(self, true)
    result
  end

  def to_s
    result = ";"
    @props.each do |ident, val|
      result += (ident + prop_value2str(val))
    end
    result
  end

  private

  def prop_value2str(val)
    return "[]" if val.nil?

    if val.class != Array
      val = [val]
    end

    result = ""
    val.each do |e|
      result += "[#{escape_str(e)}]"
    end
    result
  end

  def escape_str(str)
    result = str.gsub(/\]/, "\\]")
    result += " " if result[-1] == "\\"
    result
  end

end

class SgfParseError < StandardError
  attr_reader :pos
  def initialize(pos, rest, reason)
    super("SGF Parse error at #{pos} : #{reason} : >#{rest[0, 10]}...")
    @pos = pos
  end
end

class SgfReader
  EOF            = 0
  LeftParenthes  = 1
  RightParenthes = 2
  Semicolon      = 3
  UcWord         = 4
  BracketBlock   = 5

  class Token
    attr_reader :type, :data
    def initialize(type, data)
      @type = type
      @data = data
    end
  end

  def read_sgf(str)
    @rest  = str.rstrip
    @pos   = 0
    @cache = nil

    parse_error("empty data") if @rest.strip.blank?

    skip_spaces
    read_collection(SgfNode.new(nil))
  end

  def read_collection(parent_node)
    while read_game_tree(parent_node); end
    parent_node
  end

  def read_game_tree(parent_node)
    return if not read_token_by_type(LeftParenthes)

    nodes = read_node_sequence(parent_node)
    parse_error("empty nodes") if nodes.empty?

    read_collection(nodes[-1])

    consume_token(RightParenthes)
    true
  end

  def read_node_sequence(parent_node)
    nodes = []
    node = parent_node
    while (node = read_node(node))
      nodes << node
    end
    nodes
  end

  def read_node(parent_node)
    return if not read_token_by_type(Semicolon)

    node = SgfNode.new(parent_node)
    while (ident_token = read_token_by_type(UcWord))
      ident = ident_token.data
      blocks = []
      while (block_token = read_token_by_type(BracketBlock))
        blocks << block_token.data
      end
      node.set(ident, blocks)
    end
    parent_node.add_child(node)

    node
  end

  def read_token_by_type(type)
    token = next_token
  
    if token.type == type
      token
    else
      cache_token(token) if token.type != EOF
      nil
    end
  end

  def consume_token(type)
    token = next_token
    parse_error("unexpected token") if token.type != type
  end

  def cache_token(token)
    raise "internal error" if @cache
    @cache = token
  end

  def next_token
    if @cache
      ret = @cache
      @cache = nil
      return ret
    end

    skip_spaces

    return Token.new(EOF, true) if @rest.empty?

    case @rest[0]
    when '(' then
      next_pos(1)
      Token.new(LeftParenthes, true)
    when ')' then
      next_pos(1)
      Token.new(RightParenthes, true)
    when ';' then
      next_pos(1)
      Token.new(Semicolon, true)
    when '[' then
      p = 0
      loop do
        p = @rest.index("]", p + 1)
        parse_error("no right bracket") if p.nil?
        break if @rest[p - 1] != '\\' 
      end
      block = next_pos(p + 1)[1...-1].gsub(/\\\]/, "]")

      Token.new(BracketBlock, block)
    else
      i = @rest.index(/[^A-Z]/)
      parse_error("no ident") if i.nil? || i == 0

      ident = next_pos(i)
      Token.new(UcWord, ident)
    end
  end

  def skip_spaces
    (i = @rest.index(/[^\s]/)) && next_pos(i)
  end

  def next_pos(n)
    @pos += n
    return @rest.slice!(0, n)
  end

  def parse_error(reason)
    raise SgfParseError.new(@pos, @rest, reason)
  end
end

require 'date'
class SgfNodeFacade
  def initialize(root)
    @node = root
  end

  def player_black
    get_helper("PB")
  end

  def player_white
    get_helper("PW")
  end

  def title
    h = {}
    %w( PB BR PW WR RE ).each do |ident|
      h[ident.to_sym] = get_helper(ident)
    end

    return "" if h[:PB].blank? || h[:PW].blank?
 
    [[:PB, :BR], [:PW, :WR]].each do |player, rank|
      x = h[rank]
      h[player] += "(#{x})" unless x.blank?
    end

    h[:RE] = "[#{h[:RE]}]" unless h[:RE].blank?
    "#{h[:PB]} vs #{h[:PW]} #{h[:RE]}"
  end

  def date
    dt = get_helper("DT")

    if dt && dt =~ /(\d\d\d\d)\\?[-\/:](\d\d)\\?[-\/:](\d\d)/
      Date.parse("#{$1}/#{$2}/#{$3}")
    else
      nil
    end
  end

  def get_helper(ident)
    (c = @node.children[0]) && (x = c.get(ident)) && x[0]
  end

  def set_helper(ident, val)
    if (c = @node.children[0])
      c.set(ident, [val]) if not get_helper(ident)
    end
  end

  def to_sgf
    @node.to_sgf
  end
end
