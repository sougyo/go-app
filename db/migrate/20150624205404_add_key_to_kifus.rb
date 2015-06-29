class AddKeyToKifus < ActiveRecord::Migration
  def change
    add_column :kifus, :key, :string
  end
end
