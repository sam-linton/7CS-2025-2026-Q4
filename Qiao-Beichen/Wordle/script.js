const possibleAnswers = [
    // A
    "ABOUT", "ABOVE", "ACTOR", "ACUTE", "ALIVE", "ALONE", "ALONG", "AMONG", "AUDIO", "AUDIT",
    // B
    "BADGE", "BASIC", "BEACH", "BEGIN", "BLACK", "BLIND", "BLOWN", "BOARD", "BOOKS", "BRAIN",
    "BREAD", "BREAK", "BRING", "BROWN", "BRUSH",
    // C
    "CABLE", "CANDY", "CATCH", "CAUSE", "CHAIN", "CHAIR", "CHART", "CHASE", "CHIEF", "CHILD",
    "CHINA", "CLAIM", "CLASS", "CLEAN", "CLEAR", "CLIMB", "CLOCK", "CLOSE", "COACH", "COAST",
    "COUNT", "COURT", "COVER", "CRAFT", "CRASH", "CREAM", "CRIME", "CROSS", "CROWD", "CROWN", "CRAZE", "CRISP",
    "CYCLE",
    // D
    "DAILY", "DANCE", "DEATH", "DELAY", "DIRTY", "DOUBT", "DRAFT", "DRAMA", "DREAM", "DRESS",
    "DRINK", "DRIVE",
    // E
    "EARTH", "EMPTY", "ENEMY", "ENJOY", "ENTER", "ENTRY", "EQUAL", "EVENT", "EVERY", "EXACT",
    "EXIST", "EXTRA",
    // F
    "FAITH", "FALSE", "FAULT", "FIBER", "FIELD", "FIFTH", "FIGHT", "FINAL", "FIRST", "FIXED",
    "FLAME", "FLESH", "FLOAT", "FLOOD", "FLOOR", "FOCUS", "FORCE", "FRAME", "FRESH", "FRONT",
    // G
    "GIANT", "GLASS", "GLOBE", "GLOVE", "GRACE", "GRADE", "GRAND", "GRANT", "GRASS", "GREAT",
    "GREEN", "GROUP", "GROWN", "GUARD", "GUEST", "GUIDE",
    // H
    "HABIT", "HEART", "HEAVY", "HELLO", "HONEY", "HOTEL", "HOUSE", "HUMAN", "HUMOR",
    // I
    "IDEAL", "IMAGE", "INDEX", "INNER", "INPUT", "IRONY", "ISSUE",
    // J
    "JEANS", "JOINT", "JUDGE", "JUICE",
    // K
    "KNIFE", "KNOCK", "KNOWN",
    // L
    "LABOR", "LIGHT", "LOCAL", "LOGIC", "LOOSE", "LUCKY", "LUNCH", "LYRIC",
    // M
    "MAGIC", "MAJOR", "MATCH", "METAL", "MODEL", "MONEY", "MONTH", "MOTOR", "MOUTH", "MOVIE",
    "MUSIC",
    // N
    "NIGHT", "NOISE", "NORTH", "NOVEL", "NURSE",
    // O
    "OCEAN", "OFFER", "OFTEN", "ORDER", "OTHER", "OUTER", "OWNER", "OZONE",
    // P
    "PAGES", "PAINT", "PANEL", "PAPER", "PARTY", "PEACE", "PHASE", "PHONE", "PHOTO", "PIECE",
    "PILOT", "PITCH", "PLACE", "PLAIN", "PLANE", "PLANT", "PLATE", "POINT", "POUND", "POWER",
    "PRESS", "PRICE", "PRIDE", "PRIME", "PRINT", "PRIZE", "PROUD", "PROVE", "PARKA",
    // Q
    "QUEEN", "QUICK", "QUIET", "QUITE", "QUOTE", "QUEST", "QUILT", "QUARK", "QUASH", "QUELL",
    // R
    "RADIO", "RAISE", "RANGE", "RATIO", "REACH", "READY", "REFER", "RELAX", "REPLY", "RIGHT",
    "RIVAL", "RIVER", "ROBOT", "ROUGH", "ROUND", "ROUTE", "ROYAL", "RURAL", "RUSTY",
    // S
    "SCALE", "SCENE", "SCENT", "SCORE", "SERVE", "SHIFT", "SHIRT", "SHOCK", "SHOOT", "SHORE",
    "SHORT", "SHOUT", "SHOWN", "SIGHT", "SINCE", "SKILL", "SLEEP", "SLIDE", "SMALL", "SMART",
    "SMELL", "SMILE", "SMOKE", "SOLID", "SOLVE", "SOUND", "SOUTH", "SPACE", "SPARE", "SPEAK",
    "SPEED", "SPEND", "STAFF", "STAGE", "STAIR", "STAKE", "STAMP", "STAND", "STARE", "START",
    "STATE", "STEAM", "STEEL", "STICK", "STILL", "STOCK", "STONE", "STORE", "STORM", "STORY",
    "STRIP", "STUCK", "STUDY", "STYLE", "SUGAR", "SUITE", "SUPER", "SWEET", "SWIFT", "SWING",
    "SWORD",
    // T
    "TABLE", "TAKEN", "TASTE", "TEACH", "TEETH", "THANK", "THEFT", "THEIR", "THEME", "THERE",
    "THESE", "THICK", "THIEF", "THING", "THINK", "THIRD", "THOSE", "THREE", "THROW", "THUMB",
    "TIGER", "TIGHT", "TIMES", "TIRED", "TITLE", "TODAY", "TOKEN", "TOPIC", "TOTAL", "TOUCH",
    "TOUGH", "TOWER", "TRACK", "TRADE", "TRAIL", "TRAIN", "TRAIT", "TRASH", "TREAT", "TREND",
    "TRIAL", "TRIBE", "TRICK", "TRUCK", "TRULY", "TRUNK", "TRUST", "TRUTH", "TWICE", "TWIST",
    "TYPES",
    // U
    "UNCLE", "UNDER", "UNION", "UNITE", "UNTIL", "UPPER", "UPSET", "URBAN", "USERS",
    // V
    "VAGUE", "VALID", "VALUE", "VAPOR", "VENUE", "VERSE", "VIDEO", "VIRAL", "VIRUS", "VISIT",
    "VITAL", "VOCAL", "VOICE", "VOTER",
    // W
    "WAGON", "WAIST", "WATCH", "WATER", "WAVE", "WEAPON", "WEARY", "WEAVE", "WEIGH", "WEIGHT",
    "WHALE", "WHEAT", "WHEEL", "WHERE", "WHICH", "WHILE", "WHITE", "WHOLE", "WHOSE", "WIDOW",
    "WIDTH", "WINDY", "WIRES", "WISDOM", "WITCH", "WITTY", "WIVES", "WOMAN", "WOMEN", "WORDS",
    "WORLD", "WORRY", "WORSE", "WORST", "WORTH", "WOULD", "WOUND", "WOVEN", "WRIST", "WRITE",
    "WRONG", "WROTE",
    // Y
    "YACHT", "YEARS", "YEAST", "YIELD", "YOUNG", "YOURS", "YOUTH", "YEARN", "YELLS", "YAHOO", "YAWNS",
    // Z
    "ZEBRA", "ZEROS", "ZONES",
];




