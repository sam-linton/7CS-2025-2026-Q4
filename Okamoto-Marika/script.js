let pstTime = 0


function enterTime(timeZone) {
    let timeInput = document.getElementById(timeZone);
    let time = Number(timeInput.value);

    if (timeZone == 'pst') pstTime = time;
    if (timeZone == 'est') pstTime = time - 300;
    if (timeZone == 'gmt') pstTime = time - 800;
    if (timeZone == 'cet') pstTime = time - 900;
    if (timeZone == 'bst') pstTime = time - 900;
    if (timeZone == 'jst') pstTime = time - 1600;

    timeInput.value = "";

    // let time_text = document.getElementById(timeZone + "-input");
    // time_text.value = time;



    setAllTimes();
}

function setAllTimes() {
    let timeInput = document.getElementById('pst-input');
    timeInput.innerHTML = pstTime;

    timeInput = document.getElementById('est-input');
    timeInput.innerHTML = pstTime + 300;

    timeInput = document.getElementById('gmt-input');
    timeInput.innerHTML = pstTime + 800;

    timeInput = document.getElementById('cet-input');
    timeInput.innerHTML = pstTime + 900;

    timeInput = document.getElementById('bst-input');
    timeInput.innerHTML = pstTime + 900;

    timeInput = document.getElementById('jst-input');
    timeInput.innerHTML = pstTime + 1600;
}