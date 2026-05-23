let secDisplay = document.getElementById('second')
let minDisplay = document.getElementById('minute')
let hrDisplay = document.getElementById('hour')

let dayDisplay = document.getElementById('day')
let monthDisplay = document.getElementById('month')
let yrDisplay = document.getElementById('year')

let msStopwatchDisplay = document.getElementById('milisec')
let secStopwatchDisplay = document.getElementById('second-stopwatch')
let minStopwatchDisplay = document.getElementById('minute-stopwatch')
let hrStopwatchDisplay = document.getElementById('hour-stopwatch')

let msCountStopwatch = 0
let secondCount = 0
let secondCountStopwatch = 0
let minuteCount = 0
let minuteCountStopwatch = 0
let hourCount = 0
let hourCountStopwatch = 0
let day = 1
let month = 1
let year = 2026

//STOPWATCH APP
let stopClicked = true;
let stopWatchInterval = null;

function changeMs(){
    msCountStopwatch ++  
    if(msCountStopwatch === 100){
        msCountStopwatch = 0
        changeSecondStopwatch()    
    } 
    msStopwatchDisplay.innerHTML = msCountStopwatch
}

function startStopwatch(){
    if (stopClicked === true){
        stopClicked = false;
        clearInterval(stopWatchInterval);
        stopWatchInterval = setInterval(changeMs, 10);
    }   
}

function stopStopwatch (){
    stopClicked = true
    clearInterval(stopWatchInterval);
}

function changeSecondStopwatch(){
    //change second count
    secondCountStopwatch ++

    //if hits a minute, change seconds to 0
    if(secondCountStopwatch === 60){
        secondCountStopwatch = 0
        changeMinuteStopwatch()
    }

    //change second display
    secStopwatchDisplay.innerHTML = secondCountStopwatch + "."
}

function changeMinuteStopwatch(){
    //change minute count
    minuteCountStopwatch ++

    //if hits an hour, change minutes to 0
    if(minuteCountStopwatch === 60){
        minuteCountStopwatch = 0
        changeHourStopwatch()
    }

    //change minute display
    minDisplayStopwatch.innerHTML = minuteCountStopwatch + ":"
}

function changeHourStopwatch(){
    //change hour count
    hourCountStopwatch ++


    //change hour display
    hrDisplayStopwatch.innerHTML = hourCountStopwatch + ":"  
}


function resetStopwatch(){
    stopStopwatch()
    
    msCountStopwatch = 0
    secondCountStopwatch = 0
    minuteCountStopwatch = 0
    hourCountStopwatch = 0

    msStopwatchDisplay.innerHTML = msCountStopwatch
    secStopwatchDisplay.innerHTML = secondCountStopwatch + "."
    minDisplayStopwatch.innerHTML = minuteCountStopwatch + ":"
    hrDisplayStopwatch.innerHTML = hourCountStopwatch + ":"
}

//CLOCK APP

function changeTime() {
    //change second count
    secondCount ++

    //if hits a minute, change seconds to 0
    if(secondCount === 60){
        secondCount = 0
        changeMinute()
    }

    //change second display
    secDisplay.innerHTML = secondCount 
}

function changeMinute(){
    //change minute count
    minuteCount ++

    //if hits an hour, change minutes to 0
    if(minuteCount === 60){
        minuteCount = 0
        changeHour()
    }

    //change minute display
    minDisplay.innerHTML = minuteCount + ":"
}

function changeHour(){
    //change hour count
    hourCount ++

    //if hits 24, change day
    if(hourCount === 24){
        hourCount = 0
        changeDay()
    }

    //change hour display
    hrDisplay.innerHTML = hourCount + ":"  
}

function changeDay(){
    //change day
    day ++

    //if day hits 30, 31 change month
    if (month === 4 || month === 6 || month === 9 || month === 11)
        if(day === 31){
            day = 1
            changeMonth()
        }
    if (month === 1 || month === 3 || month === 5 || month === 7 || month === 8 || month === 10 || month === 12){
        if(day === 32){
            day = 1
            changeMonth()
        }
    }
    if (month === 2){
        if(day === 29){
            day = 1
            changeMonth()
        }
    }
    //change day display
    dayDisplay.innerHTML = day
}

function changeMonth(){
    //change month
    month ++

    //if month hits 12 change year
    if(month === 13){
        month = 1
        changeYear()
    }
    //change month display
    monthDisplay.innerHTML = month
}

function changeYear(){
    //change year
    year ++

    //change year display
    yrDisplay.innerHTML = year
}

function setMonth() {
    let monthInput = document.getElementById('setMonth')
    let monthValue = monthInput.value
    month = Number(monthValue)
    monthDisplay.innerHTML = monthValue
}

function setDay() {
    let dayInput = document.getElementById('setDay')
    let dayValue = dayInput.value
    day = Number(dayValue)
    dayDisplay.innerHTML = dayValue
}

function setYear() {
    let yearInput = document.getElementById('setYear')
    let yearValue = yearInput.value
    year = Number(yearValue)
    yrDisplay.innerHTML = yearValue
}

function setHour() {
    let hourInput = document.getElementById('setHour')
    let hourValue = hourInput.value
    hourCount = Number(hourValue)
    hrDisplay.innerHTML = hourValue
}

function setMin() {
    let minInput = document.getElementById('setMin')
    let minValue = minInput.value
    minuteCount = Number(minValue)
    minDisplay.innerHTML = minValue
}

function setSec() {
    let secInput = document.getElementById('setSec')
    let secValue = secInput.value
    secondCount = Number(secValue)
    secDisplay.innerHTML = secValue
}

setInterval(changeTime, 1000)

//ALARM APP
let alarmHourDisplay = document.getElementById("alarmHour")

let alarmHour = 7

let alarmMinDisplay = document.getElementById("alarmMin")

let alarmMin = 30

let alarmSound = new Audio("Alarm1.mp3")

let alarmRangOnce = false;

function addHour(){
    alarmHour ++
    if (alarmHour === 24) {
        alarmHour = 0;
        alarmHourDisplay.innerHTML = alarmHour
    }
    alarmHourDisplay.innerHTML = alarmHour 
}

function subtractHour(){
    alarmHour = alarmHour - 1
    if (alarmHour < 0) {
        alarmHour = 23;
        alarmHourDisplay.innerHTML = alarmHour
    }
    alarmHourDisplay.innerHTML = alarmHour + ":"
}

function addMin(){
    alarmMin = (alarmMin % 59);
    alarmMin ++
    alarmMinDisplay.innerHTML = alarmMin
}

function subtractMin(){
    alarmMin = alarmMin - 1
    alarmMinDisplay.innerHTML = alarmMin
    if (alarmMin < 1) {
        alarmMin = 60; // Wrap around to the top
    }
}

function alarmRing(){
    if (alarmHour === hourCount && alarmMin === minuteCount && alarmRangOnce === false){
            alarmSound.play()
            alarmRangOnce = true;
    }
}

function stopAlarm(){
    if (alarmRangOnce === true){
        alarmHour ++
        alarmSound.currentTime = 0;
        alarmSound.pause();
        alarmHourDisplay.innerHTML = alarmHour + ":"
        alarmRangOnce = false;
    }
}

function snoozeAlarm(){
    if (alarmRangOnce === true){
        alarmMin = alarmMin + 5
        alarmSound.currentTime = 0;
        alarmSound.pause();
        alarmMinDisplay.innerHTML = alarmMin + ":"
        alarmRangOnce = false;
    }
}
setInterval(alarmRing, 1000)


