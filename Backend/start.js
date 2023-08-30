const express = require("express");
const path = require("path");
const bodyParser = require("body-parser");
const fs = require("fs");
const fsp = require("fs").promises;
const cors = require("cors");

const app = express();
const port = 5000;

app.use(bodyParser.json());
app.use(express.json());

// CORS-settings, only allow requests from extension
app.use(
  cors({
    origin: "chrome-extension://bmojijcmhjohdjcjkmcpikifbppkbpgn",
    methods: ["GET", "POST"],
    allowedHeaders: [
      "Origin",
      "X-Requested-With",
      "Content-Type",
      "Accept",
      "Authorization",
    ],
  })
);

app.use(express.static(path.join(__dirname, "./calendars")));

const addEventICS = async (icsPath, body) => {
  const timeString = `${body.date}T${body.time}00`;
  const timeEndString = `${body.date}T${body.endTime}00`;
  const dateString = `DTSTART;TZID=Germany/Berlin:`;
  const endDateString = `DTEND;TZID=Germany/Berlin:`;
  const modifiedDate =
    dateString +
    timeString.replace(/[-:]/g, "") +
    "\n" +
    endDateString +
    timeEndString.replace(/[-:]/g, "");
  const modifiedAlldayDate = body.date.replace(/[-:]/g, "");

  const changes = `BEGIN:VEVENT
SUMMARY:${body.title}
${body.allday ? `DTSTART;VALUE=DATE:${modifiedAlldayDate}` : modifiedDate}
LOCATION:${body.location}
SEQUENCE:3
END:VEVENT`;
  try {
    const data = await fsp.readFile(icsPath, "utf-8");
    const lines = data.split("\n");
    const lineNumber = lines.length - 1;
    const insertionIndex = Math.max(lineNumber, 0);
    lines.splice(insertionIndex, 0, changes);
    const updatedText = lines.join("\n");
    console.log("updatedText:", updatedText);
    await fsp.writeFile(icsPath, updatedText, "utf8");
    return lineNumber;
  } catch (err) {
    console.log("Error", err);
    return -1;
  }
};

const addEventJSON = (jsonPath, body, line, res) => {
  const addToJson = {
    title: body.title,
    location: body.location,
    date: body.date,
    allday: body.allday,
    time: body.time,
    lineNumber: line,
  };

  fs.readFile(jsonPath, (err, data) => {
    if (err) {
      console.log(err);
      return;
    }
    let json = JSON.parse(data);
    console.log("Json vorher:", json);
    json.events.push(addToJson);
    console.log("Json nachher:", json);

    fs.writeFile(jsonPath, JSON.stringify(json), (err) => {
      if (err) {
        console.log(err);
        return;
      }
    });
  });
};

// POST-Request for adding new event to calendar
app.post("/addEvent", (req, res) => {
  const auth = req.headers.authorization;
  if (!auth) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const body = req.body;

  // add to JSON and to ICS
  const icsPath = `./calendars/${auth}.ics`;
  const jsonPath = `./calendars/${auth}.json`;

  // Pormise handling for async function.
  // Add event to ICS and then to JSON (because we need the line number)
  addEventICS(icsPath, body)
    .then((lineNumber) => {
      if (lineNumber !== -1 || lineNumber !== 0) {
        console.log("body:", body);
        addEventJSON(jsonPath, body, lineNumber, res);
      }
    })
    .catch((error) => {
      res.status(500).json({
        message: "Error while editing calendar. This shouldn't happen.",
      });
      console.error(error);
    });
  // Erfolgreich
  res.json({ message: "Successfully added event.." });
});

// GET-Request for getting all events from calendar as json
app.get("/getEvents", (req, res) => {
  const auth = req.headers.authorization;
  if (!auth) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const jsonPath = `./calendars/${auth}.json`;

  fs.readFile(jsonPath, (err, data) => {
    if (err) {
      res.status(500).json({
        message: "Error while getting events.",
      });
      return;
    }
    res.json(JSON.parse(data));
  });
});

const createFile = (path, init, res) => {
  fs.writeFile(path, init, "utf8", (err) => {
    if (err) {
      res.status(500).json({
        message: "Error while creating file.",
      });
      return;
    }
  });
};

app.post("/createCalendar", (req, res) => {
  // create file with name of user
  const auth = req.headers.authorization;
  if (!auth) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const icsPath = `./calendars/${auth}.ics`;
  const jsonPath = `./calendars/${auth}.json`;

  const icsInit = `BEGIN:VCALENDAR
CALSCALE:GREGORIAN
END:VCALENDAR`;

  const jsonInit = '{"events": []}';

  createFile(icsPath, icsInit, res);
  createFile(jsonPath, jsonInit, res);

  res.json({ message: "Successfully created files." });
});

// Start server
app.listen(port, () => {
  console.log(`Server läuft auf Port ${port}`);
});
