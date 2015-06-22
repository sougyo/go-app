class CreateKifus < ActiveRecord::Migration
  def change
    create_table :kifus do |t|
      t.string :title
      t.text :sgfdata

      t.timestamps
    end
  end
end
