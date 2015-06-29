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

    @kifu = Kifu.new(title: title, sgfdata: sgfdata, room_id: room_id, key: SecureRandom.urlsafe_base64(64))
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
end
