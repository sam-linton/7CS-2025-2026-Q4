const startquiz = document.getElementById("startpeppapigquiz");
const heading = document.querySelector("h1");

function gotopeppapigquiz() {
    window.location.href = "http://127.0.0.1:3000/buzfed.com/peppa pig quiz/index.html?serverWindowId=49a0fe4d-480b-46e6-89b7-45921870ffdb";
}

function gotoluckquiz() {
    window.location.href = "http://127.0.0.1:3000/buzfed.com/luck quiz/index.html?serverWindowId=8539c2c2-1ad5-48c6-a188-e41a02c15606";
}

function darkMode() {
    let body = document.getElementById('body');
    body.className = 'dark-mode';
}

function lightMode() {
    let body = document.getElementById('body');
    body.className = 'light-mode';
}

function barbieMode() {
    let body = document.getElementById('body');
    body.className = 'barbie-mode';
}

function piggyMode() {
    let body = document.getElementById('body');
    body.className = 'piggy-mode';
}