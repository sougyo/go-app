class AddRoomIdToKifus < ActiveRecord::Migration
  def change
    add_column :kifus, :room_id, :integer
  end
end
