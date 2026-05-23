const hourHand = document.getElementById("hour");
const minuteHand = document.getElementById("minute");
const secondHand = document.getElementById("second");

function updateClock() {

  const now = new Date();

  const seconds = now.getSeconds();
  const minutes = now.getMinutes();
  const hours = now.getHours();

  const secondDegrees = seconds * 6;
  const minuteDegrees = minutes * 6 + seconds * 0.1;
  const hourDegrees = (hours % 12) * 30 + minutes * 0.5;

  secondHand.style.transform =
    `translateX(-50%) rotate(${secondDegrees}deg)`;

  minuteHand.style.transform =
    `translateX(-50%) rotate(${minuteDegrees}deg)`;

  hourHand.style.transform =
    `translateX(-50%) rotate(${hourDegrees}deg)`;
}

setInterval(updateClock, 1000);
updateClock();