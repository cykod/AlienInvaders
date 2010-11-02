var Util = {
  clamp: function(v,min,max) { v > min ? ( v < max ? v : max ) : min }
};


var Game = new function() {
  var canvas,canvasElem;
  var KEY_CODES = { 37:'left', 39:'right', 32 :'fire' };
 
  this.keys = {};


  this.initialize = function(canvas_dom,callback) {
    canvas_elem = $(canvas_dom)[0];
    canvas = canvas_elem.getContext('2d');

    this.width = $(canvas_elem).attr('width');
    this.height= $(canvas_elem).attr('height');

    $(window).keydown(function(event) {
      if(KEY_CODES[event.keyCode]) Game.keys[KEY_CODES[event.keyCode]] = true;
    });

    $(window).keyup(function(event) {
      if(KEY_CODES[event.keyCode]) Game.keys[KEY_CODES[event.keyCode]] = false;
    });

    this.board = new GameBoard(canvas);
    Sprites.load(callback);
  }

  this.play = function(level) {
    Game.board.loadLevel(level);
    setTimeout(Game.loop,30);
  }

  this.loop = function() { 
    Game.board.step(30/1000); 
    Game.board.render();
    setTimeout(Game.loop,30);
  }

};

var Sprites = new function() {
  this.map = { 'alien0': { sx: 0,  sy: 0,  w: 23, h: 18 },
               'alien1': { sx: 23, sy: 0,  w: 23, h: 18 },
               'player': { sx: 0,  sy: 18 ,w: 26, h: 17 },
               'missle': { sx: 0,  sy: 68, w: 2,  h: 17 } };

  this.load = function(callback) { 
    this.image = new Image();
    this.image.onload = callback;
    this.image.src = 'images/sprites.png';
  }

  this.draw = function(canvas,sprite,x,y) {
    var s = this.map[sprite];
    canvas.drawImage(this.image, s.sx, s.sy, s.w, s.h, x,y, s.w, s.h);
  }
}


var GameBoard = function(canvas) {
  this.objects = [];
  this.removed_objs = [];
  this.missles = 0;


  this.loadLevel = function(level) {
    this.objects = [];
    var flock = this.add(new AlienFlock());
    for(var y=0,rows=level.length;y<rows;y++) {
      for(var x=0,cols=level[y].length;x<cols;x++) {
        if(level[y][x]) this.add(new Alien((Sprites.map['alien0'].w+10)*x, Sprites.map['alien0'].h*y, flock));
      }
    }

    this.player = this.add(new Player(Game.width/2, Game.height - Sprites.map['player'].h - 10));
  }

  this.add =    function(obj) { obj.board=this; this.objects.push(obj); return obj; }
  this.remove = function(obj) { this.removed_objs.push(obj); }

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
    var board = this;
    this.iterate(function() { if(!this.step(dt)) board.removed_objs.push(this); }); 
    for(var i=0,len=this.removed_objs.length;i<len;i++) {
      var idx = this.objects.indexOf(this.removed_objs[i]);
      this.removed_objs[i].board = null;
      if(idx != -1) this.objects.splice(idx,1);
    }
  };

  this.render = function() {
    canvas.clearRect(0,0,Game.width,Game.height);
    this.iterate(function() { this.draw(canvas); });
  }

  this.collision = function(o1,o2) {
    return !((o1.y<o2.y-o2.h) || (o1.y> o2.y+o2.h) || (o1.x<o2.x-o2.w) || (o1.x>o2.x+o2.w));
  };

  this.collide = function(obj) {
    var board = this;
    return this.detect(function() {
      if(obj != this && !this.invulnrable)
       return board.collision(obj,this) ? this : false;
    });
  }

  this.addSprite = function(name,x,y,cls,opts) {
    var sprite = new cls(opts);
    sprite.x = x; sprite.y = y;
    sprite.w = Sprites.map[name].w;
    sprite.w = Sprites.map[name].h;
    return sprite;
  }
 
}

var AlienFlock = function() {
  this.invulnrable = true;
  this.dx = 10; this.dy = 0;
  this.hit = 1;
  this.lastHit = false;
  this.speed = 10;

  this.draw = function() {};
  this.step = function(dt) { 
    if(this.hit && this.hit != this.lastHit) {
      this.lastHit = this.hit;
      this.dy = this.speed;
    } else {
      this.dy=0;
    }
    this.dx = this.speed * this.hit;

    var max = {};
    this.board.iterate(function() {
      if(this instanceof Alien) { if(!max[this.x] || this.y > max[this.x]) max[this.x] = this.y; }

    });
    this.max_y = max;
    return true;
  };

}

var Alien = function(opts) {
  this.flock = opts['flock';
  this.frame = 0;
  this.mx = 0;
}

Alien.prototype.draw = function(canvas) {
  Sprites.draw(canvas,'alien'+this.frame,this.x,this.y);
}

Alien.prototype.die = function() {
  this.flock.speed += 1;
  this.board.remove(this);
}


Alien.prototype.step = function(dt) {
  this.mx += dt * this.flock.dx;
  this.y += this.flock.dy;
  if(Math.abs(this.mx) > 10) {
    if(this.y == this.flock.max_y[this.x]) {
      if(Math.random()*100 < 10) {
        this.board.add(new Missle(this.x + this.w/2 - Sprites.map.missle.w/2,
        this.y+this.h,
        100));

      }
    }


    this.x += this.mx;
    this.mx = 0;
    this.frame = (this.frame+1) % 2;
    if(this.x > 450) this.flock.hit = -1;
    if(this.x < 10) this.flock.hit = 1;

    
  }
   return true;
}

var Player = function(opts) { 
  this.reloading = 0;
}

Player.prototype.draw = function(canvas) {
   Sprites.draw(canvas,'player',this.x,this.y);

}

Player.prototype.step = function(dt) {
  if(Game.keys['left']) { this.x -= 100 * dt; }
  if(Game.keys['right']) { this.x += 100 * dt; }

  if(this.x < 10) this.x = 10;
  if(this.x > 470) this.x = 470;

  this.reloading--;

  if(Game.keys['fire'] && this.reloading <= 0 && GameBoard.missles < 3) {
    this.board.add(new Missle(this.x + this.w/2 - Sprites.map.missle.w/2,
                             this.y-this.h,
                             -100));
    this.reloading = 10;
  }
  return true;
}


var Missle = function(opts) {
   this.dy = opts.dy;
   if(this.dy < 0) GameBoard.missles++;
}


Missle.prototype.draw = function(canvas) {
   Sprites.draw(canvas,'missle',this.x,this.y);
}

Missle.prototype.step = function(dt) {
   this.y += this.dy * dt;

   var enemy = this.board.collide(this);
   if(enemy) { 
     enemy.die();
     if(this.dy < 0) GameBoard.missles--;
     return false;
   }
   if(this.y < 0) {
     if(this.dy < 0) GameBoard.missles--;
   }
   return this.y < 0 ? false : true;
}

Missle.prototype.die = function() {
   this.board.remove(this);
}
