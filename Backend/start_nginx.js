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

// CORS settings remain the same
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

// add event to ICS file
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
    await fsp.writeFile(icsPath, updatedText, "utf8");
    return lineNumber;
  } catch (err) {
    console.log("Error", err);
    return -1;
  }
};

// add event to JSON file
const addEventJSON = (jsonPath, body, line, res) => {
  // remember where event starts and ends in ICS file (important for deleting)
  const endLineNumber = body.allday ? line + 5 : line + 6;
  const addToJson = {
    title: body.title,
    location: body.location,
    date: body.date,
    allday: body.allday,
    time: body.time,
    endTime: body.endTime,
    lineNumber: line,
    endLineNumber: endLineNumber,
  };

  // read json file, add event to array, sort array, write back to file
  fs.readFile(jsonPath, (err, data) => {
    if (err) {
      console.log(err);
      return;
    }

    // parse json file and add new event
    let json = JSON.parse(data);
    json.events.push(addToJson);

    // sort event array by date and time
    json.events.sort((a, b) => {
      return new Date(`${a.date}T${a.time}`) - new Date(`${b.date}T${b.time}`);
    });

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

  console.log("about to add an event");

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

// create file with, responds with error 500 if necessary
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

// POST-Request for creating new calendar
app.post("/createCalendar", (req, res) => {
  // create file with name of user given in authorization header
  const auth = req.headers.authorization;
  if (!auth) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  // path to ics and json file
  const icsPath = `./calendars/${auth}.ics`;
  const jsonPath = `./calendars/${auth}.json`;

  // initialisation of ics file
  const icsInit = "BEGIN:VCALENDAR\nCALSCALE:GREGORIAN\nEND:VCALENDAR";
  // initialisation of json file (empty array of events)
  const jsonInit = '{"events": []}';

  createFile(icsPath, icsInit, res);
  createFile(jsonPath, jsonInit, res);

  res.json({ message: "Successfully created files." });
});

deleteEventIcs = (icsPath, startLine, endLine) => {
  fs.readFile(icsPath, "utf8", (err, data) => {
    if (err) {
      console.log("error position 1");
      return -1;
    }

    const lines = data.split("\n");

    // is startLine valid?
    if (startLine < 1 || startLine > lines.length) {
      console.log("error position 2");
      return -1;
    }
    /*
    // Remove the lines within the range
    lines.splice(startLine, endLine - startLine + 1);
    */

    // Replace the lines within the range with blank lines
    for (let i = startLine; i <= endLine; i++) {
      lines[i] = "";
    }

    // Create the modified content
    const modifiedContent = lines.join("\n");

    // Write the modified content back to the file
    fs.writeFile(icsPath, modifiedContent, "utf8", (err) => {
      if (err) {
        console.error("Error writing to the file:", err);
        return -1;
      }
      console.log(`Deleted lines from ${startLine} to ${endLine}`);
      return endLine - startLine;
    });
  });
};

// delete event from ICS file
app.delete("/deleteEvent", (req, res) => {
  const auth = req.headers.authorization;
  if (!auth) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  // path to ics and json file
  const icsPath = `./calendars/${auth}.ics`;
  const jsonPath = `./calendars/${auth}.json`;

  const eventIndex = req.body.eventIndex;

  // read json file to get start/end line from ics file, then delete event from ics file.
  fs.readFile(jsonPath, (err, data) => {
    if (err) {
      res.status(204).json({
        message: "Error while delete event.",
      });
      return;
    }

    // parse json file to get line numbers
    let json = JSON.parse(data);
    const event = json.events[eventIndex];

    if (!event) {
      res.status(204).json({
        message: "Error while delete event.",
      });
      return;
    }
    const startLine = event.lineNumber;
    const endLine = event.endLineNumber;

    const deleted = deleteEventIcs(icsPath, startLine, endLine);
    if (deleted == -1) {
      res.status(204).json({
        message: "Error while delete event.",
      });
      return;
    }

    // delete event from json file
    json.events.splice(eventIndex, 1);

    fs.writeFile(jsonPath, JSON.stringify(json), (err) => {
      if (err) {
        res.status(204).json({ message: "Error while delete event." });
        return;
      }
    });

    res.status(200).json({ message: "Successfully deleted event." });
  });
});

// check if calendar exists
app.get("/calendarExists", (req, res) => {
  console.log("calendarExists");
  const auth = req.headers.authorization;
  if (!auth) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const icsPath = `./calendars/${auth}.ics`;
  const jsonPath = `./calendars/${auth}.json`;

  fs.access(icsPath, fs.F_OK, (err) => {
    if (err) {
      res.json({ exists: false });
      return;
    }
    res.json({ exists: true });
  });
});

const httpsOptions = {
  key: fs.readFileSync(
    "/etc/letsencrypt/live/calendarapi.jmjumper.de/privkey.pem"
  ),
  cert: fs.readFileSync(
    "/etc/letsencrypt/live/calendarapi.jmjumper.de/fullchain.pem"
  ),
};

// const httpsServer = https.createServer(app); // httpsOptions, app);

// Start server
app.listen(port, () => {
  console.log(`Server läuft auf Port ${port}`);
});
