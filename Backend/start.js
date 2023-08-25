const express = require("express");
const path = require("path");
const bodyParser = require("body-parser");
const fs = require("fs");
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

// POST-Request for adding new event to calendar
app.post("/addEvent", (req, res) => {
    const auth = req.headers.authorization;
    if (!auth) {
        res.status(401).json({ error: "Unauthorized" });
        return;
    }
    // hier sollte die Authentifizierung stattfinden.
    // Idee: lokale Database mit Usern und Dateipfad zu ihrem Kalender.
    const changes = req.body;
    // const icsPath = `./calendars/${changes.userid}.ics`;
    const icsPath = `./calendars/${auth}.ics`;

    fs.readFile(icsPath, "utf8", (err, data) => {
        if (err) {
            res.status(404).json({
                message: "Calendar not found",
            });
            return;
        }

        // split text into lines
        const lines = data.split("\n");
        const insertionIndex = Math.max(lines.length - 1, 0); // Vorletzte Zeile

        // insert line
        lines.splice(insertionIndex, 0, changes.event);

        // join lines to string
        const updatedText = lines.join("\n");

        fs.writeFile(icsPath, updatedText, "utf8", (err) => {
            if (err) {
                res.status(500).json({
                    message:
                        "Error while editing calendar. This shouldn't happen.",
                });
                return;
            }
            // Erfolgreich
            res.json({ message: "Successfully added event.." });
        });
    });
});

app.post("/createCalendar", (req, res) => {
    // create file with name of user
    const auth = req.headers.authorization;
    if (!auth) {
        res.status(401).json({ error: "Unauthorized" });
        return;
    }
    const icsPath = `./calendars/${auth}.ics`;
    const initialisation = `BEGIN:VCALENDAR
CALSCALE:GREGORIAN
END:VCALENDAR`;
    
    fs.writeFile(icsPath, initialisation, "utf8", (err) => {
        if (err) {
            res.status(500).json({
                message: "Error while creating calendar.",
            });
            return;
        }
        res.json({ message: "Successfully created calendar." });
    });
});

// Start server
app.listen(port, () => {
    console.log(`Server läuft auf Port ${port}`);
});
