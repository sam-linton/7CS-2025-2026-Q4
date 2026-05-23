document.getElementById("button").addEventListener("click", function () {

    const num1 = document.querySelector(".num1").value;
    const num2 = document.querySelector(".num2").value;
    const result = document.querySelector(".result");
    const oprator = document.getElementById("operation-menu").value;

    switch (oprator) {
        case "plus": result.innerHTML = Number(num1) + Number(num2); break;
        case "min":  result.innerHTML = Number(num1) - Number(num2); break;
        case "dev": result.innerHTML = Number(num1) / Number(num2); break;
        case "multi": result.innerHTML = Number(num1) * Number(num2); break;
        case "expo":  result.innerHTML = Number(num1) ** Number(num2); break;
        case "root":  result.innerHTML = Math.pow(Number(num1), 1 / Number(num2)); break;
    }
});
