import express = require("express");
import bodyParser = require("body-parser");
import { v4 as uuidv4 } from "uuid";

import low = require("lowdb");
import FileSync = require("lowdb/adapters/FileSync");
import {
  UserResponse,
  PatientInfosRequest,
  TokenInfoResponse,
  AssessmentResponse,
  PiiRequest,
  Consent,
} from "../src/core/user/dto/UserAPIContracts";

type Schema = {
  users: User[];
  profiles: { userId: String; data: UserResponse }[];
  patients: { userId: String; patientId: String; data: PatientInfosRequest }[];
  tokens: { userId: String; data: TokenInfoResponse }[];
  assessments: { userId: String; data: AssessmentResponse }[];
  information: { userId: String; data: PiiRequest }[];
  consent: { userId: String; data: Consent }[];
};

type User = {
  id: String;
  username: String;
  password: String;
  token: String;
};

const adapter = new FileSync<Schema>("./db.json");
const db = low(adapter);

const app = express();
const port = 3000;

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.post("/auth/login", (req, res) => {
  const user = db
    .get("users")
    .find({
      username: req.body.username,
      password: req.body.password1,
    })
    .value();

  const profile = db.get("profiles").find({
    userId: user.id,
  });

  return res.status(200).send({
    key: user.token,
    user: profile,
  });
});

app.post("/auth/password/reset", (req, res) => {
  const user = db
    .get("users")
    .find({
      username: req.body.username,
    })
    .value();

  if (!user) {
    // return error
  }

  if (user) {
    // send reset email to user
  }

  return res.send();
});

app.post("/auth/signup", (req, res) => {
  if (req.body.password1 !== req.body.password2) {
    //return error
  }

  const userId = uuidv4();
  const token = "abc";

  db.get("users").push({
    id: userId,
    username: req.body.username,
    password: req.body.password1,
    token: uuidv4().toLowerCase(),
  });

  const profile = db.get("profiles").push({
    userId,
    data: {
      username: req.body.username,
      authorizations: [],
      patients: [uuidv4()],
      pii: uuidv4(),
    },
  });

  return res.status(201).send({
    key: token,
    user: profile,
  });
});

app.use((req, res, next): any => {
  if (!req.headers.authorization) {
    return res.status(403).json({ error: "No credentials sent!" });
  }
  next();
});

function getLoggedInUser(req: any): User {
  const token = req.headers.authorization.toLowerCase().replace("bearer ", "");
  const user = db.get("users").find({ token }).value();
  return user;
}

app.post("/tokens", (req, res) => {
  const user = getLoggedInUser(req);

  const newPushNotificationToken = {
    token: req.body.token,
    active: req.body.active,
    platform: req.body.android,
  };

  db.get("tokens").push({ userId: user.id, data: newPushNotificationToken });

  return res.send(newPushNotificationToken);
});

app.patch("/consent", (req, res) => {
  return res.send();
});

app.get("/patients/:patientId", (req, res) => {
  const user = getLoggedInUser(req);
  const patient = db
    .get("patients")
    .find({ userId: user.id, patientId: req.query.patientId })
    .value();
  return res.status(200).send(patient.data);
});

app.patch("/patients/:patientId", (req, res) => {
  const user = getLoggedInUser(req);
  const patient = db
    .get("patients")
    .find({ userId: user.id, patientId: req.query.patientId })
    .set("data", req.body)
    .value();
  return res.send(patient);
});

app.get("/profile", (req, res) => {
  const user = getLoggedInUser(req);
  const profile = db.get("profiles").find({ userId: user.id }).value();
  return res.status(200).send(profile.data);
});

app.patch("/information/:userId", (req, res) => {
  const user = getLoggedInUser(req);
  const information = db
    .get("information")
    .find({ userId: user.id })
    .set("data", req.body)
    .value();
  return res.send(information);
});

app.post("/assessments", (req, res) => {
  const user = getLoggedInUser(req);
  const assessments = db.get("assessments").find({ userId: user.id }).value();
  return res.send(assessments.data);
});

app.patch("/assessments/:assessmentId", (req, res) => {
  const user = getLoggedInUser(req);
  const assessment = db
    .get("assessments")
    .find({ userId: user.id, data: { id: req.query.assessmentId } })
    .value();
  return res.send(assessment);
});

app.get("/users/covid_count", (req, res) => {
  const covidCount = db.get("covidCount").value();
  return res.status(200).send(covidCount);
});

app.get("/area_stats", (req, res) => {
  const areaStats = db.get("areaStats").value();
  return res.status(200).send(db.get(areaStats));
});

app.listen(port, () => console.log(`Listening at http://localhost:${port}`));
