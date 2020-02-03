document.addEventListener('DOMContentLoaded', function() {

    // Initialize canvas
    var canvas = document.querySelector('canvas');
    var ctx = canvas.getContext('2d');
    var canWidth = canvas.width;
    var canHeight = canvas.height;
    var canDiag = (canWidth + canHeight) / 2; // Diagonal length of canvas

    // Add game object names as constants
    var BG = null;
    var player = null;
    var walls = [];
    var checkpoint = null;

    // Create default game settings
    var TS = canHeight / 16 // Tile size
    var ShiftSettings = {
        player: {
            static: true,
            target: null,
            shiftHue: null,
            shiftAxis: null,
            reversed: false
        },
        BG: {
            static: true,
            target: null,
            shiftHue: null,
            shiftAxis: null,
            reversed: false
        }
    }

    // Add event flags
    var leftPressed = false;
    var rightPressed = false;
    var upPressed = false;
    var downPressed = false;

    // Add listeners for events
    document.addEventListener('keydown', keyDownHandler, false);
    document.addEventListener('keyup', keyUpHandler, false);

    // Define event handlers
    function keyDownHandler(event) {
        switch(event.key) {
            case 'ArrowRight' || 'right':
                rightPressed = true;
                break;
            case 'ArrowLeft' || 'left':
                leftPressed = true;
                break;
            case 'ArrowDown' || 'down':
                downPressed = true;
                break;
            case 'ArrowUp' || 'up':
                upPressed = true;
                break;
            default:
                break;
        }
    }

    function keyUpHandler(event) {
        switch(event.key) {
            case 'ArrowRight' || 'right':
                rightPressed = false;
                break;
            case 'ArrowLeft' || 'left':
                leftPressed = false;
                break;
            case 'ArrowDown' || 'down':
                downPressed = false;
                break;
            case 'ArrowUp' || 'up':
                upPressed = false;
                break;
            default:
                break;
        }
    }

    // Add object constructors

    // Background
    function Background(x, y, width, height, color) {
        this.x = x; this.y = y; 
        this.width = width; this.height = height;
        this.color = color;

        // Draw background image to given canvas context
        this.draw = function(surface) {
            surface.beginPath();
            surface.fillStyle = this.color;
            surface.fillRect(this.x, this.y, this.width, this.height);
        }
    }

    // Player
    // color arg must be rbga!
    function Player(x, y, width, height, speed, color) {
        this.x = x; this.y = y; 
        this.width = width; this.height = height;
        this.color = color;
        this.speed = speed;
        this.slideSpeed = 1; // speed during move assist


        // Draw background image to given canvas context
        this.draw = function(surface) {
            surface.beginPath();
            surface.fillStyle = this.color;
            surface.fillRect(this.x, this.y, this.width, this.height);
        }

        this.update = function() {
            // For strange reasons, collision seems to only work if
            // x/y coordinates are checked for collision independantly

            // Apply x velocity and check horizontal wall collisions
            this.x += (rightPressed - leftPressed) * speed;
            // Check wall collisions
            if (walls) {
                for (var w=0; w<walls.length; w++) {
                    var wall = walls[w];
                    if (this.x < wall.x + wall.width &&
                        this.x + this.width > wall.x &&
                        this.y < wall.y + wall.height &&
                        this.y + this.height > wall.y) {
                        if (rightPressed) {
                            this.x = wall.x - this.width;

                            // Crawl along wall if close enough to edge / touching corner of wall (move assist)
                            // Make sure that RIGHT is the only key being pressed
                            if (this.y < wall.y && !upPressed &&
                                !upPressed && !downPressed) {
                                this.y -= this.slideSpeed;
                            } else if ( this.y + this.height > wall.y + wall.height
                                        && !downPressed) {
                                this.y += this.slideSpeed;
                            }
                        } else if (leftPressed) {
                            this.x = wall.x + wall.width;

                            if (this.y < wall.y && !rightPressed &&
                                !upPressed && !downPressed) {
                                this.y -= this.slideSpeed;
                            } else if ( this.y + this.height > wall.y + wall.height
                                        && !downPressed) {
                                this.y += this.slideSpeed;
                            }
                        }
                    }
                }
            }

            // Apply y velocity and check vertical collisions
            // Only seems to work if collision is checked again
            this.y += (downPressed - upPressed) * speed;
            if (walls) {
                for (var w=0; w<walls.length; w++) {
                    var wall = walls[w];
                    if (this.x < wall.x + wall.width &&
                        this.x + this.width > wall.x &&
                        this.y < wall.y + wall.height &&
                        this.y + this.height > wall.y) {
                        if (downPressed) {
                            this.y = wall.y - this.height;
                            // check for move assist when pushing down on CORNER of wall
                            // make sure DOWN is the only key being pressed
                            if (this.x < wall.x && !upPressed &&
                                !leftPressed && !rightPressed) {
                                this.x -= this.slideSpeed;
                            } else if (this.x+this.width > wall.x+wall.width) {
                                this.x += this.slideSpeed;
                            }
                        } else if (upPressed) {
                            this.y = wall.y + wall.height;
                            // check for move assist when pushing up
                            if (this.x < wall.x && !downPressed &&
                                !leftPressed && !rightPressed) {
                                this.x -= this.slideSpeed;
                            } else if (this.x+this.width > wall.x+wall.width) {
                                this.x += this.slideSpeed;
                            }
                        }
                    }
                }
            }

            // Stop at screen bounds
            if (this.x < 0) {
                this.x = 0
            } else if (this.x > canWidth-this.width) {
                this.x = canWidth - this.width;
            }
            if (this.y < 0) {
                this.y = 0;
            } else if (this.y > canHeight-this.height) {
                this.y = canHeight - this.height;
            }
        }
    }

    // Shifter object changes properties of an object (ex: color) based on
    // properties of another subject (ex: position)
    // ALL COLORS USED HERE MUST BE RGBA FORMAT W/OUT SPACES
    const Shifter = {

        // breakClrString() returns obj w/ isolated values from RGBA string
        breakClrString: function(clrString) {
            var ClrProps = {r:0, g:0, b:0, a:0};
            // Remove unnecessary characters and split numbers into array
            var tempString = clrString.replace('rgba(', '');
            tempString = tempString.replace(')', '');
            tempString = tempString.split(',');

            // Convert characters to numbers and assign
            ClrProps.r = Number(tempString[0]);
            ClrProps.g = Number(tempString[1]);
            ClrProps.b = Number(tempString[2]);
            ClrProps.a = Number(tempString[3]);

            return ClrProps;
        },

        // makeClrString() returns string a useable string version of
        // object of rgba properties (made in breakClrString()) 
        makeClrString: function(clrProps) {
            var clrString = 'rgba(' + clrProps.r + ',' + clrProps.g + 
                ',' + clrProps.b + ',' + clrProps.a + ')';
            
            return clrString;
        },

        /*  
        objToClr() changes the color values of a given subject based on the position 
        of a given object, in the range of the canvas size 

        Subject AND object MUST have:
         - x/y, and color properties
         - color MUST be rgba format with NO SPACES

        'axis' args:
         - 'x': horizontal
         - 'y': vertical
         - 'xy': diagonal (topleft to bottomright)

        'hue' args include 'r', 'g', 'b', 'a', 'all'
        NOTE: 'all' only affects rgb, NOT transparency

        'reversed' arg (optional) starts the effect slider at the other end of the arena,
        ex: hue='r', axis='x', reversed=false -> moving from left to right increases hue, starting at min
            reversed=true -> moving from left to right decreases hue, starting at at max
        */
        posToClr: function(subject, object, axis, hue, reversed) {
            // Separate subject and object color values
            var subClrProps = this.breakClrString(subject.color);
            var objClrProps = this.breakClrString(object.color);

            // Get new color value based on object position and axis
            var value = 0;
            switch(axis) {
                case 'x': 
                    // If reversed, the given hue brightness is affected inversly
                    if(reversed) {
                        value = 255 - (255*(subject.x/canWidth));
                    } else {
                        value = 255 * (subject.x/canWidth);
                    }
                    break;
                
                case 'y':
                    if(reversed) {
                        value = 255 - (255*(subject.y/canHeight));
                    } else {
                        value = 255 * (subject.y/canHeight);
                    }
                    break;
                
                case 'xy':
                    if(reversed) {
                        value = 255 - (255*((subject.x+subject.y)/2) 
                            / canDiag);
                    } else {
                        value = 255 * ((subject.x+subject.y)/2) / canDiag;
                    }
                    break;
                
                default: value = 0; 
                    break;
            }
            // Apply value to specified color property
            switch(hue) {
                case 'all':
                    objClrProps.r = objClrProps.g = objClrProps.b = value;
                    break;
                case 'r': objClrProps.r = value; break;
                case 'g': objClrProps.g = value; break;
                case 'b': objClrProps.b = value; break;
                case 'a': objClrProps.a = value; break;
                default: break;
            }
            // Reset object's Color.string property
            object.color = this.makeClrString(objClrProps);
        }
    }

    // initObjs() resets main game objects to default versions
    function initObjs() {
        // Default tile size
        TS = canHeight/16;
        // Default background
        BG = new Background(0, 0, canWidth, canHeight, 'rgba(255,255,255,1');

        // Make sure player size is slightly smaller than tile size!!
        // This is in order to fit between gaps
        // 3.5 is fastest w/out skipping over gaps w/ current size+speed
        player = new Player(TS, TS, TS*0.94, TS*0.94, 3.5, 'rgba(240,0,0,1)');    
        // Empty walls
        walls = [];
    }

    // Define main game loop to update and draw game elements
    function mainLoop() {
        var Settings = ShiftSettings;
        // Clear canvas
        ctx.clearRect(0, 0, canWidth, canHeight);

        // Draw background
        if(BG) {
            // Apply color shift effect if specified in ShiftSettings
            if(!Settings.BG.static) {
                // wrap first arg in eval() to convert from string in settings
                Shifter.posToClr(eval(Settings.BG.target), BG, 
                    Settings.BG.shiftAxis, Settings.BG.shiftHue, Settings.BG.reversed);
            }
            BG.draw(ctx);
        }

        // Draw walls
        for(var i=0; i<walls.length; i++) {
            walls[i].draw(ctx);
        }

        // Draw/update player
        if(player) {
            // Apply shift effect
            if(!Settings.player.static) {
                Shifter.posToClr(eval(Settings.player.target), player, 
                    Settings.player.shiftAxis, Settings.player.shiftHue, 
                    Settings.player.reversed);
            }
            player.update();
            player.draw(ctx);
        }
    }

    // Initialize game objects + game loop and set loop 10 millesecond intervals
    initObjs();

    /*
    static: true,
    target: null,
    shiftHue: null,
    shiftAxis: null,
    reversed: false
    */
   
    setInterval(mainLoop, 10);

});