
var AlienFlock = function AlienFlock() {
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

    var max = {}, cnt = 0;
    this.board.iterate(function() {
      if(this instanceof Alien)  {
        if(!max[this.x] || this.y > max[this.x]) max[this.x] = this.y; 
        cnt++;
      } 
    });
    if(cnt == 0) { Game.loadBoard(new GameBoard(Game.board.level+1)); }
    this.max_y = max;
    return true;
  };

}

var Alien = function Alien(opts) {
  this.flock = opts['flock'];
  this.frame = 0;
  this.mx = 0;
}

Alien.prototype.draw = function(canvas) {
  Sprites.draw(canvas,this.name,this.x,this.y,this.frame);
}

Alien.prototype.die = function() {
  GameAudio.play('die');
  this.flock.speed += 1;
  this.board.remove(this);
}

Alien.prototype.step = function(dt) {
  this.mx += dt * this.flock.dx;
  this.y += this.flock.dy;
  if(Math.abs(this.mx) > 10) {
    if(this.y == this.flock.max_y[this.x]) {
      this.fireSometimes();
    }
    this.x += this.mx;
    this.mx = 0;
    this.frame = (this.frame+1) % 2;
    if(this.x > 450) this.flock.hit = -1;
    if(this.x < 10) this.flock.hit = 1;
  }
  return true;
}

Alien.prototype.fireSometimes = function() {
      if(Math.random()*100 < 10) {
        this.board.addSprite('missle',this.x + this.w/2 - Sprites.map.missle.w/2,
                                      this.y + this.h, 
                                     { dy: 100 });
      }
}

var Player = function Player(opts) { 
  this.reloading = 0;
}

Player.prototype.draw = function(canvas) {
   Sprites.draw(canvas,'player',this.x,this.y);
}

Player.prototype.step = function(dt) {
  if(Game.keys['left']) { this.x -= 100 * dt; }
  if(Game.keys['right']) { this.x += 100 * dt; }

  if(this.x < 0) this.x = 0;
  if(this.x > Game.width-this.w) this.x = Game.width-this.w;

  this.reloading--;

  if(Game.keys['fire'] && this.reloading <= 0 && this.board.missles < 3) {
    GameAudio.play('fire');
    this.board.addSprite('missle',
                          this.x + this.w/2 - Sprites.map.missle.w/2,
                          this.y-this.h,
                          { dy: -100, player: true });
    this.board.missles++;
    this.reloading = 10;
  }
  return true;
}

Player.prototype.die = function() {
  GameAudio.play('die');
  Game.endCallback();
}

var Missle = function Missle(opts) {
   this.dy = opts.dy;
   this.player = opts.player;
}

Missle.prototype.draw = function(canvas) {
   Sprites.draw(canvas,'missle',this.x,this.y);
}

Missle.prototype.step = function(dt) {
   this.y += this.dy * dt;

   var enemy = this.board.collide(this);
   if(enemy) { 
     enemy.die();
     return false;
   }
   return (this.y < 0 || this.y > Game.height) ? false : true;
}

Missle.prototype.die = function() {
  if(this.player) this.board.missles--;
  if(this.board.missles < 0) this.board.missles=0;
   this.board.remove(this);
}
