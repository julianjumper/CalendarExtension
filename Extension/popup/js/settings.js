const url = "https://calendarapi.jmjumper.de/";

// get button and input field
const uuidButton = document.getElementById("uuidButton");
const uuidInput = document.getElementById("uuidInput");

// Get uuid from storage
chrome.storage.sync.get(["uuid"], (data) => {
  const uuid = data.uuid;
  uuidInput.value = uuid;
});

// check if calendar with uuid exists
const checkCalendarExists = async (uuid) => {
  fetch(url + "calendarExists", {
    headers: {
      Authorization: uuid, // testing with new uuid from settings.js
      "Content-Type": "application/json",
    },
  })
    .then((response) => response.json())
    .then((data) => {
      if (data.exists) {
        // save uuid to storage
        chrome.storage.sync.set({ uuid: uuid });
        // change color of button to green
        uuidButton.style.backgroundColor = "#28a745"; // green
      } else {
        // change color of button to red
        uuidButton.style.backgroundColor = "#dc3545"; // red
        uuidInput.value = "Calendar doesn't exist";
      }
    })
    .catch((error) => {
      console.log("error:", error);
      // change color of button to red
      uuidButton.style.backgroundColor = "#dc3545"; // red
      uuidInput.value = "error";
    });
};

// Save uuid to storage if button is pressed
uuidButton.addEventListener("click", (e) => {
  e.preventDefault();
  const newUuid = uuidInput.value;
  // api call to check if calendar with this uuid exists
  checkCalendarExists(newUuid);
});

// change color back to blue if uuid was changed
uuidInput.addEventListener("input", () => {
  uuidButton.style.backgroundColor = "#6ac0fd"; // blue
});

const copyButton = document.getElementById("copy");
// copy uuid to clipboard
copyButton.addEventListener("click", () => {
  const uuid = uuidInput.value;
  navigator.clipboard.writeText(uuid);
});