let answer = possibleAnswers[Math.floor(Math.random() * possibleAnswers.length)];
let letterCounts = {};
let timesWon = 0;
let hintUsed = false;








for (const letter of answer) {
    letterCounts[letter] = (letterCounts[letter] || 0) + 1;
}




let boxNumber = 0;
let boxRow = 0;
let alreadyChecked = false;




function buttonPressed(letter) {
    let currentBox = document.getElementById("box" + boxNumber);




    if (boxNumber % 5 === 0) {
        alreadyChecked = false;
    }
    if (Math.floor(boxNumber / 5) === boxRow && boxNumber < 30) {
        currentBox.innerText = letter;
        boxNumber = boxNumber + 1;
    }
}




function deletePressed() {
    let startOfCurrentRow = boxRow * 5;

    if (boxNumber <= startOfCurrentRow) {
        return;
    }

    boxNumber--;


    let currentBox = document.getElementById("box" + boxNumber);
    if (currentBox) {
        currentBox.innerText = "";
        currentBox.classList.remove("missing", "includes", "correct");
    }

    if (boxNumber === 4) boxRow = 0;
    if (boxNumber === 9) boxRow = 1;
    if (boxNumber === 14) boxRow = 2;
    if (boxNumber === 19) boxRow = 3;
    if (boxNumber === 24) boxRow = 4;
}

function checkGuess() {
    let startBox = boxRow * 5;
    let nextBox = startBox + 5;
    let guessLst = [];
    let winCount = 0;

    for (let i = startBox; i < nextBox; i++) {
        let currentBox = document.getElementById("box" + i);
        let letter = currentBox.textContent.trim().toUpperCase();
        guessLst.push(letter);
    }

    if (guessLst.includes("")) {
        alert("Not enough letters!");
        return;
    }

    let remainingCounts = { ...letterCounts };

    let boxStatuses = new Array(5).fill("missing");

    for (let i = 0; i < 5; i++) {
        let letter = guessLst[i];
        if (letter === answer[i]) {
            boxStatuses[i] = "correct";
            remainingCounts[letter]--;
            winCount = winCount + 1;
        }
    }

    for (let i = 0; i < 5; i++) {
        if (boxStatuses[i] === "correct") {
            continue;
        }

        let letter = guessLst[i];
        if (answer.includes(letter) && remainingCounts[letter] > 0) {
            boxStatuses[i] = "includes";
            remainingCounts[letter]--;
        }
    }

    for (let i = 0; i < 5; i++) {
        let boxId = startBox + i;
        let currentBox = document.getElementById("box" + boxId);
        currentBox.classList.add(boxStatuses[i]);
    }

    for (let i = 0; i < 5; i++) {
        let letter = guessLst[i];
        let status = boxStatuses[i];
        let keyButton = document.getElementById("key-" + letter);


        if (keyButton) {
            if (keyButton.classList.contains("correct")) {
                continue;
            }

            if (keyButton.classList.contains("includes") || keyButton.classList.contains("missing")) {
                if (status === "correct") {
                    keyButton.classList.remove("includes", "missing");
                    keyButton.classList.add("correct");
                }
                continue;
            }


            keyButton.classList.add(status);
        }
    }

    boxRow++;
    alreadyChecked = true;

    if (winCount === 5) {
        winGame();
    } else if (boxRow === 6) {
        loseGame();
    }
}

