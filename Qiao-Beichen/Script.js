let response = " ";

function yes() {
    response = "Yay! You agree with 70% of the world!";

    let responseDisplay = document.getElementById('response');
    responseDisplay.innerHTML = response;

    // let input = document.getElementById('input');
    // input.className = 'yes'
}

function no() {
    response = "Awww... why?";

    let responseDisplay = document.getElementById('response');
    responseDisplay.innerHTML = response;

    // document.getElementById("myInput").style.display = "inline-block";
    // let input = document.getElementById('input');
    // input.className = 'no'
}