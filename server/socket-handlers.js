const messageDao = require("./messagesDao");
const stateTransitionDao = require("./statetransitiondao");
const errandDao = require("./errandsdao");
const tenSeconds = 1000 * 10;
const SYSTEM = "SYSTEM";
const NOTIFICATION = "NOTIFICATION";
const { uuid } = require("uuidv4");
let timersForOffer = {};

function getNotificationForRunner(offer, content) {
    return {
        id: uuid(), createdAt: new Date(), isRead: 0, sender: SYSTEM, receiver: offer.sender, relatedUser: offer.receiver,
        type: NOTIFICATION, content: "offer id: " + offer.id + " " + content
    };
};

function getNotificationForPoster(offer, content) {
    return {
        id: uuid(), createdAt: new Date(), isRead: 0, sender: SYSTEM, receiver: offer.receiver, relatedUser: offer.sender,
        type: NOTIFICATION, content: "offer id: " + offer.id + " " + content
    };
};

function createNotifications(io, offer, content) {
    const notificationToRunner = getNotificationForRunner(offer, content);
    const notificationToPoster = getNotificationForPoster(offer, content);
    messageDao.createNewMessage(notificationToRunner).then(data => {
        io.in(notificationToRunner.receiver).emit("message", notificationToRunner);
        io.in(notificationToRunner.receiver).emit("offer-state-changed");
    }).catch(err => console.log(err));

    messageDao.createNewMessage(notificationToPoster).then(data => {
        io.in(notificationToPoster.receiver).emit("message", notificationToPoster);
        io.in(notificationToPoster.receiver).emit("offer-state-changed");
    }).catch(err => console.log(err));
};

function setStateCheckTimeout(io, offer, lastTransitionTimestamp = undefined) {
    clearTimeout(timersForOffer[offer.id]);
    delete timersForOffer[offer.id];
    timersForOffer = {
        ...timersForOffer, [offer.id]: setTimeout(() => {
            stateTransitionDao.getCurrentState(offer.id).then(data => {
                //if data===[]  >> no transition at all >> still initial state
                if (!data[0]) createCanceledOfferStateTransition(io, offer);
                //if there has been some state transition since the offer was created
                else {
                    if (data[0].new_state === "accepted") createCanceledOfferStateTransition(io, offer);
                }
            }).catch(err => console.log(err));
        }, lastTransitionTimestamp ? lastTransitionTimestamp - new Date() + tenSeconds : offer.createdAt - new Date() + tenSeconds)
    };
};

function createCanceledOfferStateTransition(io, offer) {
    const transition = { object_id: offer.id, new_state: "canceled", timestamp: new Date() }
    stateTransitionDao.createNewTransition(transition).then(data => createNotifications(io, offer, "is canceled due to timeout")).catch(err => console.log(err));
};

function createNewStateTransition(io, object_id, new_state, isOffer = true) {
    const transition = { object_id, new_state, timestamp: new Date() };
    stateTransitionDao.createNewTransition(transition).then(data => {
        if(isOffer){
            messageDao.getMessageById(object_id).then(data => {
                const offer = data[0];
                if (new_state === "canceled") createNotifications(io, offer, "is canceled");
                else if (new_state === "accepted") {
                    createNotifications(io, offer, "is accepted");
                    setStateCheckTimeout(io, offer, new Date());
                    // where to update errand fee ?
                }
                else createNotifications(io, offer, "is confirmed");
            })
        }
    }).catch(err => console.log(err));
};

function messageHandler(io, socket, message) {
    message = { ...message, createdAt: new Date(), isRead: 0, id: uuid() };
    messageDao.createNewMessage(message).then(data => {
        io.in(message.receiver).emit("message", message);
        io.in(message.sender).emit("message", message);
        if (message.type === "OFFER") {
            createNotifications(io, message, "is sent");
            setStateCheckTimeout(io, message);
        }
    }).catch(err => socket.emit("message-error"));
};

function offerStateChangeHandler(io, socket, payload) {
    const object_id = payload.object_id;
    const new_state = payload.new_state;
    let currentState = "initial";
    stateTransitionDao.getCurrentState(object_id).then(data => {
        if (data[0]) currentState = data[0].new_state;
        switch (currentState) {
            case "canceled": {
                socket.emit("not-allowed-offer-state-transition");
                break;
            }
            case "initial": {
                if (new_state === "canceled" || new_state === "accepted") {
                    createNewStateTransition(io, object_id, new_state);
                }
                else socket.emit("not-allowed-offer-state-transition");
                break;
            }
            case "accepted": {
                if (new_state === "canceled" || new_state === "confirmed") {
                    createNewStateTransition(io, object_id, new_state);
                    if (new_state === "confirmed") {
                        messageDao.getMessageById(object_id).then(data => {
                            if (data.length > 0) {
                                createNewStateTransition(io, data[0].errand, "running", false);
                                errandDao.updateToRunningState(data[0].errand, data[0].sender, data[0].fee)
                                .then(data => console.log("Errand is updated to running state. Think about what to do for client at this point"))
                                .catch(err => console.log(err));
                            }
                        }).catch(err => console.log(err));
                    }
                }
                else socket.emit("not-allowed-offer-state-transition");
                break;
            }
            case "confirmed": {
                socket.emit("not-allowed-offer-state-transition");
                break;
            }
            default: {
                socket.emit("not-allowed-offer-state-transition");
                break;
            }
        }
    }).catch(err => console.log(err));
};

function initialCheckForTimeoutOffer(io) {
    messageDao.getMessagesByType("OFFER").then(data => {
        data.forEach(offer => {
            stateTransitionDao.getCurrentState(offer.id).then(data => {
                //if initial state
                if (data.length === 0) {
                    //if timeout
                    if (new Date() - offer.createdAt > tenSeconds) {
                        createCanceledOfferStateTransition(io, offer);
                    }
                    //not timeout yet
                    else {
                        setStateCheckTimeout(io, offer);
                    }
                }
                //not initial state (canceled, accepted, confirmed)
                else {
                    if (data[0].new_state === "accepted") {
                        //if timeout
                        if (new Date() - data[0].timestamp > tenSeconds) {
                            createCanceledOfferStateTransition(io, offer);
                        }
                        else {
                            setStateCheckTimeout(io, offer, data[0].timestamp);
                        }
                    }
                }
            });
        });
    }).catch(err => console.log(err));
};

exports.messageHandler = messageHandler;
exports.offerStateChangeHandler = offerStateChangeHandler;
exports.initialCheckForTimeoutOffer = initialCheckForTimeoutOffer;