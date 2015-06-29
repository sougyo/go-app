module KifusHelper
  def sec_kifu_path(kifu)
    kifus_path + "/#{kifu.id}?#{URI.encode_www_form(ktok: kifu.key)}"
  end

  def sec_new_kifu_path(room)
    new_kifu_path + "/#{room.id}?#{URI.encode_www_form({rtok: room.key})}"
  end
end
