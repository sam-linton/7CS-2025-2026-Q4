let score = 0;

// Go to quiz page
function gotopeppapigquiz() {
    window.location.href = "quiz.html";
}

// Change modes
function setMode(modeName) {

    const body = document.getElementById("body");

    body.classList.remove(
        "dark-mode",
        "light-mode",
        "barbie-mode",
        "piggy-mode"
    );

    body.classList.add(modeName);
}

function darkMode() {
    setMode("dark-mode");
}

function lightMode() {
    setMode("light-mode");
}

function barbieMode() {
    setMode("barbie-mode");
}

function piggyMode() {
    setMode("piggy-mode");
}

// Quiz answers
function checkAnswer(button, isCorrect) {

    const question = button.parentElement;

    const result = question.querySelector(".result");

    const buttons = question.querySelectorAll("button");

    buttons.forEach(btn => {
        btn.disabled = true;
    });

    if (isCorrect) {

        button.style.backgroundColor = "green";
        button.style.color = "white";

        result.textContent = "Correct!";
        result.style.color = "green";

        score++;

    } else {

        button.style.backgroundColor = "red";
        button.style.color = "white";

        result.textContent = "Wrong!";
        result.style.color = "red";
    }

    updateScore();
}

// Update score text
function updateScore() {

    const scoreText = document.getElementById("score");

    if (scoreText) {
        scoreText.textContent = "Score: " + score;
    }
}