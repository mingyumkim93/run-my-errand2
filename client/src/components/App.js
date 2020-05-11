import React, { useEffect, useState } from "react";
import {
  Router,
  Switch,
  Route,
  Redirect
} from "react-router-dom";

import history from "../history";
import API from "../utils/API";
import socket from "../utils/socket";

import MenuBar from "./MenuBar";
import Main from "../pages/Main";
import Loading from "../Loading";

import SignIn from "../pages/SignIn";
import SignUp from "../pages/SignUp";
import Search from "../pages/Search";
import Post from "../pages/Post";
import ErrandDetail from "../pages/ErrandDetail";
import Inbox from "../pages/Inbox";
import Message from "../pages/Message";

export default function App() {

  const [user, setUser] = useState(null);
  const [rawMessages, setRawMessages] = useState(null);
  const [sortedMessages, setSortedMessages] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [numberOfUnreadMessages, setNumberOfUnreadMessages] = useState(0);


  useEffect(() => {
    function checkAuth() {
      console.log("check auth in App")
      API.auth.check().then((res) => {
        if (res.data) {
          setUser(res.data);
        }
        setIsLoading(false);
      });
    };
    checkAuth();
  }, []);

  useEffect(() => {
    // if user loged in
    function fetchAllMesages() {
      // fetch messages that is sent to me or I sent to somebody 
      console.log("fetch messages in App")
      API.message.fetchAllMessages(user.id).then(res => setRawMessages(res.data)).catch(err => alert("therer was error on fetching messages", err));
    };
    if (user) {
      fetchAllMesages();
    };
  }, [user]);

  useEffect(() => {
    function sortMessages() {
      console.log("sort messages in App")
      let sortedMessages = {};
      rawMessages.forEach(message => {
        // if the message is sent to me
        if (message.sender !== user.id) {
          // first message with this user
          if (!sortedMessages[message.sender]) {
            sortedMessages = { ...sortedMessages, [message.sender]: [message] };
          }
          else {
            sortedMessages[message.sender].push(message);
          }
        }
        // if the message is sent by me
        else {
          if (!sortedMessages[message.receiver]) {
            sortedMessages = { ...sortedMessages, [message.receiver]: [message] };
          }
          else {
            sortedMessages[message.receiver].push(message);
          }
        }
      });
      setSortedMessages(sortedMessages);
    };

    function countUnreadMessages() {
      console.log("count unread messages in App")
      const messagesSentToMe = rawMessages.filter(message => message.receiver === user.id);
      const unReadMessages = messagesSentToMe.filter(message => message.isRead === 0);
      setNumberOfUnreadMessages(unReadMessages.length);
    };

    function addNewMessage(message) {
      console.log("add new message in App")
      setRawMessages((rawMessages) => [...rawMessages, message[0]]);
    };

    if (rawMessages) {
      // count the number of messages that sent to me and unread and give the number as prop to menubar component
      sortMessages();
      countUnreadMessages();
      socket.emit("join", user.id);
      socket.on("message", addNewMessage);
    };
    //should user also leave the room?
    return () => socket.off("message", addNewMessage);
  }, [rawMessages, user]);

  if (isLoading) return <div><Loading type={"spokes"} color={"#123123"} /> <h1 style={{ textAlign: "center" }}>Loading...</h1></div> //todo: change to better one
  return (
    <div className="App">
      <Router history={history}>
        <MenuBar user={user} setUser={setUser} numberOfUnreadMessages={numberOfUnreadMessages} />
        <Switch>
          <Route exact path="/" component={Main} />
          <Route path="/signin" component={() =>
            user ?
              <Redirect to="/" />
              : <SignIn setUser={setUser} />
          } />
          <Route path="/signup" component={SignUp} />
          <Route path="/search" component={Search} />
          <Route path="/post" component={() => <Post user={user} />} />
          <Route path="/errand/:id" component={ErrandDetail} />
          <Route path="/inbox" component={() => <Inbox user={user} sortedMessages={sortedMessages} />} />
          <Route path="/message/:id" component={() => <Message sortedMessages={sortedMessages} rawMessages={rawMessages} setRawMessages={setRawMessages} user={user} />} />
        </Switch>
      </Router>
    </div>
  );
};

