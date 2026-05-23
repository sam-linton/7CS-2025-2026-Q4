let num1 = 0
let num2 = 0
let plus = 0
let minus = 0
let mult = 0
let div = 0
let op = 0
let countDisplay2 = document.getElementById('Number-Display2');
countDisplay2.innerHTML = num2;
let countDisplay = document.getElementById('Number-Display');
countDisplay.innerHTML = num1;
function one() {
    if (op === 0) {
      num1 = num1 * 10 + 1
        let countDisplay = document.getElementById('Number-Display');
        countDisplay.innerHTML = num1;
    }
    else { num2 = num2 * 10 + 1 }
    let countDisplay2 = document.getElementById('Number-Display2');
    countDisplay2.innerHTML = num2;

}
function two() {
    if (op === 0) {
              num1 = num1 * 10 + 2
        let countDisplay = document.getElementById('Number-Display');
        countDisplay.innerHTML = num1;
    }
    else { num2 = num2 * 10 + 2 }
    let countDisplay2 = document.getElementById('Number-Display2');
    countDisplay2.innerHTML = num2;


}
function three() {
    if (op === 0) {
              num1 = num1 * 10 + 3
        let countDisplay = document.getElementById('Number-Display');
        countDisplay.innerHTML = num1;
    }
    else { num2 = num2 * 10 + 3 }
    let countDisplay2 = document.getElementById('Number-Display2');
    countDisplay2.innerHTML = num2;


}
function four() {
    if (op === 0) {
              num1 = num1 * 10 + 4
        let countDisplay = document.getElementById('Number-Display');
        countDisplay.innerHTML = num1;

    }
    else { num2 = num2 * 10 + 4 }
    let countDisplay2 = document.getElementById('Number-Display2');
    countDisplay2.innerHTML = num2;

}
function five() {
    if (op === 0) {
              num1 = num1 * 10 + 5
        let countDisplay = document.getElementById('Number-Display');
        countDisplay.innerHTML = num1;
    }
    else { num2 = num2 * 10 + 5 }
    let countDisplay2 = document.getElementById('Number-Display2');
    countDisplay2.innerHTML = num2;


}
function six() {
    if (op === 0) {
              num1 = num1 * 10 + 6
        let countDisplay = document.getElementById('Number-Display');
        countDisplay.innerHTML = num1;
    }
    else { num2 = num2 * 10 + 6 }
    let countDisplay2 = document.getElementById('Number-Display2');
    countDisplay2.innerHTML = num2;

} function seven() {
    if (op === 0) {
             num1 = num1 * 10 + 7
        let countDisplay = document.getElementById('Number-Display');
        countDisplay.innerHTML = num1;
    }
    else { num2 = num2 * 10 + 7 }
    let countDisplay2 = document.getElementById('Number-Display2');
    countDisplay2.innerHTML = num2;

}
function eight() {
    if (op === 0) {
              num1 = num1 * 10 + 8
        let countDisplay = document.getElementById('Number-Display');
        countDisplay.innerHTML = num1;
    }
    else { num2 = num2 * 10 + 8 }
    let countDisplay2 = document.getElementById('Number-Display2');
    countDisplay2.innerHTML = num2;

}
function nine() {
    if (op === 0) {
              num1 = num1 * 10 + 9
        let countDisplay = document.getElementById('Number-Display');
        countDisplay.innerHTML = num1;
    }
    else {num2 = num2 * 10 + 9 }
    let countDisplay2 = document.getElementById('Number-Display2');
    countDisplay2.innerHTML = num2;

}

function zero() {
    if (op === 0) {
        num1 = num1 * 10
        let countDisplay = document.getElementById('Number-Display');
        countDisplay.innerHTML = num1;
    }
    else { num2 = num2 * 10 

        let countDisplay2 = document.getElementById('Number-Display2');
    countDisplay2.innerHTML = num2;
    }
    


}
function plusv() {
    plus = 1
    minus = 0
    mult = 0
    div = 0
}
function minusv() {
    plus = 0
    minus = 1
    mult = 0
    div = 0
}
function multv() {
    plus = 0
    minus = 0
    mult = 1
    div = 0
}
function divv() {
    plus = 0
    minus = 0
    mult = 0
    div = 1
}

function update() {
    if (plus === 1) {
        op = 1
    }
    if (minus === 1) {
        op = 1
    }
    if (mult === 1) {
        op = 1
    }
    if (div === 1) {
        op = 1
    }
}
function equal() {
    if (plus === 1) {
        num1 = num1 + num2
        num2 = 0
    }
    else if (minus === 1) {
        num1 = num1 - num2
        num2 = 0
    }
    else if (mult === 1) {
        num1 = num1 * num2
        num2 = 0
    }
    else if (div === 1) {
        num1 = num1 / num2
        num2 = 0
    }
    let countDisplay2 = document.getElementById('Number-Display2');
countDisplay2.innerHTML = num2;
let countDisplay = document.getElementById('Number-Display');
countDisplay.innerHTML = num1;
}
setInterval(update, 10);
function clearnum() {
    num1 = 0
    num2 = 0
    let countDisplay2 = document.getElementById('Number-Display2');
    countDisplay2.innerHTML = num2;
    let countDisplay = document.getElementById('Number-Display');
    countDisplay.innerHTML = num1;
    op = 0 
    plus = 0
    minus = 0
    mult = 0
    div = 0
}