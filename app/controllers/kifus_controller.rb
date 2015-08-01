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
    @rank_list = [["1級", "1k"], ["初段", "1d"], ["二段", "2d"], ["三段", "3d"], ["四段", "4d"], ["五段", "5d"], ["六段", "6d"], ["七段", "7d"]]
    @komi_list = [["7目半", "7.5"], ["6目半", "6.5"], ["5目半", "5.5"], ["4目半", "4.5"], ["なし", "0"],
                  ["逆コミ4目半", "-4.5"], ["逆コミ5目半", "-5.5"], ["逆コミ6目半", "-6.5"], ["逆コミ7目半", "-7.5"]];
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

    @kifu = Kifu.new(title: title, room_id: room_id, key: SecureRandom.urlsafe_base64(64))
    #if not sgf?(sgfdata)
    #  redirect_to view_context.sec_room_path(@kifu.room)
    #  return
    #end
    @kifu.sgfdata = sgfdata

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

    def sgf?(sgfdata)
      v = SgfValidator.new
      v.sgf?(sgfdata)
    end

    class SgfValidator
      def initialize
      end

      def sgf?(sgfdata)
        begin
          start_parse(sgfdata)
        rescue => e
          return false
        end
        return true
      end

      def start_parse(str)
        @rest = str.gsub(/\s+\z/, "")
        read_collection(rest)
      end

      def read_collection
        while read_game_tree
        end
      end

      def read_game_tree
        return if @rest[0] != "("
        n = read_nodes

        raise "error" if !n

        read_collection
        consume(")")
      end

      def read_nodes
      end

      def consume(s)
        if @rest.start_with?(s)
          @rest = @rest[s.length .. -1]
          return
        end
        raise "error"
      end
    end
end
