/*  Formulas to remember:

    Getting RGB (0 - 255) color value based on position

    Width / height:
        * Be sure to use arena height with y position, respectively
        * The arena being used need not be the screen. 
          Different effects can be added to smaller, sub-areas

        value = 255 * (position x / arena width)

    Diagonal:
        * Mainly done from the topleft to bottomright of screen (and vice-versa)

        value = 255 * ((x + y) / 2)
    
    Getting RGB color value based on index of symbol in an array
     (mainly used when parsing level from JSON file to determine brightness)

        value = array index of icon * (tile size / (arena width / 255))


    To get the opposite effect of ANY of these formulas, 
     subtract the result of the above formula from 255:

        value = 255 - (255*(position x / arena width))
*/

document.addEventListener('DOMContentLoaded', function() {
    const header = document.querySelector('h1');
    const canvas = document.querySelector('canvas');
    const ctx = canvas.getContext('2d');
    var canWidth = canvas.width; // = window.outerWidth;
    var canHeight = canvas.height; // = window.outerHeight;
    // get diagonal width of canvas
    var canDiag = (canWidth + canHeight) / 2;
    // set tile size
    var TS = canHeight / 16;

    // EVENT HANDLING

    var leftPressed = false;
    var rightPressed = false;
    var upPressed = false;
    var downPressed = false;

    document.addEventListener('keydown', keyDownHandler, false);
    document.addEventListener('keyup', keyUpHandler, false);

    // Uncomment to use move player with mouse (negates wall collision)

    /*
    onmousemove = function() {
        player.x = event.clientX;
        player.y = event.clientY;
    }
    */

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

    /* Shifter object changes properties of an object (ex: color) based on
        properties of another subject (ex: position)
    */

    const Shifter = {
        
        /*  
          shiftObjClr() changes the color values of a given subject
        based on the position of a given object, in the range of the canvas size 
        (might change later w/ 'space' arg for smaller self contained areas of effect)

        Subject AND object MUST have:
         - x/y, properties
         - A Color object with r/g/b/a/string properties
         - setClrString() method

        arena must be an object with x/y/width/height
         - can be set to limit the range in which a shift effect will be valid (limitEffectToArena)
         - can be set to resize the min/max range of an effect (setRangeToArena)

        axis args:
         - 'x': horizontal
         - 'y': vertical
         - 'xy': diagonal

        hue args include 'r', 'g', 'b', 'a', 'all'
        NOTE: 'all' only affects rgb, NOT transparency

        Optional args:

          reversed arg starts the effect slider at the other end of the arena,
        ex:    hue='r', axis='x', reversed=false -> moving from left to right increases hue, starting at min
                reversed=true -> moving from left to right decreases hue, starting at at max
        */

        posToClr: function(subject, object, arena, axis, hue, reversed) {
            // Get new color value based on object position and axis
            var value;
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
                        value = 255 * ((subject.x+subject.y)/2)
                            / canDiag;
                    }
                    break;
                
                default: value = 0; 
                    break;
            }
            // Apply color change to target
            switch(hue) {
                case 'all':
                    object.Color.r = object.Color.g = object.Color.b = value;
                    break;
                case 'r': object.Color.r = value; break;
                case 'g': object.Color.g = value; break;
                case 'b': object.Color.b = value; break;
                case 'a': object.Color.a = value; break;
                default: break;
            }
            // Reset object's Color.string property
            object.setClrString();
        }
    }

    // OBJECT CONSTRUCTORS

    // color MUST be RGBA() string with NO SPACES
    function Background(x, y, width, height, color, shiftType) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.Color = {r:0, g:0, b:0, a:0, string:color}
        this.shiftType = shiftType;

        // breakClrString() returns the isolated values from RGBA string
        this.breakClrString = function() {
            var tempString = this.Color.string.replace('rgba(', '');
            tempString = tempString.replace(')', '');
            tempString = tempString.split(',');
            this.Color.r = Number(tempString[0]);
            this.Color.g = Number(tempString[1]);
            this.Color.b = Number(tempString[2]);
            this.Color.a = Number(tempString[3]);
        }
        // apply at the start to initialize hue properties
        this.breakClrString();

        // setClrString() assigns usable string from individual hue values
        //  mainly used after values have been changed
        this.setClrString = function() {
            var clrString = 'rgba(' + this.Color.r + ',' + this.Color.g + 
                ',' + this.Color.b + ',' + this.Color.a + ')';
            this.Color.string = clrString;
        }
        
        // draw background image to given canvas context
        this.draw = function(surface) {
            surface.beginPath();
            surface.fillStyle = this.Color.string;
            surface.fillRect(this.x, this.y, this.width, this.height);
        }
    }

    function Player(x, y, width, height, speed, color) {
        this.x = x; 
        this.y = y; 
        this.width = width; this.height = height;

        this.speed = speed;
        this.slideSpeed = 1; // speed during move assist

        // color must be rbga!
        this.Color = {r:0, g:0, b:0, a:0, string:color};

        // breakClrString() returns the isolated values from RGBA string
        this.breakClrString = function() {
            var tempString = this.Color.string.replace('rgba(', '');
            tempString = tempString.replace(')', '');
            tempString = tempString.split(',');
            this.Color.r = Number(tempString[0]);
            this.Color.g = Number(tempString[1]);
            this.Color.b = Number(tempString[2]);
            this.Color.a = Number(tempString[3]);
        }
        // Apply at the start to initialize hue properties
        this.breakClrString();

        // setClrString() assigns usable string from individual hue values
        //  mainly used after values have been changed
        this.setClrString = function() {
            var clrString = 'rgba(' + this.Color.r + ',' + this.Color.g + 
                ',' + this.Color.b + ',' + this.Color.a + ')';
            this.Color.string = clrString;
        }

        // Draw background image to given canvas context
        this.draw = function(surface) {
            surface.beginPath();
            surface.fillStyle = this.Color.string;
            surface.fillRect(this.x, this.y, this.width, this.height);
        }

        this.update = function() {
            // For strange reasons, collision seems to only work if
            //    x/y coordinates are checked for collision independantly

            // Apply x velocity and check horizontal collisions
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
            // *only seems to work if collision is checked again
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

    // Endblock triggers level transition
    function EndBlock(x, y, width, height, active, shiftType) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.active = active;

        this.shiftType = shiftType;

        // endBlock's color is constant
        this.color = 'rgba(0,0,255,1)';

        // Draw background image to given canvas context
        this.draw = function(surface) {
            surface.beginPath();
            surface.fillStyle = this.color;
            surface.fillRect(this.x, this.y, this.width, this.height);
        }

        // Check for player collision
        // Trigger object must have x/y/width/height properties
        this.update = function(triggerObj=null) {
            if(triggerObj) {
                if (this.active && this.x < triggerObj.x + triggerObj.width &&
                    this.x + this.width > triggerObj.x &&
                    this.y < triggerObj.y + triggerObj.height &&
                    this.y + this.height > triggerObj.y) {
                    levelNum++;
                    setLevel(levelNum);

                    // Set active to false so level transition only happens once
                    this.active = false;
                }
            }
        }
    }

    function Wall(x, y, width, height, color, shiftType) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.Color = {r:0, g:0, b:0, a:0, string:color}
        this.shiftType = shiftType;

        // breakClrString() returns the isolated values from RGBA string
        this.breakClrString = function() {
            var tempString = this.Color.string.replace('rgba(', '');
            tempString = tempString.replace(')', '');
            tempString = tempString.split(',');
            this.Color.r = Number(tempString[0]);
            this.Color.g = Number(tempString[1]);
            this.Color.b = Number(tempString[2]);
            this.Color.a = Number(tempString[3]);
        }
        // apply at the start to initialize hue properties
        this.breakClrString();

        // setClrString() assigns usable string from individual hue values
        //  mainly used after values have been changed
        this.setClrString = function() {
            var clrString = 'rgba(' + this.Color.r + ',' + this.Color.g + 
                ',' + this.Color.b + ',' + this.Color.a + ')';
            this.Color.string = clrString;
        }
        
        // draw background image to given canvas context
        this.draw = function(surface) {
            surface.beginPath();
            surface.fillStyle = this.Color.string;
            surface.fillRect(this.x, this.y, this.width, this.height);
        }
    }


    // LEVEL PARSING
    // parseLevel() reads local JSON files, creating instances of game elements
    function parseLevel(fileName) {
        // Reset default essential elements and properties
        TS = canWidth / 16;
        // IMPORTANT: make player slightly smaller in order to fit between gaps
        player = new Player(TS, TS, TS*0.95, TS*0.95, 3.5, 'rgba(240,0,0,1)');
        walls = [];
        backgrounds = [];
        BG1 = new Background(0, 0, canWidth, canHeight, 'rbga(200,200,200,1)');
        backgrounds.push(BG1);

        shiftTarget = player;

        const Icons = {
            'empty': '.',
            'player': '@',
            'endBlock': '#',

            // Icons for dynamic walls, and dynamic walls w/ 'reversed' effect applied
            'dynamic': {
                'monoX': 'x', 'revMonoX': 'X',
                'monoY': 'y', 'revMonoY': 'Y',
                'monoXY': 'z', 'revMonoXY': 'Z'
            },

            // Levels of any given gradient, to be multiplied by tile size
            // Limited to a range of 36
            'gradient': [
                '0','1','2','3','4','5','6','7','8','9',
                'a','b','c','d','e','f','g','h','i','j',
                'k','l','m','n','o','p','q','r','s','t',
                'u','v','x','y','z'
            ]
        }

        // Load level data

        // Create new XHR request
        var request = new XMLHttpRequest();
        var url = fileName;
        request.open('GET', url);
        request.responseType = 'json';
        
        // Request response
        request.onload = function() {
            var levelData = request.response;

            // Get new tile size
            // Note: canvas is always set at constant ratio
            TS = canWidth / levelData.tileSize;

            shiftTarget = eval(levelData.shiftTarget); // Remember to use eval!
            BGShiftType = levelData.BGData.shiftType;

            // Get player data
            var playerData = levelData.playerData;

            // Apply shift settings
            player.shiftType = playerData.shiftType;
            player.shiftTarget = playerData.shiftTarget;

            // Loop through columns and rows in text array to get position
            for (var r=0; r<playerData.position.length; r++) {
                for (var c=0; c<playerData.position[r].length; c++) {

                    // Check for matching icon
                    if (playerData.position[r][c] === Icons.player) {
                        player.x = TS*c;
                        player.y = TS*r;
                    }
                }
            }

            // Get endBlock data
            var endBlockData = levelData.endBlockData;

            // Get position
            for (var r=0; r<endBlockData.position.length; r++) {
                for (var c=0; c<endBlockData.position[r].length; c++) {

                    // Check for matching icon
                    if (endBlockData.position[r][c] === Icons.endBlock) {
                        endBlock.x = TS*c;
                        endBlock.y = TS*r;
                    }
                }
            }

            // Reset endBlock so that it is now active
            endBlock.active = true;

            // Get background data
            var BGData = levelData.BGData;
            
            // Apply shift settings
            BG1.shiftType = BGData.shiftType;
            BG1.shiftTarget = BGData.shiftTarget;

            // Get wall data

            // Static, black and white walls
            var monoWallData = levelData.wallData.staticMono;

            // Loop through columns and rows
            for (var r=0; r<monoWallData.length; r++) {
                for (var c=0; c<monoWallData[r].length; c++) {

                    // Check for matching icons (any icon in the 'gradient' property of 'Icon' obj)
                    var icon = monoWallData[r][c]
                    for (var i=0; i<Icons.gradient.length; i++) {

                        // Calculate color value based on index of icon in array
                        var clrValue = 0;
                        if (Icons.gradient[i] === icon) {
                            // Convert RGBA color range to be used based on width of canvas,
                            //  and the current tile size
                            clrValue = (TS / (canWidth/255)) * i; // VERY IMPORTANT FORMULA

                            walls.push(new Wall(TS*c, TS*r, TS, TS,  
                                'rgba('+clrValue+','+clrValue+','+clrValue+',1)', null));
                        }
                    }
                }
            }

            // Dynamic BW walls

            var dynamicData = levelData.wallData.dynamicMono;

            // Apply shift settings
            wallShiftTarget = levelData.walls.shiftTarget;

            for (var r=0; r<dynamicData.length; r++) {
                for (var c=0; c<dynamicData[r].length; c++) {

                    // Check icons in 'dynamic' obj and assign starting wall color
                    //  & shiftType of wall
                    var icon = dynamicData[r][c]
                    switch(icon) {
                        case Icons.dynamic.monoX:
                            walls.push(new Wall(TS*c, TS*r, TS, TS, 'rgba(0,0,0,1)', 'monoX'));
                            break;
                        case Icons.dynamic.revMonoX:
                            walls.push(new Wall(TS*c, TS*r, TS, TS, 'rgba(0,0,0,1)', 'revMonoX'));
                            break;
                        case Icons.dynamic.monoY:
                            walls.push(new Wall(TS*c, TS*r, TS, TS, 'rgba(0,0,0,1)', 'monoY'));
                            break;
                        case Icons.dynamic.revMonoY:
                            walls.push(new Wall(TS*c, TS*r, TS, TS, 'rgba(0,0,0,1)', 'revMonoY'));
                            break;
                        case Icons.dynamic.monoXY:
                            walls.push(new Wall(TS*c, TS*r, TS, TS, 'rgba(0,0,0,1)', 'monoXY'));
                            break;
                        case Icons.dynamic.revMonoXY:
                            walls.push(new Wall(TS*c, TS*r, TS, TS, 'rgba(0,0,0,1)', 'revMonoXY'));
                            break;
                        default:
                            break;
                    }
                }
            }
        
        }
        request.send();
        
    }

    function setLevel(newLevelNum) {
        parseLevel('level-data/level-' + newLevelNum + '.json');
    }

    // MAIN GAME LOOP

    function mainLoop() {
        // Clear canvas
        ctx.clearRect(0, 0, canWidth, canHeight);

        // Change header color
        header.style.color = 'rgba(' +
            255 * (player.x / canWidth) + ',' +
            255 * (player.x / canWidth) + ',' +
            255 * (player.x / canWidth) + ')';

        Shifter.posToClr(shiftTarget, BG1, BG1, BGShiftType, 'all', false);

        // Draw backgrounds
        for (var i=0; i<backgrounds.length; i++) {
            backgrounds[i].draw(ctx);
        }

        // Update and draw walls
        for (var i=0; i<walls.length; i++) {
            // Check for shift type, and apply effect accordingly
            
            switch (walls[i].shiftType) {
                case 'monoX':
                    Shifter.posToClr(wallShiftTarget, walls[i], BG1, 'x', 'all', false);
                    break;
                case 'revMonoX':
                    Shifter.posToClr(wallShiftTarget, walls[i], BG1, 'x', 'all', true);
                    break;
                case 'monoY':
                    Shifter.posToClr(wallShiftTarget, walls[i], BG1, 'y', 'all', false);
                    break;
                case 'revMonoY':
                    Shifter.posToClr(wallShiftTarget, walls[i], BG1, 'y', 'all', true);
                    break;
                case 'monoXY':
                    Shifter.posToClr(wallShiftTarget, walls[i], BG1, 'xy', 'all', false);
                    break;
                case 'revMonoXY':
                    Shifter.posToClr(wallShiftTarget, walls[i], BG1, 'xy', 'all', true);
                    break;
                default:
                    break;
            }
            walls[i].draw(ctx);
        }

        // Update and draw endBlock
        if (endBlock) {
            endBlock.update(player);
            endBlock.draw(ctx);
        }

        // Update and draw player
        if (player) {
            player.update();
            player.draw(ctx);
        }
    }

    // Create essential game elements in global scope
    var TS = canWidth / 16;
    // IMPORTANT: make player slightly smaller in order to fit between gaps
    //      at the moment, 3.5 is the fastest w/out passing gaps
    var player = new Player(TS, TS, TS*0.94, TS*0.94, 3.5, 'rgba(240,0,0,1)');
    var endBlock = new EndBlock(canWidth-TS, canHeight-TS, TS, TS, true, null);
    var walls = [];
    var backgrounds = [];
    var BG1 = new Background(0, 0, canWidth, canHeight, 'rbga(200,200,200,1)');
    backgrounds.push(BG1);

    var levelNum = 0;

    // parseLevel() takes time, set up event listener?
    setLevel(levelNum);
    // After parsing level, initialize loop of 10 second intervals
    setInterval(mainLoop, 10);
});