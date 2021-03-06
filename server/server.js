const express = require("express");
const bodyParser = require("body-parser");

const auth = require("./auth");
const userApi = require("./userapi"); 
const errandsApi = require("./errandsapi");
const messagesApi = require("./messagesapi");
const stateTransitionApi = require("./statetransitionapi");
const reviewsApi = require("./reviewsapi");
const socket = require("./socket");

const app = express();
const port = process.env.PORT || 5000;
const server = app.listen(port, () => console.log(`server is running on port${port}`));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

auth(app);
userApi(app);
errandsApi(app);
messagesApi(app);
stateTransitionApi(app);
reviewsApi(app);
socket(server);