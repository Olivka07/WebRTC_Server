const PATH = require('node:path');
const express = require('express');
const process = require('node:process');
const actions = require('./actions.js');
const cors = require('cors');
const { validate, version } = require('uuid');

const app = express();
const server = require('node:http').Server(app);
const io = require('socket.io')(server, {
    cors: {
        origin: '*'
    }
});

// получение rooms (комнат) - являющихся идентификатором подсоединённых клиентов
function getClientRooms() {
    const { rooms } = io.sockets.adapter;
    // проверка, что подключение будет именно к комнатам, а не к пользователю
    return Array.from(rooms.keys()).filter(roomID => validate(roomID) && version(roomID) === 4);
}

// Поделиться информацией со всеми пользователями
// идентификаторами комнат
function shareRoomsInfo() {
    io.emit(actions.SHARE_ROOMS, {
        rooms: getClientRooms()
    });
}

const PORT = process.env.PORT || 5000;

io.on('connection', socket => {
    shareRoomsInfo();

    // прослушивание события присоединения
    // в качестве параметра принимаем config, который содержит id комнаты,
    // к которой происходит присоединение.
    socket.on(actions.JOIN, config => {
        // roomID - id комнаты
        const { room: roomID } = config;
        // joinedRooms - id комнат, с которыми есть соединение
        const { rooms: joinedRooms } = socket;

        // если уже включает присоединённую комнату, то ничего не делаем
        if (Array.from(joinedRooms).includes(roomID)) {
            return console.warn(`Already joined to ${roomID}`);
        }

        // ИНАЧЕ
        // получаем всех пользователей комнаты по id комнаты
        const clients = Array.from(io.sockets.adapter.rooms.get(roomID) ?? []);

        clients.forEach(clientID => {
            // отправляем клиенту комнаты id нового пользователя
            // без создания offer'а
            io.to(clientID).emit(actions.ADD_PEER, {
                peerID: socket.id,
                createOffer: false
            });

            // новому пользователю отправляем id каждого пользователя комнаты
            // с необходимостью создания offer'а
            socket.emit(actions.ADD_PEER, {
                peerID: clientID,
                createOffer: true
            });
        });

        socket.join(roomID);

        shareRoomsInfo();
    });

    // выход пользователя из комнат
    function leaveRooms() {
        // получение id комнат пользователя
        const { rooms } = socket;

        Array.from(rooms).forEach(roomID => {
            // получаем всех пользователей определенной комнаты
            const clients = Array.from(io.sockets.adapter.rooms.get(roomID) || []);

            clients.forEach(clientID => {
                // оповещаем пользователя об удалении выходящего пользователя
                io.to(clientID).emit(actions.REMOVE_PEER, {
                    peerID: socket.id
                });

                // оповещаем выходящего пользователя
                // об удалении каждого пользователя комнаты
                socket.emit(actions.REMOVE_PEER, {
                    peerID: clientID
                });
            });

            // покидаем комнату
            socket.leave(roomID);
        });

        shareRoomsInfo();
    }

    socket.on(actions.RELAY_SDP, ({ peerID, sessionDescription }) => {
        io.to(peerID).emit(actions.SESSION_DESCRIPTION, { peerID: socket.id, sessionDescription });
    });

    socket.on(actions.RELAY_ICE, ({ peerID, iceCandidate }) => {
        io.to(peerID).emit(actions.ICE_CANDIDATE, { peerID: socket.id, iceCandidate });
    });

    socket.on(actions.LEAVE, leaveRooms);
    socket.on('disconnecting', leaveRooms);
});

server.listen(PORT, () => console.log(`Server has been started on PORT ${PORT}`));
