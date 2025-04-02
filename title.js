// title.js

document.addEventListener("DOMContentLoaded", function() {
  const playButton = document.getElementById("playButton");
  playButton.addEventListener("click", function() {
    // Hide the title screen and show the game container
    document.getElementById("titleScreen").style.display = "none";
    document.getElementById("gameContainer").style.display = "block";

    // Start the game (startGame is defined in game.js)
    if (typeof startGame === 'function') {
      startGame();
    }
  });
});
