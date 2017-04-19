require 'sgf_reader.rb'

class Kifu < ActiveRecord::Base
  belongs_to :room

  def sgf_node
    @node ||= SgfReader.new.read_sgf(sgfdata)
  end

  def sgf_node_facade
    @facade ||= SgfNodeFacade.new(sgf_node)
  end
end
