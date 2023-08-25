/*
chrome.runtime.onInstalled.addListener(function () {
  chrome.contextMenus.create({
    id: "new_appointment",
    title: "Neuen Termin '%s' erstellen",
    contexts: ["selection"],
  });
});

chrome.contextMenus.onClicked.addListener(function (info, tab) {
  if (info.menuItemId === "new_appointment") {
    var selection = info.selectionText;
    // hier geht die Kalendar-Action los
    console.log(selection); // TODO
  }
});

*/
const domain = "http://130.61.95.144:5000/";

function generateUUID() {
  var d = new Date().getTime();

  //var uuid = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(
  var uuid = "xxxyx-xyxx".replace(/[xy]/g, function (c) {
    var r = (d + Math.random() * 16) % 16 | 0;
    d = Math.floor(d / 16);
    return (c == "x" ? r : (r & 0x3) | 0x8).toString(16);
  });

  return uuid;
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
  const title = formData.eventTitle;
  const date = formData.eventDate;
  const time = formData.eventTime;
  const endTime = formData.eventEndTime;
  const allday = formData.allDay;
  const location = formData.eventLocation;

  const timeString = `${date}T${time}00`;
  const timeEndString = `${date}T${endTime}00`;
  const dateString = `DTSTART;TZID=Germany/Berlin:`
  const endDateString = `DTEND;TZID=Germany/Berlin:`
  const modifiedDate = dateString + timeString.replace(/[-:]/g, "") + "\n" + endDateString + timeEndString.replace(/[-:]/g, "");
  const modifiedAlldayDate = date.replace(/[-:]/g, "");
  const cal = `BEGIN:VEVENT
SUMMARY:${title}
${
  allday
    ? `DTSTART;VALUE=DATE:${modifiedAlldayDate}`
    : modifiedDate
}
LOCATION:${location}
SEQUENCE:3
END:VEVENT`;

  chrome.storage.sync.get(["uuid"], (result) => {
    const uuid = result.uuid;

    const request = {
      userid: uuid,
      event: cal,
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
  // Context Menu item
  chrome.contextMenus.create({
    id: "new_appointment",
    title: "Neuen Termin '%s' erstellen",
    contexts: ["selection"],
  });

  for (const cs of chrome.runtime.getManifest().content_scripts) {
    for (const tab of await chrome.tabs.query({ url: cs.matches })) {
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: cs.js,
      });
    }
  }
});

chrome.contextMenus.onClicked.addListener(function (info, tab) {
  if (info.menuItemId === "new_appointment") {
    const selectedText = info.selectionText;
    const changes = {
      userid: "user1", // das muesste eine UserID sein, sonst zu unsicher
      event: `BEGIN:VEVENT
SUMMARY:${selectedText}
DTSTART;TZID=Germany/Berlin:20230820T103400
DTEND;TZID=Germany/Berlin:20230820T113400
LOCATION:Goethestr. 13\, Berlin
DESCRIPTION: Ein Test\, in Berlin
STATUS:CONFIRMED
SEQUENCE:3
END:VEVENT`,
    };

    chrome.storage.sync.get(["uuid"], (result) => {
      const uuid = result.uuid;
      apiCall(uuid, changes);
    });
  }
});

// send selected test received from content script to popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("BIN IM LISTENER");
  if (message.action === "getSelectedText") {
    const selectedText = message.data;
    // wait for popup to open
    chrome.runtime.onConnect.addListener((port) => {
      if (port.name === "popup") {
        // send selected text to popup
        chrome.runtime.sendMessage({
          action: "passSelectedText",
          selected: selectedText,
        });
        /*port.onDisconnect.addListener(function () {
          console.log("popup has been closed");
        });*/
      }
    });
  } else if (message.action === "passFormData") {
    const formData = message.form;
    createEvent(formData);
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
