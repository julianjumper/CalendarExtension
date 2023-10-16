const domain = "https://calendarapi.jmjumper.de:5000/";

function generateUUID() {
  var d = new Date().getTime();

  return "xxxyx-xyxx".replace(/[xy]/g, function (c) {
    var r = (d + Math.random() * 16) % 16 | 0;
    d = Math.floor(d / 16);
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

function apiCall(uuid, changes) {
  fetch(domain + "addEvent", {
    method: "POST",
    headers: {
      Authorization: uuid,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(changes),
  })
    .then((response) => response.json())
    .then((data) => {
      console.log(data.message);
    })
    .catch((error) => {
      console.error("Fehler beim Senden der Daten:", error);
    });
}

function createCalendar(uuid) {
  fetch(domain + "createCalendar", {
    method: "POST",
    headers: {
      Authorization: uuid,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ uuid: uuid }),
  })
    .then((response) => response.json())
    .then((data) => {
      console.log(data.message);
    })
    .catch((error) => {
      console.error("Fehler beim Senden der Daten:", error);
    });
}

function createEvent(formData) {
  // format form data if empty
  let title = formData.eventTitle;
  if (!title || title === "") title = "Unnamed Event";
  let date = formData.eventDate;
  if (!date || date === "") date = new Date().toISOString().split("T")[0];
  let time = formData.eventTime;
  if (!time || time === "") time = "12:00";
  let endTime = formData.eventEndTime;
  if (!endTime || endTime === "") endTime = "13:00";
  let allday = formData.allDay;
  let location = formData.eventLocation;
  if (!location || location === "") location = "";

  chrome.storage.sync.get(["uuid"], (result) => {
    const uuid = result.uuid;

    const request = {
      userid: uuid,
      title: title,
      allday: allday,
      time: time,
      endTime: endTime,
      date: date,
      location: location,
    };

    apiCall(uuid, request);
  });
}

chrome.runtime.onInstalled.addListener(async function (details) {
  if (details.reason === "install") {
    // Genereate and save token
    const newUuid = generateUUID();
    chrome.storage.sync.set({ uuid: newUuid });
    // call api to register new calendar
    createCalendar(newUuid);
  }

  for (const cs of chrome.runtime.getManifest().content_scripts) {
    for (const tab of await chrome.tabs.query({ url: cs.matches })) {
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: cs.js,
      });
    }
  }
});

// send selected test received from content script to popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // sends selected text to popup as soon as it opens
  if (message.action === "getSelectedText") {
    const selectedText = message.data;
    // wait for popup to open
    chrome.runtime.onConnect.addListener((port) => {
      // popup is now open
      if (port.name === "popup") {
        // send selected text to popup
        chrome.runtime.sendMessage({
          action: "passSelectedText",
          selected: selectedText,
        });
      }
    });
  }
  // creates event for popup.js
  else if (message.action === "passFormData") {
    const formData = message.form;
    createEvent(formData);
    sendResponse({ message: "success" });
  }
});

chrome.runtime.onConnect.addListener((port) => {
  if (port.name === "popup") {
    // send uuid to popup, probably only for debugging
    chrome.storage.sync.get(["uuid"], (result) => {
      const uuid = result.uuid;
      chrome.runtime.sendMessage({ action: "getUUID", uuid: uuid });
    });
  }
});
