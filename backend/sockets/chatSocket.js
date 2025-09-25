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
    io.of("/chat").on("connection", async (socket) => {
      let chatId = socket.handshake.query.chatId;
  logger.info(`chat connection: ${chatId}`);
      socket.join(chatId);

      socket.on("message", async (msg) => {
  logger.info('message received', { chatId: msg.chatroom, from: msg.fromUser });
        const message = new Message({
          chatId: msg.chatroom,
          fromUser: msg.fromUser,
          body: msg.body,
          sent: msg.sent,
        });
        try {
          await message.save();
          logger.info('message saved', { chatId: message.chatId, from: message.fromUser });
        } catch (e) {
          console.log(e.message);
          socket.emit("error", { message: e.message });
          return;
        }
        
        // Send message to all users in the chat room
        socket.broadcast.to(chatId).emit("response", msg);
        
        // Get all users in this chatroom for notifications
        try {
          const chatroom = await Chatroom.findOne({ id: msg.chatroom });
          if (chatroom) {
            // Send notifications to all users in the chatroom except the sender
            const otherUsers = chatroom.users.filter(user => user !== msg.fromUser);
            
            // Send notification to each user in the chatroom
            otherUsers.forEach(username => {
              // Send to all socket connections for this user (they might be in multiple tabs/devices)
              io.of("/chat").emit("notification", {
                type: "message",
                from: msg.fromUser,
                chatId: msg.chatroom,
                chatTitle: chatroom.title,
                body: msg.body.length > 50 ? msg.body.substring(0, 50) + "..." : msg.body,
                timestamp: msg.sent,
                targetUser: username
              });
            });

            // Also emit to a general notification channel
            socket.broadcast.emit("group-notification", {
              type: "message",
              from: msg.fromUser,
              chatId: msg.chatroom,
              chatTitle: chatroom.title,
              body: msg.body.length > 50 ? msg.body.substring(0, 50) + "..." : msg.body,
              timestamp: msg.sent,
              participants: otherUsers
            });
          }
        } catch (error) {
          logger.error('notification error', { error: error.message });
        }
      });

      socket.on("leave", async ({ chatroom, user }) => {
        try {
          const chat = await Chatroom.findOne({ id: chatroom });
          if (chat) {
            chat.users = chat.users.filter((u) => u !== user);
            await chat.save();
            
            // Notify all users in the chatroom about user leaving
            socket.broadcast.to(chatroom).emit("update-users");
            socket.broadcast.to(chatroom).emit("user-left", {
              user: user,
              message: `${user} left the chat`
            });
          }
        } catch (e) {
          console.log(e.message);
          socket.emit("error", { message: e.message });
        }
      });
      
      socket.on("add-users", async ({ chatroom, users }) => {
        try {
          const chat = await Chatroom.findOne({ id: chatroom });
          if (chat) {
            // Add new users, avoiding duplicates
            const newUsers = users.filter(user => !chat.users.includes(user));
            chat.users = [...chat.users, ...newUsers];
            await chat.save();
            
            // Notify all users about new members
            socket.broadcast.to(chatroom).emit("update-users");
            socket.broadcast.to(chatroom).emit("users-added", {
              addedUsers: newUsers,
              message: `${newUsers.join(', ')} joined the chat`
            });

            // Send notifications to newly added users
            newUsers.forEach(username => {
              io.of("/chat").emit("notification", {
                type: "added-to-chat",
                chatId: chatroom,
                chatTitle: chat.title,
                body: `You were added to ${chat.title}`,
                timestamp: new Date().toISOString(),
                targetUser: username
              });
            });
          }
        } catch (e) {
          console.log(e.message);
          socket.emit("error", { message: e.message });
        }
      });

      // Handle user joining a chat room
      socket.on("join-chat", ({ chatId, username }) => {
        socket.join(chatId);
  logger.info('join-chat', { chatId, username });
      });

      // Handle user leaving a chat room
      socket.on("leave-chat", ({ chatId, username }) => {
        socket.leave(chatId);
  logger.info('leave-chat', { chatId, username });
      });
    });
  };
