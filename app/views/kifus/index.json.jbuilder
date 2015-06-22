json.array!(@kifus) do |kifu|
  json.extract! kifu, :id, :title, :sgfdata
  json.url kifu_url(kifu, format: :json)
end
