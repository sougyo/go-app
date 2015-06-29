module RoomsHelper
  def sec_room_path(room)
    rooms_path + "/#{room.id}?#{URI.encode_www_form(rtok: room.key)}"
  end
end
