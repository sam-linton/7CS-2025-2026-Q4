function startApp() {
    document.getElementById('titleScreen').style.display = 'none';
    document.getElementById('mainContent').style.display = 'block';
}


function forest() {
    let body = document.getElementById('body');
    body.className = 'forest forestBackground';
}

function beach() {
    let body = document.getElementById('body');
    body.className = 'beach beachBackground';
}

function meadow() {
    let body = document.getElementById('body');
    body.className = 'meadow meadowBackground';
}

function normal() {
    let body = document.getElementById('body');
    body.className = 'normal normalBackground';
}

function rainbow() {
    let body = document.getElementById('body')
    body.className = 'rainbow rainbowBackground'
}


function focusPlaylist() {

    document.getElementById('spotifyPlayer').src =
        "https://open.spotify.com/embed/playlist/5iMPQNcuMfYlWNRNUllc2o?si=aff0dbebd8de4cae";
}

function studyPlaylist() {

    document.getElementById('spotifyPlayer').src =
        "https://open.spotify.com/embed/playlist/37i9dQZF1DX8NTLI2TtZa6";
}

function sleepPlaylist() {

    document.getElementById('spotifyPlayer').src =
        "https://open.spotify.com/embed/playlist/37i9dQZF1DWZd79rJ6a7lp";
}

function lofiPlaylist() {

    document.getElementById('spotifyPlayer').src =
        "https://open.spotify.com/embed/playlist/3tVn8zUOCMV5hfT8NRyHoJ";
}

let timer;

let seconds = 0;

function startTimer() {
    clearInterval(timer);

    if (seconds <= 0) {
        let minutes =
            document.getElementById("minutesInput").value;
        seconds = minutes * 60;
    }

    timer = setInterval(function () {
        let mins = Math.floor(seconds / 60);
        let secs = seconds % 60;
        if (secs < 10) {
            secs = "0" + secs;
        }

        document.getElementById("timerDisplay").innerHTML =
            mins + ":" + secs;

        seconds--;

        if (seconds < 0) {
            clearInterval(timer);
            alert("Study session finished!");
            seconds = 0;
        }

    }, 1000);
}

function pauseTimer() {
    clearInterval(timer);
}

function clearTimer() {
    clearInterval(timer);
    seconds = 0;
    document.getElementById("timerDisplay").innerHTML =
        "00:00";
    document.getElementById("minutesInput").value = "";
}

function rain() {
    let music = document.getElementById('music');

    music.src = "Rain.mp3";
    music.loop = true;
    music.play();
}

function stream() {
    let music = document.getElementById('music');

    music.src = "Water.mp3";
    music.loop = true;
    music.play();
}

function fire() {
    let music = document.getElementById('music');

    music.src = "Fireplace+Soft Piano.mp3";
    music.loop = true;
    music.play();
}

function showVideo() {
    let video = document.getElementById('bgVideo');
    video.style.opacity = "1";
    video.play();
}

function stopMusic() {
    let music = document.getElementById('music');

    music.pause();
    music.currentTime = 0;
}
