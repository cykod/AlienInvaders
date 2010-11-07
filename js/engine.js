var Game = new function() {
  var KEY_CODES = { 37:'left', 39:'right', 32 :'fire' };
  this.keys = {};

  this.initialize = function(canvas_dom,level_data,sprite_data,callback,endCallback) {
    this.canvas_elem = $(canvas_dom)[0];
    this.canvas = this.canvas_elem.getContext('2d');
    this.width = $(this.canvas_elem).attr('width');
    this.height= $(this.canvas_elem).attr('height');

    $(window).keydown(function(event) {
      if(KEY_CODES[event.keyCode]) Game.keys[KEY_CODES[event.keyCode]] = true;
    });

    $(window).keyup(function(event) {
      if(KEY_CODES[event.keyCode]) Game.keys[KEY_CODES[event.keyCode]] = false;
    });

    this.level_data = level_data;
    this.endCallback = endCallback;
    Sprites.load(sprite_data,callback);
  }

  this.loadBoard = function(board) { Game.board = board; }

  this.loop = function() { 
    Game.board.step(30/1000); 
    Game.board.render(Game.canvas);
    setTimeout(Game.loop,30);
  }
};

var Sprites = new function() {
  this.map = { }; 

  this.load = function(sprite_data,callback) { 
    this.map = sprite_data;
    this.image = new Image();
    this.image.onload = callback;
    this.image.src = 'images/sprites.png';
  }

  this.draw = function(canvas,sprite,x,y,frame) {
    var s = this.map[sprite];
    if(!frame) frame = 0;
    canvas.drawImage(this.image, s.sx + frame * s.w, s.sy, s.w, s.h, x,y, s.w, s.h);
  }
}


var GameScreen = function GameScreen(text,text2,callback) {
  this.step = function(dt) {
    if(Game.keys['fire'] && callback) callback();
  }

  this.render = function(canvas) {
    canvas.clearRect(0,0,Game.width,Game.height);
    canvas.font = "bold 40px arial";
    var measure = canvas.measureText(text);  
    canvas.fillStyle = "#FFFFFF";
    canvas.fillText(text,Game.width/2 - measure.width/2,Game.height/2);
    canvas.font = "bold 20px arial";
    var measure2 = canvas.measureText(text2);
    canvas.fillText(text2,Game.width/2 - measure2.width/2,Game.height/2 + 40);
  }
}


var GameBoard = function GameBoard(level_number) {
  this.removed_objs = [];
  this.missles = 0;
  var board = this;

  this.loadLevel = function(level) {
    this.objects = [];
    this.player = this.addSprite('player', Game.width/2, Game.height - Sprites.map['player'].h - 10);
    var flock = this.add(new AlienFlock());
    for(var y=0,rows=level.length;y<rows;y++) {
      for(var x=0,cols=level[y].length;x<cols;x++) {
        var alien = Sprites.map['alien' + level[y][x]];
        if(alien) this.addSprite('alien' + level[y][x],(alien.w+10)*x, alien.h*y, { flock: flock });
      }
    }
  }

  this.iterate = function(func) {
     for(var i=0,len=this.objects.length;i<len;i++) {
       func.call(this.objects[i]);
     }
  }

  this.detect = function(func) {
    for(var i = 0,val=null, len=this.objects.length; i < len; i++) {
      if(func.call(this.objects[i])) return this.objects[i];
    }
    return false;
  }

  this.step = function(dt) { 
    this.removed_objs = [];
    this.iterate(function() { 
        if(!this.step(dt)) this.die();
    }); 

    for(var i=0,len=this.removed_objs.length;i<len;i++) {
      var idx = this.objects.indexOf(this.removed_objs[i]);
      if(idx != -1) this.objects.splice(idx,1);
    }
  };

  this.render = function(canvas) {
    canvas.clearRect(0,0,Game.width,Game.height);
    this.iterate(function() { this.draw(canvas); });
  }

  this.collision = function(o1,o2) {
    return !((o1.y+o1.h-1<o2.y) || (o1.y> o2.y+o2.h-1) || (o1.x+o1.w-1<o2.x) || (o1.x>o2.x+o2.w-1));
  };

  this.collide = function(obj) {
    return this.detect(function() {
      if(obj != this && !this.invulnrable)
       return board.collision(obj,this) ? this : false;
    });
  }

  this.add =    function(obj) { obj.board=this; this.objects.push(obj); return obj; }
  this.remove = function(obj) { this.removed_objs.push(obj); }

  this.addSprite = function(name,x,y,opts) {
    var sprite = this.add(new Sprites.map[name].cls(opts));
    sprite.x = x; sprite.y = y;
    sprite.w = Sprites.map[name].w; 
    sprite.h = Sprites.map[name].h;
    return sprite;
  }
 
  this.loadLevel(Game.level_data[level_number]);
}

