require 'kconv'

class KifusController < ApplicationController
  before_action :set_kifu, only: [:show, :edit, :update, :destroy]
  before_action :auth, only: [:show, :update, :destroy]

  # GET /kifus
  # GET /kifus.json
  def index
    @kifus = []
  end

  # GET /kifus/1
  # GET /kifus/1.json
  def show
    @rank_list = [
      ["プロ九段", "9p"],
      ["九段", "9d"],
      ["八段", "8d"],
      ["七段", "7d"],
      ["六段", "6d"],
      ["五段", "5d"],
      ["四段", "4d"],
      ["三段", "3d"],
      ["二段", "2d"],
      ["初段", "1d"]
    ]

    (1..25).each do |i|
      @rank_list << ["#{i}級", "#{i}k"]
    end

    @komi_list = [
      ["7目半"      , "7.5" ],
      ["6目半"      , "6.5" ],
      ["5目半"      , "5.5" ],
      ["4目半"      , "4.5" ],
      ["なし"       , "0"   ],
      ["逆コミ4目半", "-4.5"],
      ["逆コミ5目半", "-5.5"],
      ["逆コミ6目半", "-6.5"],
      ["逆コミ7目半", "-7.5"]
    ]
    @viewport = 560

  end

  # GET /kifus/new
  def new
    room_id = params[:rid]
    room_key = params[:rtok]
    @room = Room.find_by_id(room_id.to_i) if room_id

    raise "Access Denied" unless @room && room_key && @room.key == room_key
  end

  # GET /kifus/1/edit
  def edit
    @rtok = params[:rtok]
    @rid  = params[:rid]
  end

  # POST /kifus
  # POST /kifus.json
  def create
    title = params[:title]
    room_key = params[:rtok]
    room_id = params[:rid]
    room = Room.find_by_id(room_id.to_i) if room_id

    raise "Access Denied" unless room && room_key && room.key == room_key

    sgfdata = params[:sgffile] ? params[:sgffile].read :
                CGI.unescapeHTML(params[:sgfdata])
    code_name = {
        Kconv::EUC  => Encoding::EUC_JP,
        Kconv::SJIS => Encoding::Shift_JIS,
        Kconv::UTF8 => Encoding::UTF_8
    }
    sgfdata.encode!("UTF-8", code_name[Kconv.guess(sgfdata)], invalid: :replace, undef: :replace, replace: "?")

    @kifu = Kifu.new(title: title, room_id: room_id, key: SecureRandom.urlsafe_base64(64), sgfdata: sgfdata)

    #node = @kifu.sgf_node
    facade = @kifu.sgf_node_facade
    #puts node.select("B").to_s

    respond_to do |format|
      if @kifu.save
        format.html { redirect_to view_context.sec_kifu_path(@kifu), notice: 'Kifu was successfully created.' }
        format.json { render :show, status: :created, location: @kifu }
      else
        format.html { render :new }
        format.json { render json: @kifu.errors, status: :unprocessable_entity }
      end
    end
  end

  # PATCH/PUT /kifus/1
  # PATCH/PUT /kifus/1.json
  def update
    facade = @kifu.sgf_node_facade
    puts "UPDATE=========================="
    puts facade.player_black
    puts facade.player_white
    puts facade.date

    respond_to do |format|
      if @kifu.update(kifu_params)
        format.html { redirect_to view_context.sec_kifu_path(@kifu), notice: 'Kifu was successfully updated.' }
        format.json { render :show, status: :ok, location: @kifu }
      else
        format.html { render :edit }
        format.json { render json: @kifu.errors, status: :unprocessable_entity }
      end
    end
  end

  # DELETE /kifus/1
  # DELETE /kifus/1.json
  def destroy
    room = @kifu.room
    @kifu.destroy
    respond_to do |format|
      format.html { redirect_to view_context.sec_room_path(room), notice: 'Kifu was successfully destroyed.' }
      format.json { head :no_content }
    end
  end

  private
    # Use callbacks to share common setup or constraints between actions.
    def set_kifu
      @kifu = Kifu.find(params[:id])
    end

    # Never trust parameters from the scary internet, only allow the white list through.
    def kifu_params
      params.require(:kifu).permit(:title, :sgfdata)
    end

    def auth
      id = params[:id]
      key = params[:ktok]
      kifu = Kifu.find_by_id(id.to_i) if id
      raise "Access Denied" unless kifu && key && kifu.key && kifu.key.length == key.length && kifu.key == key
    end

end