function loseGame() {
    document.getElementById("secret-word").innerText = answer;
    document.getElementById("lose-screen").className = "visible";
}

function showInstructions() {
    alert("Guess the Wordle! Each guess must be a valid 5-letter word.");
}

function cheat() {
    alert("The answer is DUMBO");
}

function winGame() {
    timesWon++;
    updateScoreboard();
    document.getElementById("win-screen").className = "visible";
}

function updateScoreboard() {
    document.getElementById("win-count-display").innerHTML = timesWon;
}

function playAgain() {
    resetGame();
}

function resetGame() {
    // Hide the win screen
    document.getElementById("win-screen").className = "hidden";
    document.getElementById("lose-screen").className = "hidden";
    answer = possibleAnswers[Math.floor(Math.random() * possibleAnswers.length)];
    document.getElementById("box0").innerText = "";
    document.getElementById("box0").className = "box";
    document.getElementById("box1").innerText = "";
    document.getElementById("box1").className = "box";
    document.getElementById("box2").innerText = "";
    document.getElementById("box2").className = "box";
    document.getElementById("box3").innerText = "";
    document.getElementById("box3").className = "box";
    document.getElementById("box4").innerText = "";
    document.getElementById("box4").className = "box";




    document.getElementById("box5").innerText = "";
    document.getElementById("box5").className = "box";
    document.getElementById("box6").innerText = "";
    document.getElementById("box6").className = "box";
    document.getElementById("box7").innerText = "";
    document.getElementById("box7").className = "box";
    document.getElementById("box8").innerText = "";
    document.getElementById("box8").className = "box";
    document.getElementById("box9").innerText = "";
    document.getElementById("box9").className = "box";




    document.getElementById("box10").innerText = "";
    document.getElementById("box10").className = "box";
    document.getElementById("box11").innerText = "";
    document.getElementById("box11").className = "box";
    document.getElementById("box12").innerText = "";
    document.getElementById("box12").className = "box";
    document.getElementById("box13").innerText = "";
    document.getElementById("box13").className = "box";
    document.getElementById("box14").innerText = "";
    document.getElementById("box14").className = "box";




    document.getElementById("box15").innerText = "";
    document.getElementById("box15").className = "box";
    document.getElementById("box16").innerText = "";
    document.getElementById("box16").className = "box";
    document.getElementById("box17").innerText = "";
    document.getElementById("box17").className = "box";
    document.getElementById("box18").innerText = "";
    document.getElementById("box18").className = "box";
    document.getElementById("box19").innerText = "";
    document.getElementById("box19").className = "box";




    document.getElementById("box20").innerText = "";
    document.getElementById("box20").className = "box";
    document.getElementById("box21").innerText = "";
    document.getElementById("box21").className = "box";
    document.getElementById("box22").innerText = "";
    document.getElementById("box22").className = "box";
    document.getElementById("box23").innerText = "";
    document.getElementById("box23").className = "box";
    document.getElementById("box24").innerText = "";
    document.getElementById("box24").className = "box";




    document.getElementById("box25").innerText = "";
    document.getElementById("box25").className = "box";
    document.getElementById("box26").innerText = "";
    document.getElementById("box26").className = "box";
    document.getElementById("box27").innerText = "";
    document.getElementById("box27").className = "box";
    document.getElementById("box28").innerText = "";
    document.getElementById("box28").className = "box";
    document.getElementById("box29").innerText = "";
    document.getElementById("box29").className = "box";

    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    for (let i = 0; i < alphabet.length; i++) {
        let keyButton = document.getElementById("key-" + alphabet[i]);
        if (keyButton) {
            keyButton.classList.remove("correct", "includes", "missing");
        }
    }

    boxNumber = 0;
    boxRow = 0;
    alreadyChecked = false;
    hintUsed = false;
}

function hint() {
    if (hintUsed) {
        alert("You can only use one hint per round!");
        return;
    }
    let startBox = boxRow * 5;
    let nextBox = startBox + 5;

    let lettersInRow = boxNumber % 5;


    let targetPosition = lettersInRow;
    let targetBoxId = startBox + targetPosition;

    let hintLetter = answer[targetPosition];

    let currentBox = document.getElementById("box" + targetBoxId);
    if (currentBox) {
        currentBox.innerText = hintLetter;
        boxNumber = boxNumber + 1;
    }
    hintUsed = true;


}



