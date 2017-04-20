class AddInfoToKifus < ActiveRecord::Migration
  def change
    add_column :kifus, :player_black, :string
    add_column :kifus, :player_white, :string
    add_column :kifus, :play_date, :date
  end
end
