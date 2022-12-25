const http = require('http')
const express = require('express')
const socketio = require('socket.io')
const cors = require('cors')
const messageRoute = require('./messageRoute')
const mongoose = require('mongoose')

const { addUser, removeUser, getUser, getUsersInRoom } = require('./users')
const {
    oneByOne,
    endBlinkRed,
    blinkRed,
    blinkGreen,
    tryRed,
    tryGreen,
    endBlinkGreen,
    blinkYellow,
    tryYellow,
    endBlinkYellow,
    servo,
    flowingLeds,
    sensor,
} = require('./raspberryfun')

const router = require('./router')

const PORT = process.env.PORT || 5000
const app = express()
const server = http.createServer(app)
const io = socketio(server)

app.use(cors())
app.use(router)
app.use('/messages', messageRoute)
let createdTime = Date.now()

io.on('connection', (socket) => {
    socket.on('join', ({ name, room }, callback) => {
        const { error, user } = addUser({ id: socket.id, name, room })

        if (error) return callback(error)

        socket.join(user.room)

        // socket.emit('message', { user: 'admin', text: `${user.name}, welcome to room ${user.room}.`, createdTime});
        // socket.broadcast.to(user.room).emit('message', { user: 'admin', text: `${user.name} has joined!` });

        io.to(user.room).emit('roomData', {
            room: user.room,
            users: getUsersInRoom(user.room),
        })

        callback()
    })

    socket.on('sendMessage', async (message, callback) => {
        const user = getUser(socket.id)

        switch(message) {
          case 'blink red': {
           await blinkRed();
            break;
          }
          case 'all': {
            await oneByOne();
            break;
          }
          case 'sensor': {
            await sensor();
            break;
          }
          case 'run servo': {
            await servo();
            break;
          }
          case 'flowing leds': {
await flowingLeds()
break;
          }
          case 'stop yellow': {
            await  endBlinkYellow();
            break;
          }
          case 'yellow': {
            await tryYellow();
            break;
          }
          case 'blink yellow': {
            await blinkYellow();
            break;
          }
          case 'stop green': {
            await endBlinkGreen();
            break;
          }
          case 'green': {
            await tryGreen();
            break;
          }
          case 'blink green': {
            await blinkGreen();
            break;
          }
          case 'red': {
            await tryRed();
            break;
          }
          case 'stop red': {
            await endBlinkRed();
            break;
          }
        }

        io.to(user.room).emit('message', {
            user: user.name,
            text: message,
            createdTime,
        })

        callback()
    })

    socket.on('disconnect', () => {
        const user = removeUser(socket.id)

        if (user) {
            io.to(user.room).emit('message', {
                user: 'Admin',
                text: `${user.name} has left.`,
            })
            io.to(user.room).emit('roomData', {
                room: user.room,
                users: getUsersInRoom(user.room),
            })
        }
    })
})

server.listen(PORT, () => console.log(`Server has started on port ${PORT}`))
