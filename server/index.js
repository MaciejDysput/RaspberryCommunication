const http = require('http')
const express = require('express')
const socketio = require('socket.io')
const cors = require('cors')
const { Archiver } = require('./archiver')
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
const archive = new Archiver()
archive.start()
app.use(cors())
app.use(router)
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

        const archiveMessages = archive.fetch(user.room)
        for (const message of archiveMessages) {
            io.to(user.room).emit('message', message)
        }

        callback()
    })

    socket.on('sendMessage', async (message, callback) => {
        const user = getUser(socket.id)

        switch (message) {
            case 'blink red': {
                blinkRed()
                break
            }
            case 'all': {
                oneByOne()
                break
            }
            case 'sensor': {
                sensor()
                break
            }
            case 'run servo': {
                servo()
                break
            }
            case 'flowing leds': {
                flowingLeds()
                break
            }
            case 'stop yellow': {
                endBlinkYellow()
                break
            }
            case 'yellow': {
                tryYellow()
                break
            }
            case 'blink yellow': {
                blinkYellow()
                break
            }
            case 'stop green': {
                endBlinkGreen()
                break
            }
            case 'green': {
                tryGreen()
                break
            }
            case 'blink green': {
                blinkGreen()
                break
            }
            case 'red': {
                tryRed()
                break
            }
            case 'stop red': {
                endBlinkRed()
                break
            }
        }
        await archive.archive(message, user.name, createdTime, user.room)
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
