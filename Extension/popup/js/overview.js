const eventList = document.getElementById("eventList");

const domain = "https://calendarapi.jmjumper.de/";
let uuid;
let show;
const showPassedInput = document.getElementById("showPassedToggle");

// api call to get events as json
chrome.storage.sync.get(["uuid"], (result) => {
  uuid = result.uuid;
  fetch(domain + "getEvents", {
    method: "GET",
    headers: {
      Authorization: uuid,
      "Content-Type": "application/json",
    },
  })
    .then((response) => response.json())
    .then((data) => {
      chrome.storage.sync.get(["show_passed"], (result) => {
        show = result.show_passed;
        showPassedInput.checked = show;
        createScrollList(data.events, show);
      });
    })
    .catch((error) => {
      console.error("Fehler beim Senden der Daten:", error);
    });
});

const createScrollList = (eventsArray, show_passed) => {
  let currentDate = new Date();
  for (i = 0; i < eventsArray.length; i++) {
    const event = eventsArray[i];

    let eventContainer = document.createElement("div");
    eventContainer.className = "eventContainer";

    let eventLeftSide = document.createElement("div");
    eventLeftSide.className = "eventLeftSide";

    // Title
    let eventTitleContainer = document.createElement("div");
    eventTitleContainer.className = "eventTextContainer";

    let eventBoldTitle = document.createElement("p");
    eventBoldTitle.className = "eventBold";
    eventBoldTitle.innerText = "Title:";

    let eventThinTitle = document.createElement("p");
    eventThinTitle.className = "eventThin";
    eventThinTitle.innerText = event.title;

    eventTitleContainer.appendChild(eventBoldTitle);
    eventTitleContainer.appendChild(eventThinTitle);

    // Date
    let eventDateContainer = document.createElement("div");
    eventDateContainer.className = "eventTextContainer";

    let eventBoldDate = document.createElement("p");
    eventBoldDate.className = "eventBold";
    eventBoldDate.innerText = "Date:";

    let eventThinDate = document.createElement("p");
    eventThinDate.className = "eventThin";
    eventThinDate.innerText = event.date;

    eventDateContainer.appendChild(eventBoldDate);
    eventDateContainer.appendChild(eventThinDate);

    // Time
    let eventTimeContainer = document.createElement("div");
    eventTimeContainer.className = "eventTextContainer";

    let eventBoldTime = document.createElement("p");
    eventBoldTime.className = "eventBold";
    eventBoldTime.innerText = "Time:";

    let eventThinTime = document.createElement("p");
    eventThinTime.className = "eventThin";
    eventThinTime.innerText = event.allday
      ? "allday"
      : event.time + " - " + event.endTime;

    eventTimeContainer.appendChild(eventBoldTime);
    eventTimeContainer.appendChild(eventThinTime);

    // Location
    let eventLocationContainer = document.createElement("div");
    eventLocationContainer.className = "eventTextContainer";

    let eventBoldLocation = document.createElement("p");
    eventBoldLocation.className = "eventBold";
    eventBoldLocation.innerText = "Location:";

    let eventThinLocation = document.createElement("p");
    eventThinLocation.className = "eventThin";
    eventThinLocation.innerText = event.location;

    eventLocationContainer.appendChild(eventBoldLocation);
    eventLocationContainer.appendChild(eventThinLocation);

    eventLeftSide.appendChild(eventTitleContainer);
    eventLeftSide.appendChild(eventDateContainer);
    eventLeftSide.appendChild(eventTimeContainer);
    if (event.location !== "")
      eventLeftSide.appendChild(eventLocationContainer);

    // Add icons
    let eventRightSide = document.createElement("div");
    eventRightSide.className = "eventRightSide";

    let eventEditIcon = document.createElement("span");
    eventEditIcon.className = "material-symbols-outlined";
    eventEditIcon.innerText = "edit";

    let eventDeleteIcon = document.createElement("span");
    eventDeleteIcon.className = "material-symbols-outlined";
    eventDeleteIcon.classList.add("delete");
    eventDeleteIcon.innerText = "delete";

    // eventRightSide.appendChild(eventEditIcon);
    eventRightSide.appendChild(eventDeleteIcon);

    eventContainer.appendChild(eventLeftSide);
    eventContainer.appendChild(eventRightSide);

    let dateFromStering = new Date(`${event.date}T${event.time}`);
    if (dateFromStering < currentDate && !show_passed) {
      eventContainer.style.display = "none";
    }

    eventList.appendChild(eventContainer);
  }

  addEventListeners();
};

const addEventListeners = () => {
  let elements = document.querySelectorAll(
    "span.material-symbols-outlined.delete"
  );
  elements.forEach(function (item, idx) {
    function eventListener() {
      deleteEvent(idx);
    }
    item.addEventListener("click", eventListener, true);
  });
};

showPassedInput.addEventListener("change", (event) => {
  show = event.target.checked;
  chrome.storage.sync.set({ show_passed: show });
  window.location.reload(); // not particularly beautiful, but it works
});

const deleteEvent = (eventIndex) => {
  fetch(domain + "deleteEvent", {
    method: "DELETE",
    headers: {
      Authorization: uuid,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ eventIndex: eventIndex }),
  })
    .then((response) => response.json())
    .then(() => {
      window.location.reload(); // not particularly beautiful, but it works
    })
    .catch((error) => {
      console.error("Fehler beim Senden der Daten:", error);
    });
};
