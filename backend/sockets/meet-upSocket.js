const { Server } = require("socket.io");
const logger = require('../logging/logger');
const User = require("../user.model");
const Match = require("../match.model");
const Chatroom = require("../chatroom.model");
const Message = require("../message.model");

module.exports =
  /**
   * @param {Server} io
   */
  function (io) {
    io.of("/meet-up").on("connection", async (socket) => {
  logger.info("meet-up connected")
      /*
      let chatId = socket.handshake.query.chatId;
      console.log("Received new client for chat: " + chatId);
      socket.join(chatId);
      */
*
      socket.on("join room", (room) => {
  logger.info('meet-up join room', { room });
        socket.join(room);
      });


      
      
      socket.on("add-marker", (room,marker,dic) => {
        // emit a "new-marker" event to all connected clients

  logger.info('meet-up add-marker', { room });
        const filter = { id: room };
        const update = {
          $set: { meetspot: { type: "Point", coordinates: [marker.lng, marker.lat] } },
        };
        Chatroom.updateOne(filter, update, function (err, result) {
          if (err) {
            console.log(err);
            return;
          }
      
          logger.info('meet-up location updated', { room, modified: result.modifiedCount });
        });
      
  logger.info('meet-up marker', { socket: socket.id });
        
        socket.broadcast.to(room).emit("newmarker", marker,room,dic);
      });
    });
  };